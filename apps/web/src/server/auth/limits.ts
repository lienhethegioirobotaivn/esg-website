import "server-only";

import { createRateWindow } from "../brand-theme/limits";

export const AUTH_REQUEST_IP_LIMIT = 6;
export const AUTH_REQUEST_DAILY_LIMIT = 300;
export const AUTH_VERIFY_IP_LIMIT = 20;
export const AUTH_VERIFY_DAILY_LIMIT = 3000;
export const AUTH_ATTACH_IP_LIMIT = 30;
export const AUTH_ATTACH_DAILY_LIMIT = 3000;

const requestWindow = createRateWindow();
const verifyWindow = createRateWindow();
const attachWindow = createRateWindow();

export function authRequestWindow() {
  return requestWindow;
}

export function authVerifyWindow() {
  return verifyWindow;
}

export function authAttachWindow() {
  return attachWindow;
}
