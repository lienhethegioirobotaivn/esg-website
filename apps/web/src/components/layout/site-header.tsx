"use client";

import { useState, useEffect } from "react";
import { Container } from "@/components/ui";
import {
  LanguageSwitcher,
  msg,
  useBarePathname,
  useT,
} from "@/features/locale";
import { GuardedLink } from "@/features/leave-guard";
import { HowItWorksLink } from "@/features/how-it-works";
import { ABOUT_PATH } from "@/features/about/constants";
import { ContactDialog, INQUIRY_COPY } from "@/features/contact";
import type { InquiryKind } from "@esg/shared";
import {
  Trees,
  FileText,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Headset,
  ShieldCheck,
} from "lucide-react";

const CONSULT_ITEMS: readonly {
  kind: InquiryKind;
  description: string;
  Icon: typeof Headset;
}[] = [
  {
    kind: "advisory",
    description: msg("Hoàn thiện hồ sơ ESG cho doanh nghiệp"),
    Icon: Headset,
  },
  {
    kind: "assessment",
    description: msg("Lộ trình đánh giá và cấp chứng nhận"),
    Icon: ShieldCheck,
  },
];

export function SiteHeader() {
  const t = useT();
  const pathname = useBarePathname();
  const isHome = pathname === "/";
  const isAbout = pathname.startsWith(ABOUT_PATH);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const [isConsultOpen, setIsConsultOpen] = useState(false);
  const [contactKind, setContactKind] = useState<InquiryKind | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#e5e7eb] bg-white">
      <Container className="relative flex min-h-16 items-center justify-between gap-4 py-2">
        <GuardedLink
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-[#111827] shrink-0"
        >
          {/* eslint-disable @next/next/no-img-element */}
          <img
            src="/logo-full.png"
            alt="ESG Report Online Logo"
            className="h-8 w-auto max-h-full object-contain"
          />
        </GuardedLink>

        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          <GuardedLink
            href="/"
            className={`group relative pb-2 text-sm ${
              isHome
                ? "font-semibold text-[#006644]"
                : "font-medium text-[#374151] hover:text-[#006644] transition-colors"
            }`}
          >
            {t("Tạo báo cáo")}
            <span
              className={`absolute bottom-0 left-0 h-0.5 bg-[#006644] transition-all duration-300 ease-out ${
                isHome ? "w-full" : "w-0 group-hover:w-full"
              }`}
            />
          </GuardedLink>

          {/* <GuardedLink
            href="#"
            className="group relative pb-2 text-sm font-medium text-[#374151] hover:text-[#006644] transition-colors"
          >
            Báo cáo của tôi
            <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#006644] transition-all duration-300 ease-out group-hover:w-full" />
          </GuardedLink> */}

          <div className="group relative pb-2">
            <div className="text-sm font-medium text-[#374151] hover:text-[#006644] transition-colors">
              <HowItWorksLink />
            </div>
            <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#006644] transition-all duration-300 ease-out group-hover:w-full" />
          </div>

          <div className="relative group pb-2">
            <button className="flex items-center gap-1.5 text-sm font-medium text-[#374151] hover:text-[#006644] transition-colors">
              <span>{t("Giải pháp cân bằng carbon")}</span>
              <ChevronDown className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" />
            </button>
            <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#006644] transition-all duration-300 ease-out group-hover:w-full" />

            <div className="absolute left-0 top-full pt-2 hidden w-80 rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-xl group-hover:block z-50">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                {t("Giải pháp carbon")}
              </div>
              <GuardedLink
                href="/trong-rung"
                className="flex items-center justify-between rounded-lg p-2.5 hover:bg-[#f3f4f6] transition-colors group/item text-[#111827]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#006644]/10 text-[#006644]">
                    <Trees className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#111827]">
                      {t("Trồng rừng")}
                    </div>
                    <div className="text-xs text-[#6b7280]">
                      {t("Tìm hiểu dự án trồng rừng")}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#6b7280] transition-transform group-hover/item:translate-x-0.5" />
              </GuardedLink>

              <GuardedLink
                href="/mua-tin-chi-carbon"
                className="mt-1 flex items-center justify-between rounded-lg p-2.5 hover:bg-[#f3f4f6] transition-colors group/item text-[#111827]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#006644]/10 text-[#006644]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#111827]">
                      {t("Mua tín chỉ carbon")}
                    </div>
                    <div className="text-xs text-[#6b7280]">
                      {t("Khám phá thị trường tín chỉ")}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#6b7280] transition-transform group-hover/item:translate-x-0.5" />
              </GuardedLink>
            </div>
          </div>

          <GuardedLink
            href={ABOUT_PATH}
            className={`group relative pb-2 text-sm ${
              isAbout
                ? "font-semibold text-[#006644]"
                : "font-medium text-[#374151] hover:text-[#006644] transition-colors"
            }`}
          >
            {t("Về ESG Report Online")}
            <span
              className={`absolute bottom-0 left-0 h-0.5 bg-[#006644] transition-all duration-300 ease-out ${
                isAbout ? "w-full" : "w-0 group-hover:w-full"
              }`}
            />
          </GuardedLink>

          <div className="relative group pb-2">
            <button
              type="button"
              aria-haspopup="menu"
              className="flex items-center gap-1.5 text-sm font-medium text-[#374151] hover:text-[#006644] transition-colors"
            >
              <span>{t("Tư vấn")}</span>
              <ChevronDown className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#006644] transition-all duration-300 ease-out group-hover:w-full" />

            <div
              role="menu"
              className="absolute left-0 top-full pt-2 hidden w-72 rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-xl group-hover:block group-focus-within:block z-50"
            >
              {CONSULT_ITEMS.map(({ kind, description, Icon }) => (
                <button
                  key={kind}
                  type="button"
                  role="menuitem"
                  onClick={() => setContactKind(kind)}
                  className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left hover:bg-[#f3f4f6] transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#006644]/10 text-[#006644]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#111827]">
                      {t(INQUIRY_COPY[kind].menuLabel)}
                    </div>
                    <div className="text-xs text-[#6b7280]">
                      {t(description)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <LanguageSwitcher />
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e5e7eb] p-2 text-[#374151] hover:bg-[#f3f4f6] md:hidden transition-colors shrink-0 z-50"
          aria-label={t("Mở hoặc đóng menu")}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div
          className={`fixed inset-x-0 top-16 bottom-0 bg-white transition-all duration-300 ease-in-out md:hidden z-30 flex flex-col ${
            isOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <GuardedLink
                href="/"
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between rounded-lg p-3 text-sm ${
                  isHome
                    ? "font-semibold text-[#006644] bg-[#006644]/5"
                    : "font-medium text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                }`}
              >
                {t("Tạo báo cáo")}
              </GuardedLink>

              {/* <GuardedLink
                href="#"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-lg p-3 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6] transition-colors"
              >
                Báo cáo của tôi
              </GuardedLink> */}

              <div className="rounded-lg p-3 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6] transition-colors">
                <HowItWorksLink />
              </div>

              <div>
                <button
                  onClick={() => setIsSubMenuOpen(!isSubMenuOpen)}
                  className="flex w-full items-center justify-between p-3 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6] rounded-lg transition-colors"
                >
                  <span>{t("Giải pháp cân bằng carbon")}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isSubMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`grid transition-all duration-200 ease-in-out overflow-hidden ${
                    isSubMenuOpen ? "grid-rows-[1fr] pt-2" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden flex flex-col gap-1 pl-3">
                    <GuardedLink
                      href="/trong-rung"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-[#f3f4f6] transition-colors"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#006644]/10 text-[#006644]">
                        <Trees className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#111827]">
                          {t("Trồng rừng")}
                        </div>
                        <div className="text-[11px] text-[#6b7280]">
                          {t("Tìm hiểu dự án trồng rừng")}
                        </div>
                      </div>
                    </GuardedLink>

                    <GuardedLink
                      href="/mua-tin-chi-carbon"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-[#f3f4f6] transition-colors"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#006644]/10 text-[#006644]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#111827]">
                          {t("Mua tín chỉ carbon")}
                        </div>
                        <div className="text-[11px] text-[#6b7280]">
                          {t("Khám phá thị trường tín chỉ")}
                        </div>
                      </div>
                    </GuardedLink>
                  </div>
                </div>
              </div>

              <GuardedLink
                href={ABOUT_PATH}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between rounded-lg p-3 text-sm ${
                  isAbout
                    ? "font-semibold text-[#006644] bg-[#006644]/5"
                    : "font-medium text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                }`}
              >
                {t("Về ESG Report Online")}
              </GuardedLink>

              <div>
                <button
                  type="button"
                  onClick={() => setIsConsultOpen(!isConsultOpen)}
                  aria-expanded={isConsultOpen}
                  className="flex w-full items-center justify-between p-3 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6] rounded-lg transition-colors"
                >
                  <span>{t("Tư vấn")}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isConsultOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`grid transition-all duration-200 ease-in-out overflow-hidden ${
                    isConsultOpen ? "grid-rows-[1fr] pt-2" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden flex flex-col gap-1 pl-3">
                    {CONSULT_ITEMS.map(({ kind, description, Icon }) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          setContactKind(kind);
                        }}
                        className="flex items-center gap-3 rounded-lg p-2.5 text-left hover:bg-[#f3f4f6] transition-colors"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#006644]/10 text-[#006644]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[#111827]">
                            {t(INQUIRY_COPY[kind].menuLabel)}
                          </div>
                          <div className="text-[11px] text-[#6b7280]">
                            {t(description)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#e5e7eb] mt-4 p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                  {t("Chọn ngôn ngữ")}
                </div>
                <div className="flex items-center">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {contactKind ? (
        <ContactDialog
          key={contactKind}
          kind={contactKind}
          onClose={() => setContactKind(null)}
        />
      ) : null}
    </header>
  );
}
