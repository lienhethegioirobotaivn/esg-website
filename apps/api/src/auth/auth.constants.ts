export const USER_COOKIE_NAME = "esg-user";

export const OTP_RULES = {
  codeLength: 6,
  ttlSeconds: 600,
  maxTries: 5,
  resendSeconds: 60,
  perEmailPerHour: 3,
  sessionDays: 30,
  maxEmailLength: 254,
} as const;

export const AUTH_LIMITS = {
  request: { perIp: 6, perDay: 300, ipWindowSeconds: 600 },
  verify: { perIp: 20, perDay: 3000, ipWindowSeconds: 600 },
  dayWindowSeconds: 86_400,
} as const;

export const SESSION_MAX_AGE_MS = OTP_RULES.sessionDays * 86_400_000;
