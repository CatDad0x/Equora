import { safetyOf } from "@/lib/names";

/** Three-step safety meter used on Borrow, Manage loan and Portfolio. */
export function SafetyMeter({ hf, size = 6 }: { hf: number; size?: number }) {
  const s = safetyOf(hf);
  return (
    <span aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ height: size, borderRadius: 3, background: i <= s.level ? s.color : "var(--line-2)" }} />
      ))}
    </span>
  );
}

export function SafetyLabel({ hf }: { hf: number }) {
  const s = safetyOf(hf);
  return <strong style={{ color: s.color }}>{s.label}</strong>;
}
