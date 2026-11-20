interface LinkReportOwnerInput {
  readonly attach: (() => Promise<void>) | null;
  readonly rearchive: () => Promise<unknown>;
}

export async function linkReportOwner({
  attach,
  rearchive,
}: LinkReportOwnerInput): Promise<void> {
  if (attach !== null) {
    try {
      await attach();
      return;
    } catch {
    }
  }
  const result = await rearchive();
  if (result === null) {
    throw new Error("Chưa lưu được báo cáo.");
  }
}
