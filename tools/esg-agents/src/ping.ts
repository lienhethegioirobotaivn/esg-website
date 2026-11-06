import { loadConfig } from "./config";
import { GeminiError, generateGrounded } from "./gemini";

interface Probe {
  readonly model: string;
  readonly search: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const config = loadConfig();
  const probes: readonly Probe[] = [
    { model: config.DISCOVER_MODEL, search: false },
    { model: config.DISCOVER_MODEL, search: true },
    { model: "gemini-3.5-flash-lite", search: false },
    { model: "gemini-3.5-flash-lite", search: true },
  ];

  for (const [index, probe] of probes.entries()) {
    if (index > 0) {
      await sleep(config.REQUEST_DELAY_MS);
    }
    const label = `${probe.model} | tìm kiếm Google: ${probe.search ? "bật" : "tắt"}`;
    try {
      const answer = await generateGrounded({
        apiKey: config.GEMINI_API_KEY,
        model: probe.model,
        prompt: "Trả lời đúng một từ: OK",
        search: probe.search,
      });
      console.log(`[THÀNH CÔNG] ${label} -> ${answer.text.trim().slice(0, 40)}`);
    } catch (error) {
      const status = error instanceof GeminiError ? error.status : 0;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[LỖI ${status}] ${label}\n${message.slice(0, 1500)}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
