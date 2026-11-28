"use client";

import { ExternalLink, KeyRound, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { Button, Card, LoadingRegion, Modal, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";

import {
  ApiError,
  SESSION_EXPIRED_EVENT,
  SESSION_RESTORED_EVENT,
  errorMessage,
  getJson,
  sendJson,
} from "../lib/api";
import { ROLE_LABELS } from "../lib/labels";
import { canAccess, homePath, isCurrentPath, visibleSections } from "../lib/nav";
import type { AdminProfile } from "../lib/types";
import { LoginForm } from "./login-form";
import { ToastProvider, useNotify } from "./toast";

type Session =
  | { status: "loading" }
  | { status: "offline"; message: string }
  | { status: "guest" }
  | { status: "ready"; admin: AdminProfile; expired: boolean };

const AdminContext = createContext<AdminProfile | null>(null);

export function useAdmin(): AdminProfile {
  const admin = useContext(AdminContext);
  if (admin === null) {
    throw new Error("useAdmin chỉ dùng bên trong khung quản trị.");
  }
  return admin;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 pt-20">
      <Card className="w-full max-w-sm space-y-4 p-6">
        <div>
          <p className="font-bold text-primary-800">ESG Report Online</p>
          <h1 className="text-lg">Đăng nhập quản trị</h1>
        </div>
        {children}
      </Card>
    </main>
  );
}

function Sidebar({
  admin,
  pathname,
  onSignOut,
}: {
  admin: AdminProfile;
  pathname: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(pathname);

  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const itemClassName = (current: boolean) =>
    cn(
      "flex min-h-9 items-center gap-2 rounded-control px-2.5 text-sm",
      current
        ? "bg-primary-100 font-semibold text-primary-800"
        : "text-foreground hover:bg-surface-muted",
    );

  return (
    <aside className="border-b border-border bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-5 py-3 lg:py-4">
        <Link href={homePath(admin.role)} className="leading-tight">
          <span className="block font-bold text-primary-800">
            ESG Report Online
          </span>
          <span className="block text-xs text-muted">Trang quản trị</span>
        </Link>
        <Button
          variant="secondary"
          size="sm"
          className="lg:hidden"
          aria-expanded={open}
          aria-controls="admin-menu"
          onClick={() => setOpen((current) => !current)}
          leadingIcon={
            open ? (
              <X aria-hidden className="size-4" />
            ) : (
              <Menu aria-hidden className="size-4" />
            )
          }
        >
          Menu
        </Button>
      </div>
      <nav
        id="admin-menu"
        aria-label="Quản trị"
        className={cn("space-y-4 px-3 pb-4 lg:block", open ? "block" : "hidden")}
      >
        {visibleSections(admin.role).map((section) => (
          <div key={section.title} className="space-y-0.5">
            <p className="px-2.5 text-[0.6875rem] leading-snug text-subtle">
              <span className="block font-bold uppercase tracking-wide">
                {section.title}
              </span>
              {section.hint}
            </p>
            {section.items.map((item) => {
              const current = isCurrentPath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={itemClassName(current)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
        <div className="space-y-0.5 border-t border-border pt-3">
          <p className="px-2.5 pb-1 text-xs leading-snug text-muted">
            <span className="block break-words text-sm font-semibold text-foreground">
              {admin.name}
            </span>
            {ROLE_LABELS[admin.role]}
          </p>
          <Link
            href="/quan-tri/doi-mat-khau"
            className={itemClassName(pathname === "/quan-tri/doi-mat-khau")}
          >
            <KeyRound aria-hidden className="size-4" />
            Đổi mật khẩu
          </Link>
          <Link href="/" target="_blank" className={itemClassName(false)}>
            <ExternalLink aria-hidden className="size-4" />
            Xem trang web
          </Link>
          <button
            type="button"
            className={cn(itemClassName(false), "w-full")}
            onClick={onSignOut}
          >
            <LogOut aria-hidden className="size-4" />
            Đăng xuất
          </button>
        </div>
      </nav>
    </aside>
  );
}

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const notify = useNotify();
  const [session, setSession] = useState<Session>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [reopened, setReopened] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getJson<AdminProfile>("/admin/me").then(
      (admin) => {
        if (!cancelled) {
          setSession({ status: "ready", admin, expired: false });
        }
      },
      (caught: unknown) => {
        if (cancelled) {
          return;
        }
        setSession(
          caught instanceof ApiError && caught.status === 401
            ? { status: "guest" }
            : {
                status: "offline",
                message: errorMessage(caught, "Không kết nối được tới máy chủ."),
              },
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    function expire() {
      setSession((current) =>
        current.status === "ready" ? { ...current, expired: true } : current,
      );
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, []);

  function signedIn(admin: AdminProfile) {
    setSession({ status: "ready", admin, expired: false });
    window.dispatchEvent(new Event(SESSION_RESTORED_EVENT));
  }

  async function signOut() {
    try {
      await sendJson("POST", "/admin/logout");
    } catch (caught) {
      if (!(caught instanceof ApiError) || caught.status !== 401) {
        notify(errorMessage(caught, "Không đăng xuất được."), "error");
        return;
      }
    }
    setSession({ status: "guest" });
    router.replace("/quan-tri");
  }

  if (session.status === "loading") {
    return (
      <LoadingRegion label="Đang kiểm tra phiên đăng nhập...">
        <div className="mx-auto mt-20 max-w-sm space-y-3 px-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </LoadingRegion>
    );
  }
  if (session.status === "offline") {
    return (
      <Centered>
        <p role="alert" className="text-sm text-danger-600">
          {session.message}
        </p>
        <p className="text-sm text-muted">
          Hãy kiểm tra API đã chạy chưa rồi thử lại.
        </p>
        <Button
          className="w-full"
          onClick={() => {
            setSession({ status: "loading" });
            setAttempt((value) => value + 1);
          }}
        >
          Thử lại
        </Button>
      </Centered>
    );
  }
  if (session.status === "guest") {
    return (
      <Centered>
        <LoginForm onSignedIn={signedIn} />
      </Centered>
    );
  }

  const { admin, expired } = session;
  return (
    <AdminContext.Provider value={admin}>
      <div className="min-h-screen lg:flex">
        <Sidebar
          admin={admin}
          pathname={pathname}
          onSignOut={() => void signOut()}
        />
        <main
          key={admin.email}
          className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10"
        >
          {canAccess(admin.role, pathname) ? (
            children
          ) : (
            <Card className="space-y-3 p-6">
              <h1 className="text-lg">Bạn không có quyền dùng mục này</h1>
              <p className="text-sm text-muted">
                Tài khoản của bạn thuộc vai trò {ROLE_LABELS[admin.role]}. Hãy
                nhờ quản trị viên đổi vai trò nếu cần.
              </p>
              <Link
                href={homePath(admin.role)}
                className="text-sm text-primary-700 underline"
              >
                Về trang chính của bạn
              </Link>
            </Card>
          )}
        </main>
      </div>
      {expired ? (
        <Modal
          key={reopened}
          title="Đăng nhập lại"
          size="sm"
          dismissible={false}
          onClose={() => setReopened((value) => value + 1)}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục, nội dung
              bạn đang soạn vẫn được giữ.
            </p>
            <LoginForm defaultEmail={admin.email} onSignedIn={signedIn} />
          </div>
        </Modal>
      ) : null}
    </AdminContext.Provider>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ShellContent>{children}</ShellContent>
    </ToastProvider>
  );
}
