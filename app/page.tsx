"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { JOBS, JOB_CATEGORIES, CAREERS, EMPLOY_TYPES, LOCATIONS, MAJORS } from "@/lib/seed";
import { calcMatch, dday } from "@/lib/logic";
import { Job } from "@/lib/types";
import { useStore } from "@/lib/store";
import JobCard from "@/components/JobCard";
import { Icon, DdayBadge } from "@/components/ui";

const PAGE_SIZE = 8;
const SORTS = [
  { key: "match", label: "내 스펙 매칭순" },
  { key: "deadline", label: "마감 임박순" },
  { key: "latest", label: "최신 등록순" },
] as const;

const FILTER_LABELS: Record<string, string> = {
  q: "검색어",
  career: "경력",
  type: "고용형태",
  cat: "직군",
  major: "학과",
  loc: "근무지",
  tag: "태그",
  dl: "마감",
  bm: "북마크",
};

type ListingResult = { items: Job[]; total: number; page: number; pageCount: number };

function ListingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile, applications, bookmarks } = useStore();

  const f = {
    q: params.get("q") ?? "",
    career: params.get("career") ?? "전체",
    type: params.get("type") ?? "전체",
    cat: params.get("cat") ?? "전체",
    major: params.get("major") ?? "전체",
    loc: params.get("loc") ?? "전체",
    tag: params.get("tag") ?? "전체",
    dl: params.get("dl") ?? "전체",
    bm: params.get("bm") === "1",
    sort: (params.get("sort") as "match" | "deadline" | "latest") || "match",
    page: Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1),
  };

  const setParam = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "전체") p.delete(k);
      else p.set(k, v);
    }
    if (!("page" in patch)) p.delete("page"); // 필터 바뀌면 페이지 리셋 (F-11 명세)
    router.replace(`/?${p.toString()}`, { scroll: false }); // URL 쿼리 동기화 — 검수 A-02
  };

  // 검색어 디바운스 — 입력 즉시 URL 동기화하되 서버 요청 폭주 방지
  const [qInput, setQInput] = useState(f.q);
  useEffect(() => setQInput(f.q), [f.q]);
  useEffect(() => {
    const t = setTimeout(() => { if (qInput !== f.q) setParam({ q: qInput }); }, 300);
    return () => clearTimeout(t);
  }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const allTags = useMemo(() => ["전체", ...Array.from(new Set(JOBS.flatMap((j) => j.tags)))], []);

  // 서버 측 필터링·페이지네이션 — GET /api/listings (검수 A-02, C-10 반면교사)
  // 프로필·북마크는 무로그인 MVP라 클라이언트 소유 → 쿼리 파라미터로 서버에 전달.
  const [result, setResult] = useState<ListingResult | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams();
    const set = (k: string, v: string) => sp.set(k, v);
    if (f.q) set("q", f.q);
    if (f.career !== "전체") set("career", f.career);
    if (f.type !== "전체") set("type", f.type);
    if (f.cat !== "전체") set("cat", f.cat);
    if (f.major !== "전체") set("major", f.major);
    if (f.loc !== "전체") set("loc", f.loc);
    if (f.tag !== "전체") set("tag", f.tag);
    if (f.dl !== "전체") set("dl", f.dl);
    if (f.bm) { set("bm", "1"); set("bmids", bookmarks.join(",")); }
    set("sort", f.sort);
    set("page", String(f.page));
    set("size", String(PAGE_SIZE));
    set("pskills", profile.skills.join(","));
    set("prole", profile.targetRole);
    set("pcareer", profile.career);

    let alive = true;
    fetch(`/api/listings?${sp.toString()}`)
      .then((r) => r.json())
      .then((d: ListingResult) => { if (alive) setResult(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [f.q, f.career, f.type, f.cat, f.major, f.loc, f.tag, f.dl, f.bm, f.sort, f.page, profile, bookmarks]);

  const pageItems = result?.items ?? [];
  const total = result?.total ?? 0;
  const pageCount = result?.pageCount ?? 1;
  const page = result?.page ?? f.page;

  const activeFilters = Object.entries(f).filter(
    ([k, v]) => ["q", "career", "type", "cat", "major", "loc", "tag", "dl", "bm"].includes(k) && v !== "" && v !== "전체" && v !== false
  );

  // 경량 대시보드 데이터 (F-10)
  const urgent = JOBS.filter((j) => { const d = dday(j); return d >= 0 && d <= 7; }).sort((a, b) => dday(a) - dday(b));
  const recommended = useMemo(
    () => JOBS.filter((j) => dday(j) >= 0).sort((a, b) => calcMatch(b, profile).total - calcMatch(a, profile).total).slice(0, 3),
    [profile]
  );
  const activeApps = applications.filter((a) => !["ACCEPTED", "REJECTED"].includes(a.status));
  const passedApps = applications.filter((a) => ["DOC_PASSED", "INTERVIEW", "ACCEPTED"].includes(a.status));

  return (
    <div className="flex flex-col gap-5">
      {/* 페이지 헤더 — 프로토타입 _2 패턴 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-primary text-[11px] font-bold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            CS 특화 맞춤 공고 탐색
          </div>
          <h1 className="font-headline text-[24px] font-bold text-on-surface tracking-tight">
            채용공고 탐색 <span className="font-mono text-[15px] text-secondary font-semibold">(총 {result?.total ?? JOBS.length}개의 IT/SW 채용공고)</span>
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary-fixed/60 text-on-tertiary-fixed text-[11px] font-bold">
          <Icon name="verified" size={15} /> 키워드 매칭 적용 중 · 시드 데모 데이터
        </span>
      </div>

      {/* F-10 경량 대시보드 — 지원 통계·마감 임박·추천 공고 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/kanban" className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-secondary uppercase">진행 중 지원</span>
            <span className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center"><Icon name="view_kanban" size={18} /></span>
          </div>
          <div className="flex items-end gap-2">
            <span className="font-mono text-[28px] font-bold leading-none text-on-surface">{activeApps.length}</span>
            <span className="text-[12px] text-secondary pb-0.5">건 · 서류통과+ {passedApps.length}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-container mt-3 overflow-hidden">
            <div className="h-full bg-primary-container rounded-full transition-all" style={{ width: `${Math.min(100, activeApps.length * 20)}%` }} />
          </div>
          <p className="mt-2 text-[11px] font-bold text-primary group-hover:underline">칸반 보드 열기 →</p>
        </Link>

        <div className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-error uppercase">마감 임박 (7일 이내)</span>
            <span className="w-9 h-9 rounded-xl bg-error-container/50 text-error flex items-center justify-center"><Icon name="alarm" size={18} /></span>
          </div>
          <div className="flex flex-col gap-1.5">
            {urgent.slice(0, 3).map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between gap-2 group">
                <span className="text-[12.5px] font-semibold text-on-surface truncate group-hover:text-primary">
                  {j.company} · {j.position}
                </span>
                <DdayBadge job={j} />
              </Link>
            ))}
            {urgent.length === 0 && <span className="text-[12px] text-secondary">임박 공고 없음</span>}
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-primary uppercase">내 스킬 매칭 상위</span>
            <span className="w-9 h-9 rounded-xl bg-tertiary-fixed/60 text-tertiary flex items-center justify-center"><Icon name="recommend" size={18} /></span>
          </div>
          <div className="flex flex-col gap-1.5">
            {recommended.map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between gap-2 group">
                <span className="text-[12.5px] font-semibold text-on-surface truncate group-hover:text-primary">
                  {j.company} · {j.position}
                </span>
                <span className="font-mono text-[12px] font-bold text-primary">{calcMatch(j, profile).total}%</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* F-11 검색·필터 — 검색어+경력·고용형태·학과·근무지·태그·마감 (명세 7종) + 직군 */}
      <section className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container flex flex-col gap-3">
        <div className="relative flex items-center w-full">
          <Icon name="search" size={20} className="absolute left-3 text-secondary" />
          <input
            className="w-full h-11 pl-10 pr-24 rounded-xl bg-surface-container-low text-[14px] text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-colors"
            placeholder="기업, 기술 스택, 직무 검색..."
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
          <span className="absolute right-[86px] font-mono text-[10.5px] text-outline bg-surface-container px-1.5 py-0.5 rounded hidden sm:block">검색</span>
          <button
            onClick={() => setParam({ q: qInput })}
            className="absolute right-1.5 h-8 px-3.5 rounded-lg bg-primary text-on-primary text-[12px] font-bold hover:bg-primary-container transition-colors"
          >
            탐색 →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { k: "cat", label: "직군", opts: JOB_CATEGORIES },
            { k: "career", label: "경력", opts: CAREERS },
            { k: "type", label: "고용형태", opts: EMPLOY_TYPES },
            { k: "major", label: "학과", opts: MAJORS },
            { k: "loc", label: "근무지", opts: LOCATIONS },
            { k: "tag", label: "태그", opts: allTags },
            { k: "dl", label: "마감 범위", opts: ["전체", "7일이내", "14일이내", "진행중"] },
          ].map(({ k, label, opts }) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">{label}</span>
              <select
                className="h-9 px-2 bg-surface-container-low rounded-lg text-[13px] text-on-surface cursor-pointer hover:bg-surface-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={(f as Record<string, unknown>)[k] as string}
                onChange={(e) => setParam({ [k]: e.target.value })}
              >
                {opts.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {/* 빠른 필터셋 — 프로토타입 프리셋 칩 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-secondary mr-0.5">빠른 필터셋:</span>
          {[
            { label: "오늘 마감", icon: "alarm", on: f.dl === "7일이내", go: () => setParam({ dl: f.dl === "7일이내" ? null : "7일이내" }) },
            { label: "진행 중 공고", icon: "event_available", on: f.dl === "진행중", go: () => setParam({ dl: f.dl === "진행중" ? null : "진행중" }) },
            { label: `내 직군(${profile.targetRole})`, icon: "target", on: f.cat === profile.targetRole, go: () => setParam({ cat: f.cat === profile.targetRole ? null : profile.targetRole }) },
            { label: "찜한 공고만 보기", icon: "bookmark", on: f.bm, go: () => setParam({ bm: f.bm ? null : "1" }) },
          ].map((p) => (
            <button
              key={p.label}
              onClick={p.go}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-colors border ${
                p.on
                  ? "bg-primary text-on-primary border-primary shadow-sm"
                  : "bg-surface-container-low text-secondary border-surface-container-high hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              <Icon name={p.icon} size={14} /> {p.label}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-outline font-mono pt-1 border-t border-surface-container">
          서버 측 필터링 · URL 쿼리 동기화 · 검색 결과는 상단 개수에 반영됩니다
        </p>
      </section>

      {/* 적용 필터 칩 + 초기화 (I-07 반영) */}
      {activeFilters.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl p-3 flex flex-wrap items-center gap-1.5 border border-surface-container shadow-sm">
          <span className="flex items-center gap-1 text-[11px] font-bold text-on-surface mr-1">
            <Icon name="filter_alt" size={16} className="text-primary" /> 적용된 필터
          </span>
          {activeFilters.map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest border border-surface-container text-[12px] shadow-sm">
              <span className="text-secondary text-[10px] font-bold">{FILTER_LABELS[k]}</span>
              <span className="font-semibold text-primary">{k === "bm" ? "찜한 공고" : String(v)}</span>
              <button className="w-4 h-4 rounded-full bg-surface-container text-secondary hover:bg-error-container hover:text-on-error-container flex items-center justify-center" onClick={() => setParam({ [k]: null })}>
                <Icon name="close" size={11} />
              </button>
            </span>
          ))}
          <button
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-secondary hover:text-error hover:bg-error-container/30 text-[12px] font-bold"
            onClick={() => router.replace("/")}
          >
            <Icon name="restart_alt" size={15} /> 초기화 ({activeFilters.length})
          </button>
        </section>
      )}

      {/* 결과 + 정렬 — 프로토타입 우측 정렬 컨트롤 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[13px] text-secondary font-semibold">
          {result ? (
            <>검색 결과 <b className="text-on-surface font-mono">{total}</b>건 · 정렬:</>
          ) : (
            "조회 중…"
          )}
        </p>
        <div className="flex items-center bg-surface-container-lowest rounded-xl p-1 shadow-sm border border-surface-container">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setParam({ sort: s.key })}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                f.sort === s.key ? "bg-primary text-on-primary shadow-sm" : "text-secondary hover:text-on-surface"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 그리드 */}
      {!result ? (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container-low rounded-xl h-56 animate-pulse" />
          ))}
        </section>
      ) : pageItems.length > 0 ? (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {pageItems.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </section>
      ) : (
        <section className="bg-surface-container-lowest rounded-xl border border-surface-container p-12 text-center flex flex-col items-center gap-3">
          <Icon name="search_off" size={40} className="text-outline" />
          <p className="font-headline text-[16px] font-bold text-on-surface">조건에 맞는 공고가 없습니다</p>
          <p className="text-[13px] text-secondary">필터를 완화하거나 초기화해 보세요.</p>
          <button
            onClick={() => router.replace("/")}
            className="px-4 h-9 rounded-lg bg-primary text-on-primary text-[13px] font-bold"
          >
            필터 초기화
          </button>
        </section>
      )}

      {/* 페이지네이션 */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setParam({ page: String(p) })}
              className={`w-9 h-9 rounded-lg text-[13px] font-bold font-mono transition-colors ${
                p === page ? "bg-primary text-on-primary" : "bg-surface-container-lowest text-secondary border border-surface-container hover:text-on-surface"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-secondary">로딩 중…</div>}>
      <ListingInner />
    </Suspense>
  );
}
