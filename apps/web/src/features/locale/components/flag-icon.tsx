import type { Locale } from "../constants";

interface FlagIconProps {
  locale: Locale;
}

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function VietnamFlag() {
  return (
    <svg viewBox="0 0 30 20" aria-hidden className="size-full">
      <rect width="30" height="20" fill="#DA251D" />
      <path
        d={STAR_PATH}
        fill="#FFFF00"
        transform="translate(15 10.2) scale(0.62) translate(-12 -12)"
      />
    </svg>
  );
}

function UnitedKingdomFlag() {
  return (
    <svg viewBox="0 0 60 40" aria-hidden className="size-full">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" strokeWidth="3" />
      <path d="M30 0V40M0 20H60" stroke="#FFFFFF" strokeWidth="13" />
      <path d="M30 0V40M0 20H60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  );
}

function ChinaFlag() {
  return (
    <svg viewBox="0 0 30 20" aria-hidden className="size-full">
      <rect width="30" height="20" fill="#DE2910" />
      <g fill="#FFDE00">
        <path
          d={STAR_PATH}
          transform="translate(5 5.2) scale(0.3) translate(-12 -12)"
        />
        <path
          d={STAR_PATH}
          transform="translate(10 2.2) scale(0.1) translate(-12 -12)"
        />
        <path
          d={STAR_PATH}
          transform="translate(12 4.2) scale(0.1) translate(-12 -12)"
        />
        <path
          d={STAR_PATH}
          transform="translate(12 7.2) scale(0.1) translate(-12 -12)"
        />
        <path
          d={STAR_PATH}
          transform="translate(10 9.2) scale(0.1) translate(-12 -12)"
        />
      </g>
    </svg>
  );
}

function FranceFlag() {
  return (
    <svg viewBox="0 0 30 20" aria-hidden className="size-full">
      <rect width="10" height="20" fill="#0055A4" />
      <rect x="10" width="10" height="20" fill="#FFFFFF" />
      <rect x="20" width="10" height="20" fill="#EF4135" />
    </svg>
  );
}

export function FlagIcon({ locale }: FlagIconProps) {
  switch (locale) {
    case "vi":
      return <VietnamFlag />;
    case "en":
      return <UnitedKingdomFlag />;
    case "zh":
      return <ChinaFlag />;
    case "fr":
      return <FranceFlag />;
  }
}
