const DELAYS_SECONDS = [30, 120, 600, 3600] as const;

export function retryDelaySeconds(attemptsMade: number): number {
  const index = Math.max(1, attemptsMade) - 1;
  return DELAYS_SECONDS[index] ?? DELAYS_SECONDS[DELAYS_SECONDS.length - 1] ?? 3600;
}

export const OUTBOX_LEASE_SECONDS = 120;
export const OTP_RESERVE_RATIO = 0.2;

export function otpReserve(dailyLimit: number): number {
  return Math.ceil(dailyLimit * OTP_RESERVE_RATIO);
}
