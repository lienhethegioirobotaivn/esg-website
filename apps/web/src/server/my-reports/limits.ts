import "server-only";

import { createRateWindow } from "../brand-theme/limits";

export const MY_REPORTS_IP_LIMIT = 60;
export const MY_REPORTS_DAILY_LIMIT = 5000;
export const MY_REPORTS_DELETE_IP_LIMIT = 20;

const readWindow = createRateWindow();
const deleteWindow = createRateWindow();

export function myReportsReadWindow() {
  return readWindow;
}

export function myReportsDeleteWindow() {
  return deleteWindow;
}
