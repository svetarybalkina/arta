export function AkLoader() {
  return (
    <div className="rounded-xl border border-[#5f6d56] bg-[#2f3d2f] p-4">
      <p className="mb-3 text-sm text-[#e7dab8]">Генерация в процессе...</p>
      <div className="ak-mag">
        {Array.from({ length: 12 }).map((_, idx) => (
          <span
            key={idx}
            className="bullet"
            style={{ animationDelay: `${idx * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
