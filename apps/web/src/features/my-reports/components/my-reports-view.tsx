"use client";

import { groupMyReports, maskEmail } from "@esg/shared";
import type { MyReport, ReportArchiveFormat } from "@esg/shared";
import { FileText, FileType2, LogOut, PencilLine, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmailOtpForm } from "@/features/account";
import { LocaleLink, useLocale, useLocalePath, useT } from "@/features/locale";
import { applyReportSnapshot } from "@/features/survey";
import { Button, Card, Container, LoadingRegion, Modal, Skeleton } from "@/components/ui";

import { formatExportTime } from "../lib/format-export-time";
import {
  MyReportsError,
  deleteMyReport,
  downloadMyReportFile,
  fetchMyReportSnapshot,
  fetchMyReports,
  signOutMyReports,
} from "../services/my-reports.service";

type ViewState =
  | { readonly kind: "loading" }
  | { readonly kind: "signed-out" }
  | { readonly kind: "failed"; readonly message: string }
  | { readonly kind: "ready"; readonly email: string; readonly reports: MyReport[] };

type PendingAction =
  | { readonly kind: "reopen"; readonly report: MyReport }
  | { readonly kind: "delete"; readonly report: MyReport };

type BusyKey = `${string}:${"pdf" | "docx" | "reopen" | "delete"}`;

export function MyReportsView() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const localePath = useLocalePath();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState<BusyKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const describe = useCallback(
    (failure: unknown): string =>
      failure instanceof MyReportsError
        ? t(failure.message)
        : t("Không kết nối được. Vui lòng thử lại."),
    [t],
  );

  const fetchState = useCallback(async (): Promise<ViewState> => {
    try {
      const result = await fetchMyReports();
      return result.signedIn
        ? { kind: "ready", email: result.email, reports: result.reports }
        : { kind: "signed-out" };
    } catch (failure) {
      return { kind: "failed", message: describe(failure) };
    }
  }, [describe]);

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    setState(await fetchState());
  }, [fetchState]);

  useEffect(() => {
    let active = true;
    void fetchState().then((next) => {
      if (active) {
        setState(next);
      }
    });
    return () => {
      active = false;
    };
  }, [fetchState]);

  const groups = useMemo(
    () => (state.kind === "ready" ? groupMyReports(state.reports) : []),
    [state],
  );

  async function download(report: MyReport, format: ReportArchiveFormat) {
    if (busy !== null) {
      return;
    }
    setBusy(`${report.exportId}:${format}`);
    setNotice(null);
    try {
      await downloadMyReportFile(report.exportId, format);
    } catch (failure) {
      setNotice(describe(failure));
    } finally {
      setBusy(null);
    }
  }

  async function confirmReopen(report: MyReport) {
    setBusy(`${report.exportId}:reopen`);
    setNotice(null);
    try {
      const { snapshot, reportCode } = await fetchMyReportSnapshot(report.exportId);
      if (!applyReportSnapshot(snapshot, reportCode)) {
        setNotice(t("Không lưu được bản nháp vào trình duyệt. Vui lòng kiểm tra dung lượng lưu trữ."));
        setBusy(null);
        setPending(null);
        return;
      }
      router.push(localePath("/"));
    } catch (failure) {
      setNotice(describe(failure));
      setBusy(null);
      setPending(null);
    }
  }

  async function confirmDelete(report: MyReport) {
    setBusy(`${report.exportId}:delete`);
    setNotice(null);
    try {
      await deleteMyReport(report.exportId);
      setState((current) =>
        current.kind === "ready"
          ? {
              ...current,
              reports: current.reports.filter((item) => item.exportId !== report.exportId),
            }
          : current,
      );
    } catch (failure) {
      setNotice(describe(failure));
    } finally {
      setBusy(null);
      setPending(null);
    }
  }

  async function signOut() {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    try {
      await signOutMyReports();
      setNotice(null);
      setState({ kind: "signed-out" });
    } catch (failure) {
      setNotice(describe(failure));
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main>
      <Container className="py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{t("Báo cáo của tôi")}</h1>
              <p className="mt-1 text-sm text-muted">
                {state.kind === "ready"
                  ? t("Các báo cáo đã tạo và gắn với email {email}.", {
                      email: maskEmail(state.email),
                    })
                  : t("Xem lại, tải lại và chỉnh sửa các báo cáo bạn đã tạo.")}
              </p>
            </div>
            {state.kind === "ready" ? (
              <Button
                variant="secondary"
                size="sm"
                loading={signingOut}
                leadingIcon={<LogOut aria-hidden className="size-4" />}
                onClick={() => void signOut()}
              >
                {t("Đăng xuất")}
              </Button>
            ) : null}
          </div>

          {notice ? (
            <p role="alert" className="mt-4 rounded-control border border-danger-600/30 px-3 py-2 text-sm text-danger-600">
              {notice}
            </p>
          ) : null}

          <div className="mt-6">
            {state.kind === "loading" ? (
              <LoadingRegion label={t("Đang tải danh sách báo cáo...")} className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </LoadingRegion>
            ) : null}

            {state.kind === "failed" ? (
              <Card className="p-5">
                <p role="alert" className="text-sm text-danger-600">{state.message}</p>
                <Button className="mt-3" variant="secondary" onClick={() => void reload()}>
                  {t("Thử lại")}
                </Button>
              </Card>
            ) : null}

            {state.kind === "signed-out" ? (
              <EmailOtpForm idPrefix="my-reports" required onVerified={reload} />
            ) : null}

            {state.kind === "ready" && groups.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm font-medium">{t("Chưa có báo cáo nào gắn với email này.")}</p>
                <p className="mt-1 text-sm text-muted">
                  {t("Hãy tạo báo cáo, rồi xác nhận email trong hộp thoại tải báo cáo để lưu lại.")}
                </p>
                <LocaleLink
                  href="/"
                  className="mt-4 inline-flex min-h-10 items-center rounded-control bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900"
                >
                  {t("Tạo báo cáo")}
                </LocaleLink>
              </Card>
            ) : null}

            {state.kind === "ready"
              ? groups.map((group) => (
                  <Card key={group.reportCode} className="mb-4 p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-base font-semibold">
                        {group.company !== "" ? group.company : t("Doanh nghiệp chưa đặt tên")}
                      </h2>
                      <span className="text-xs text-subtle">{group.reportCode}</span>
                    </div>
                    <ul className="mt-3 divide-y divide-border">
                      {group.reports.map((report) => (
                        <li key={report.exportId} className="py-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <span className="font-medium">{formatExportTime(report.time, locale)}</span>
                            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                              {report.status === "complete" ? t("Đầy đủ") : t("Bản nháp")}
                            </span>
                            <span className="text-xs text-subtle">{report.locale.toUpperCase()}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {report.pdf ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={busy === `${report.exportId}:pdf`}
                                disabled={busy !== null}
                                leadingIcon={<FileText aria-hidden className="size-4" />}
                                onClick={() => void download(report, "pdf")}
                              >
                                {t("Tải PDF")}
                              </Button>
                            ) : null}
                            {report.docx ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={busy === `${report.exportId}:docx`}
                                disabled={busy !== null}
                                leadingIcon={<FileType2 aria-hidden className="size-4" />}
                                onClick={() => void download(report, "docx")}
                              >
                                {t("Tải Word")}
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              disabled={busy !== null}
                              leadingIcon={<PencilLine aria-hidden className="size-4" />}
                              onClick={() => setPending({ kind: "reopen", report })}
                            >
                              {t("Mở lại để chỉnh sửa")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy !== null}
                              leadingIcon={<Trash2 aria-hidden className="size-4" />}
                              onClick={() => setPending({ kind: "delete", report })}
                            >
                              {t("Xóa")}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))
              : null}
          </div>
        </div>
      </Container>

      {pending?.kind === "reopen" ? (
        <Modal
          title={t("Mở lại để chỉnh sửa")}
          onClose={() => (busy === null ? setPending(null) : undefined)}
          size="sm"
        >
          <p className="text-sm leading-relaxed text-muted">
            {t(
              "Câu trả lời, hồ sơ doanh nghiệp, kế hoạch và giao diện của báo cáo này sẽ được nạp vào trình duyệt, thay cho bản nháp hiện có. Ảnh và tệp minh chứng không được lưu nên bạn cần tải lại nếu muốn.",
            )}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" disabled={busy !== null} onClick={() => setPending(null)}>
              {t("Hủy")}
            </Button>
            <Button
              loading={busy === `${pending.report.exportId}:reopen`}
              onClick={() => void confirmReopen(pending.report)}
            >
              {t("Mở lại")}
            </Button>
          </div>
        </Modal>
      ) : null}

      {pending?.kind === "delete" ? (
        <Modal
          title={t("Xóa báo cáo này?")}
          onClose={() => (busy === null ? setPending(null) : undefined)}
          size="sm"
        >
          <p className="text-sm leading-relaxed text-muted">
            {t(
              "File PDF, file Word và dữ liệu đã lưu của lần xuất này sẽ bị xóa khỏi hệ thống và không thể khôi phục.",
            )}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" disabled={busy !== null} onClick={() => setPending(null)}>
              {t("Hủy")}
            </Button>
            <Button
              variant="danger"
              loading={busy === `${pending.report.exportId}:delete`}
              onClick={() => void confirmDelete(pending.report)}
            >
              {t("Xóa")}
            </Button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
