export default function Logo({ size = 24, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="6 5 28 28" fill="none">
      <defs>
        <linearGradient id="logo-grad" x1="20" y1="33" x2="20" y2="7" gradientUnits="userSpaceOnUse">
          <stop stopColor="#12d7b3" />
          <stop offset="0.5" stopColor="#4f6bff" />
          <stop offset="1" stopColor="#7a8bff" />
        </linearGradient>
      </defs>
      <path
        d="M20 17.3L20 6.8M21.35 17.66L24.8 11.69M22.34 18.65L30.57 13.9M22.7 20L30.2 20M22.34 21.35L31.09 26.4M21.35 22.34L24.7 28.14M20 22.7L20 32M18.65 22.34L15.3 28.14M17.66 21.35L8.91 26.4M17.3 20L9.8 20M17.66 18.65L9.43 13.9M18.65 17.66L15.2 11.69"
        stroke="url(#logo-grad)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
