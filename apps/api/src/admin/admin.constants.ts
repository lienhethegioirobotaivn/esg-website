export const ADMIN_COOKIE_NAME = "esg-admin";
export const ADMIN_SESSION_DAYS = 7;
export const ADMIN_SESSION_MAX_AGE_MS = ADMIN_SESSION_DAYS * 86_400_000;

export const ADMIN_LOGIN_MAX_FAILURES = 5;
export const ADMIN_LOCK_MINUTES = 15;
export const ADMIN_LOGIN_RATE_LIMIT = { limit: 20, windowSeconds: 900 } as const;
export const ADMIN_ACTION_RATE_LIMIT = { limit: 240, windowSeconds: 60 } as const;

export const ADMIN_PASSWORD_MIN_LENGTH = 12;
export const ADMIN_PASSWORD_MAX_LENGTH = 200;
