"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { JOBS } from "@/lib/seed";
import { Icon } from "./ui";

const NAV = [
  { href: "/", path: "/", label: "맞춤 공고", icon: "travel_explore", badge: String(JOBS.length), badgeCls: "text-tertiary-fixed bg-tertiary-container/40" },
  { href: "/kanban", path: "/kanban", label: "내 지원 현황", icon: "view_kanban" },
  { href: "/cover-letter", path: "/cover-letter", label: "자소서 코칭", icon: "auto_fix_high", badge: "BETA", badgeCls: "bg-surface-variant/30 text-primary-fixed" },
];

const CRUMB: Record<string, string> = {
  "/": "맞춤 공고",
  "/kanban": "내 지원 현황",
  "/cover-letter": "자소서 코칭",
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { applications, profile } = useStore();
  const [topQ, setTopQ] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/jobs") : pathname.startsWith(href);

  const crumb = pathname.startsWith("/jobs") ? "공고 상세" : CRUMB[pathname] ?? "맞춤 공고";

  const submitSearch = () => router.push(`/${topQ.trim() ? `?q=${encodeURIComponent(topQ.trim())}` : ""}`);

  return (
    <>
      {/* ===== 좌측 고정 사이드바 (데스크톱) — 프로토타입 260px 다크 네이비 ===== */}
      <aside className="fixed left-0 top-0 h-screen w-[260px] bg-inverse-surface z-50 hidden lg:flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col min-h-0">
          <div className="h-16 px-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand-logo.png" alt="JobFilter" className="h-7 w-auto object-contain brightness-0 invert" />
            </Link>
            <span className="font-mono text-[11px] font-semibold bg-primary-container text-white px-1.5 py-0.5 rounded-lg">
              CS 취업 특화
            </span>
          </div>

          <div className="px-4 py-2 overflow-y-auto">
            <p className="text-[11px] font-semibold text-outline uppercase tracking-wider px-2 mb-1">Recruitment Hub</p>
            <nav className="space-y-1">
              {NAV.map((n) => {
                const active = isActive(n.href);
                const badge =
                  n.href === "/kanban" && applications.length > 0
                    ? { text: String(applications.length), cls: "bg-error-container text-on-error-container font-bold" }
                    : n.badge
                      ? { text: n.badge, cls: n.badgeCls ?? "" }
                      : null;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`flex items-center justify-between px-2 py-2 rounded-xl transition-colors ${
                      active
                        ? "bg-primary-container text-white font-semibold"
                        : "text-inverse-on-surface/75 hover:bg-surface-variant/20 hover:text-inverse-on-surface"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon name={n.icon} size={20} />
                      <span className="text-[14px]">{n.label}</span>
                    </span>
                    {badge && (
                      <span className={`font-mono text-[11px] px-1.5 rounded ${badge.cls}`}>{badge.text}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <p className="text-[10px] text-outline/70 px-2 mt-4 leading-relaxed">
              로그인 없는 MVP 데모 — 프로필·북마크·지원 현황은 이 브라우저에만 저장됩니다.
            </p>
          </div>
        </div>

        {/* 하단 매칭 기준 프로필 — 계정 아님, F-12 점수의 입력값 */}
        <div className="p-4">
          <div className="p-2.5 rounded-xl bg-surface-container-highest/10">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center">
                  <Icon name="tune" size={16} />
                </span>
                <div className="leading-none">
                  <p className="text-[12px] font-semibold text-inverse-on-surface">매칭 기준 프로필</p>
                  <p className="text-[10px] text-outline mt-0.5">비로그인 데모 입력값</p>
                </div>
              </div>
            </div>
            <div className="flex gap-1 pt-1 flex-wrap">
              {profile.skills.slice(0, 3).map((s) => (
                <span key={s} className="text-[10px] font-semibold bg-primary-container/30 text-primary-fixed px-1.5 py-0.5 rounded">
                  {s}
                </span>
              ))}
              {profile.skills.length > 3 && (
                <span className="text-[10px] font-semibold text-outline px-1">+{profile.skills.length - 3}</span>
              )}
            </div>
            <p className="text-[9.5px] text-outline/80 mt-1.5 leading-snug">
              공고 상세에서 스킬·직군 즉석 수정 → 점수 즉시 재계산 (F-27 축소)
            </p>
          </div>
        </div>
      </aside>

      {/* ===== 상단 고정 바 — 브레드크럼 + 검색 + 퀵 액션 ===== */}
      <header className="fixed top-0 left-0 lg:left-[260px] right-0 h-16 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-4 md:px-8 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="lg:hidden p-2 rounded-xl text-on-surface-variant hover:bg-surface-container"
            onClick={() => setMobileNav(!mobileNav)}
            aria-label="메뉴"
          >
            <Icon name="menu" size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-logo.png" alt="JobFilter" className="h-7 w-auto object-contain shrink-0" />
          <div className="hidden md:flex items-center gap-1 text-on-surface-variant text-[12px] shrink-0">
            <span className="hover:text-on-surface cursor-pointer">포털</span>
            <Icon name="chevron_right" size={16} />
            <span className="text-on-surface font-semibold">{crumb}</span>
          </div>
          <div className="relative hidden sm:flex items-center">
            <Icon name="search" size={18} className="absolute left-2 text-outline" />
            <input
              className="w-56 xl:w-80 h-9 pl-8 pr-12 rounded-xl bg-surface-container-low text-[12px] text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/15 transition-all"
              placeholder="기업, 기술 스택, 직무 검색..."
              value={topQ}
              onChange={(e) => setTopQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            />
            <span className="absolute right-2 font-mono text-[11px] text-outline bg-surface-container px-1.5 py-0.5 rounded">
              Enter
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/?bm=1"
            className="hidden md:flex items-center gap-1 px-3 h-9 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface text-[12px] font-semibold transition-colors"
          >
            <Icon name="bookmark_add" size={18} />공고 스크랩
          </Link>
          <Link
            href="/cover-letter"
            className="flex items-center gap-1 px-3 h-9 rounded-xl bg-primary-container text-white hover:bg-primary text-[12px] font-semibold transition-colors shadow-sm"
          >
            <Icon name="edit_note" size={18} />자소서 작성하기
          </Link>
          <span className="hidden sm:flex w-8 h-8 rounded-full bg-surface-container text-on-surface-variant items-center justify-center" title="데모 사용자">
            <Icon name="person" size={17} />
          </span>
        </div>
      </header>

      {/* 모바일 네비게이션 드로어 */}
      {mobileNav && (
        <div className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-inverse-surface px-4 py-3 shadow-xl">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setMobileNav(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold ${
                isActive(n.href) ? "bg-primary-container text-white" : "text-inverse-on-surface/75"
              }`}
            >
              <Icon name={n.icon} size={19} /> {n.label}
            </Link>
          ))}
        </div>
      )}

      {/* ===== 본문 ===== */}
      <div className="lg:pl-[260px]">
        <main className="w-full pt-16 px-4 md:px-8 py-6 min-h-screen">{children}</main>
      </div>
    </>
  );
}
