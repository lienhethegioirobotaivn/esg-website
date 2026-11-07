interface IconProps {
  className?: string;
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <circle cx="16" cy="16" r="16" fill="#1877f2" />
      <path
        d="M17.8 26v-8.6h2.9l.5-3.4h-3.4v-2.1c0-1 .4-1.8 1.9-1.8h1.6V7.1c-.3 0-1.3-.1-2.4-.1-2.5 0-4.2 1.5-4.2 4.3V14h-2.8v3.4h2.8V26h3.1z"
        fill="#fff"
      />
    </svg>
  );
}

export function ZaloIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="8" fill="#0068ff" />
      <text
        x="16"
        y="20.5"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        Zalo
      </text>
    </svg>
  );
}

export function LinkedInIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="6" fill="#0a66c2" />
      <path
        d="M9 13h3v10H9V13zm1.5-4.6a1.8 1.8 0 110 3.6 1.8 1.8 0 010-3.6zM14 13h2.9v1.4c.4-.8 1.4-1.6 3-1.6 3.1 0 3.6 2 3.6 4.6V23h-3v-5c0-1.2 0-2.7-1.7-2.7S17 16.6 17 17.900V23h-3V13z"
        fill="#fff"
      />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="6" fill="#000" />
      <path
        d="M18.2 14.2L24.4 7h-1.5l-5.4 6.2L13.200 7H8l6.500 9.500L8 24h1.500l5.700-6.600L19.800 24H25l-6.800-9.800zm-2 2.300l-.7-.9-5.300-7.500h2.300l4.300 6.100.7.900 5.600 8h-2.300l-4.600-6.600z"
        fill="#fff"
      />
    </svg>
  );
}
