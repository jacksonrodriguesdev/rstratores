// Bandeiras em SVG: os emojis 🇧🇷/🇺🇾 aparecem como "BR"/"UY" no Windows.

export function BandeiraBrasil({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={className} aria-label="Brasil" role="img">
      <rect width="28" height="20" rx="2" fill="#009C3B" />
      <path d="M14 3 25 10 14 17 3 10z" fill="#FFDF00" />
      <circle cx="14" cy="10" r="4.2" fill="#002776" />
      <path d="M10 9.2c2.6-.6 5.5-.3 7.9.9" stroke="#fff" strokeWidth="0.7" fill="none" />
    </svg>
  );
}

export function BandeiraUruguay({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 27 18" className={className} aria-label="Uruguay" role="img">
      <rect width="27" height="18" rx="2" fill="#fff" />
      {[2, 6, 10, 14].map((y) => (
        <rect key={y} y={y} width="27" height="2" fill="#0038A8" />
      ))}
      <rect width="10" height="10" fill="#fff" />
      <circle cx="5" cy="5" r="3" fill="#FCD116" stroke="#7B3F00" strokeWidth="0.3" />
    </svg>
  );
}
