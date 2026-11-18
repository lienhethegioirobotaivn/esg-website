import "server-only";

import { createRateWindow } from "../brand-theme/limits";

export const REPORT_CHUNK_IP_LIMIT = 80;
export const REPORT_FINISH_IP_LIMIT = 10;
export const REPORT_CHUNK_DAILY_LIMIT = 6000;
export const REPORT_FINISH_DAILY_LIMIT = 600;

const chunkWindow = createRateWindow();
const finishWindow = createRateWindow();

export function reportChunkWindow() {
  return chunkWindow;
}

export function reportFinishWindow() {
  return finishWindow;
}
