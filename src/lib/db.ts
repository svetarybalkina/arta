import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import initSqlJs from "sql.js";
import { env } from "@/lib/env";

type SqlDatabase = {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string) => Array<{ columns: string[]; values: unknown[][] }>;
  export: () => Uint8Array;
};

type User = {
  id: string;
  email: string;
  password_hash: string;
  is_admin: number;
  accepted_offer_at?: string | null;
  accepted_privacy_at?: string | null;
};
type Profile = { user_id: string; generations_left: number; promo_applied: number };
type Generation = { id: string; user_id: string; style_id: string; result_url: string };
type HallEntry = { image_url: string; created_at: string };
type HallManualItem = { id: string; image_url: string; position: number };

export type DbAdapter = {
  findUserByEmail(email: string): Promise<User | null>;
  createUser(email: string, passwordHash: string, acceptedOfferAt?: string | null, acceptedPrivacyAt?: string | null): Promise<User>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<void>;
  createSession(userId: string, expiresAt: string): Promise<string>;
  getSessionUser(token: string): Promise<{ id: string; email: string; is_admin: number } | null>;
  deleteSession(token: string): Promise<void>;
  ensureProfile(userId: string): Promise<Profile>;
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, patch: Partial<Profile>): Promise<void>;
  insertGeneration(userId: string, styleId: string, resultUrl: string): Promise<string>;
  findGenerationById(id: string): Promise<Generation | null>;
  setGenerationHallConsent(id: string, consent: boolean): Promise<void>;
  insertHall(userId: string, generationId: string, imageUrl: string, expiresAt: string): Promise<void>;
  listHallRecent(limit: number): Promise<HallEntry[]>;
  listHallManual(): Promise<HallManualItem[]>;
  replaceHallManual(items: Array<{ image_url: string; position: number }>): Promise<void>;
};

const dbPath = env.databaseUrl.startsWith("./") ? path.join(process.cwd(), env.databaseUrl.slice(2)) : env.databaseUrl;

const dbReady = (async () => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });
  const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;
  const database = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  database.run(`
    create table if not exists users (
      id text primary key,
      email text not null unique,
      password_hash text not null,
      created_at text not null
    );
    create table if not exists sessions (
      token text primary key,
      user_id text not null,
      expires_at text not null
    );
    create table if not exists profiles (
      user_id text primary key,
      generations_left integer not null default 0,
      promo_applied integer not null default 0
    );
    create table if not exists generations (
      id text primary key,
      user_id text not null,
      style_id text not null,
      result_url text not null,
      hall_consent integer not null default 0,
      created_at text not null
    );
    create table if not exists hall_of_fame (
      id text primary key,
      generation_id text not null,
      user_id text not null,
      image_url text not null,
      expires_at text not null,
      approved integer not null default 0,
      created_at text not null
    );
    create table if not exists hall_manual (
      id text primary key,
      image_url text not null,
      position integer not null,
      created_at text not null
    );
  `);

  const safeAlter = (sql: string) => {
    try {
      database.run(sql);
    } catch {
      // no-op when column already exists
    }
  };
  safeAlter("alter table users add column is_admin integer not null default 0");
  safeAlter("alter table users add column accepted_offer_at text");
  safeAlter("alter table users add column accepted_privacy_at text");
  safeAlter("alter table hall_of_fame add column approved integer not null default 0");

  fs.writeFileSync(dbPath, Buffer.from(database.export()));
  return database as SqlDatabase;
})();

const persist = (database: SqlDatabase) => {
  fs.writeFileSync(dbPath, Buffer.from(database.export()));
};

const one = <T>(database: SqlDatabase, sql: string): T | null => {
  const rows = database.exec(sql);
  if (!rows.length || !rows[0].values.length) return null;
  const [first] = rows[0].values;
  const obj = Object.fromEntries(rows[0].columns.map((c, i) => [c, first[i]]));
  return obj as T;
};

function createSqliteAdapter(): DbAdapter {
  return {
    async findUserByEmail(email) {
      const database = await dbReady;
      const safe = email.replaceAll("'", "''").toLowerCase();
      return one<User>(database, `select id, email, password_hash, is_admin, accepted_offer_at, accepted_privacy_at from users where lower(email) = '${safe}'`);
    },
    async createUser(email, passwordHash, acceptedOfferAt = null, acceptedPrivacyAt = null) {
      const database = await dbReady;
      const user = { id: randomUUID(), email: email.toLowerCase(), password_hash: passwordHash, is_admin: 0, accepted_offer_at: acceptedOfferAt, accepted_privacy_at: acceptedPrivacyAt };
      database.run(
        "insert into users (id, email, password_hash, is_admin, accepted_offer_at, accepted_privacy_at, created_at) values (?, ?, ?, ?, ?, ?, ?)",
        [user.id, user.email, user.password_hash, 0, acceptedOfferAt, acceptedPrivacyAt, new Date().toISOString()],
      );
      persist(database);
      return user;
    },
    async setUserAdmin(userId, isAdmin) {
      const database = await dbReady;
      database.run("update users set is_admin = ? where id = ?", [isAdmin ? 1 : 0, userId]);
      persist(database);
    },
    async createSession(userId, expiresAt) {
      const database = await dbReady;
      const token = randomUUID();
      database.run("insert into sessions (token, user_id, expires_at) values (?, ?, ?)", [token, userId, expiresAt]);
      persist(database);
      return token;
    },
    async getSessionUser(token) {
      const database = await dbReady;
      const safe = token.replaceAll("'", "''");
      const row = one<{ id: string; email: string; is_admin: number; expires_at: string }>(
        database,
        `select u.id as id, u.email as email, u.is_admin as is_admin, s.expires_at as expires_at from sessions s join users u on u.id = s.user_id where s.token='${safe}'`,
      );
      if (!row) return null;
      if (new Date(row.expires_at).getTime() < Date.now()) {
        await this.deleteSession(token);
        return null;
      }
      return { id: row.id, email: row.email, is_admin: Number(row.is_admin ?? 0) };
    },
    async deleteSession(token) {
      const database = await dbReady;
      database.run("delete from sessions where token = ?", [token]);
      persist(database);
    },
    async ensureProfile(userId) {
      const database = await dbReady;
      const safe = userId.replaceAll("'", "''");
      const existing = one<Profile>(database, `select user_id, generations_left, promo_applied from profiles where user_id = '${safe}'`);
      if (existing) return existing;
      database.run("insert into profiles (user_id, generations_left, promo_applied) values (?, 0, 0)", [userId]);
      persist(database);
      return { user_id: userId, generations_left: 0, promo_applied: 0 };
    },
    async getProfile(userId) {
      const database = await dbReady;
      const safe = userId.replaceAll("'", "''");
      return one<Profile>(database, `select user_id, generations_left, promo_applied from profiles where user_id = '${safe}'`);
    },
    async updateProfile(userId, patch) {
      const database = await dbReady;
      const profile = await this.ensureProfile(userId);
      database.run("update profiles set generations_left = ?, promo_applied = ? where user_id = ?", [patch.generations_left ?? profile.generations_left, patch.promo_applied ?? profile.promo_applied, userId]);
      persist(database);
    },
    async insertGeneration(userId, styleId, resultUrl) {
      const database = await dbReady;
      const id = randomUUID();
      database.run("insert into generations (id, user_id, style_id, result_url, created_at) values (?, ?, ?, ?, ?)", [id, userId, styleId, resultUrl, new Date().toISOString()]);
      persist(database);
      return id;
    },
    async findGenerationById(id) {
      const database = await dbReady;
      const safe = id.replaceAll("'", "''");
      return one<Generation>(database, `select id, user_id, style_id, result_url from generations where id = '${safe}'`);
    },
    async setGenerationHallConsent(id, consent) {
      const database = await dbReady;
      database.run("update generations set hall_consent = ? where id = ?", [consent ? 1 : 0, id]);
      persist(database);
    },
    async insertHall(userId, generationId, imageUrl, expiresAt) {
      const database = await dbReady;
      database.run(
        "insert into hall_of_fame (id, generation_id, user_id, image_url, expires_at, approved, created_at) values (?, ?, ?, ?, ?, 0, ?)",
        [randomUUID(), generationId, userId, imageUrl, expiresAt, new Date().toISOString()],
      );
      persist(database);
    },
    async listHallRecent(limit) {
      const database = await dbReady;
      const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 7;
      const now = new Date().toISOString().replaceAll("'", "''");
      const rows = database.exec(`select image_url, created_at from hall_of_fame where approved = 1 and expires_at > '${now}' order by created_at desc limit ${safeLimit}`);
      if (!rows.length || !rows[0].values.length) return [];
      return rows[0].values.map((row) => ({ image_url: String(row[0]), created_at: String(row[1]) })).reverse();
    },
    async listHallManual() {
      const database = await dbReady;
      const rows = database.exec("select id, image_url, position from hall_manual order by position asc");
      if (!rows.length || !rows[0].values.length) return [];
      return rows[0].values.map((row) => ({ id: String(row[0]), image_url: String(row[1]), position: Number(row[2]) }));
    },
    async replaceHallManual(items) {
      const database = await dbReady;
      database.run("delete from hall_manual");
      for (const item of items) {
        database.run("insert into hall_manual (id, image_url, position, created_at) values (?, ?, ?, ?)", [randomUUID(), item.image_url, item.position, new Date().toISOString()]);
      }
      persist(database);
    },
  };
}

function createPostgresAdapter(): DbAdapter {
  throw new Error("PostgreSQL adapter is not enabled yet. Set DB_CLIENT=sqlite for now.");
}

export const db: DbAdapter = env.dbClient === "postgres" ? createPostgresAdapter() : createSqliteAdapter();
