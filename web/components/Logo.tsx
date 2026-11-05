/** Parallel Markets mark: two rising strokes. The second takes the currency accent. */
export function LogoMark({ size = 24, accent = "var(--accent)", ink = "currentColor" }: { size?: number; accent?: string; ink?: string }) {
  return (
    <svg width={size} height={size} viewBox="7 5 30 38" aria-hidden="true">
      <path d="M11 39 20 13" stroke={ink} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M24 35 33 9" stroke={accent} strokeWidth="6.5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <LogoMark size={size + 4} />
      <span style={{ fontWeight: 700, fontSize: size, letterSpacing: "-0.9px" }}>parallel</span>
    </span>
  );
}

/** The "//" marker used on section titles and secondary actions. */
export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      //
    </span>
  );
}
