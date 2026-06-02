export const env = {
  polzaApiKey: process.env.POLZA_API_KEY ?? "",
  polzaBaseUrl: process.env.POLZA_BASE_URL ?? "https://api.polza.ai/v1",
  polzaImageModel:
    process.env.POLZA_IMAGE_MODEL ?? "google/gemini-3-pro-image-preview",
  polzaVideoModel: process.env.POLZA_VIDEO_MODEL ?? "",
  promoCodes: (process.env.PROMO_CODES ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
  promoFreeGenerations: Number(process.env.PROMO_FREE_GENERATIONS ?? "3"),
  promoPricingActive: (process.env.PROMO_PRICING_ACTIVE ?? "true").toLowerCase() !== "false",
  adminEmail: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  dbClient: process.env.DB_CLIENT ?? "sqlite",
  databaseUrl: process.env.DATABASE_URL ?? "./data/app.db",
  sessionSecret: process.env.SESSION_SECRET ?? "change_me_local_secret",
};

