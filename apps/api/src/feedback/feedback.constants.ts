export const FEEDBACK_INVITE_DELAY_DAYS = 5;
export const FEEDBACK_INVITE_MAX_AGE_DAYS = 30;
export const FEEDBACK_INVITE_BATCH = 50;
export const FEEDBACK_SUBMIT_RATE_LIMIT = { limit: 10, windowSeconds: 3600 } as const;
export const FEEDBACK_TOKEN_RATE_LIMIT = { limit: 60, windowSeconds: 3600 } as const;
export const FEEDBACK_FORM_VERSION = "feedback-v1";
