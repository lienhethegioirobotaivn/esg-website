export const KEEP_EXPORTS_PER_REPORT = 5;

export const UNATTACHED_EXPORT_MAX_AGE_HOURS = 24;
export const ABANDONED_REPORT_MAX_AGE_DAYS = 7;

export const EXPORT_RATE_LIMIT = { limit: 20, windowSeconds: 3600 } as const;
export const OWNER_ACTION_RATE_LIMIT = { limit: 60, windowSeconds: 60 } as const;
