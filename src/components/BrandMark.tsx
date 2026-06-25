/**
 * PlayGameHub logo mark — two fanned playing cards (spade + heart) on a
 * gold badge, so the brand clearly reads as a card-games platform.
 */
export function BrandMark({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const suitFont =
    "'Segoe UI Symbol','Apple Color Emoji','Noto Sans Symbols2',serif";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="PlayGameHub"
    >
      <defs>
        <linearGradient id="bmGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2ddae" />
          <stop offset="0.55" stopColor="#d4a574" />
          <stop offset="1" stopColor="#8d6438" />
        </linearGradient>
      </defs>

      {/* gold badge */}
      <rect width="48" height="48" rx="13" fill="url(#bmGold)" />
      <rect
        x="0.75"
        y="0.75"
        width="46.5"
        height="46.5"
        rx="12.25"
        stroke="#000"
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />

      {/* back card (spade), tilted left */}
      <g transform="rotate(-14 20 25)">
        <rect
          x="11"
          y="13"
          width="17"
          height="23"
          rx="3"
          fill="#FBF7EE"
          stroke="#0b0f14"
          strokeOpacity="0.18"
        />
        <text
          x="19.5"
          y="29"
          fontFamily={suitFont}
          fontSize="13"
          textAnchor="middle"
          fill="#13181f"
        >
          ♠
        </text>
      </g>

      {/* front card (heart), tilted right */}
      <g transform="rotate(14 28 25)">
        <rect
          x="20"
          y="13"
          width="17"
          height="23"
          rx="3"
          fill="#FFFFFF"
          stroke="#0b0f14"
          strokeOpacity="0.18"
        />
        <text
          x="28.5"
          y="29"
          fontFamily={suitFont}
          fontSize="13"
          textAnchor="middle"
          fill="#e0334a"
        >
          ♥
        </text>
      </g>
    </svg>
  );
}
