"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JOBS, SKILL_POOL, JOB_CATEGORIES } from "@/lib/seed";
import { calcMatch, dday, ddayLabel, jobDeadline, jobCreatedAt, fmtDate } from "@/lib/logic";
import { useStore } from "@/lib/store";
import { DdayBadge, SkillTag, Icon } from "@/components/ui";
import { KANBAN_STAGES } from "@/lib/types";

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const job = JOBS.find((j) => j.id === id);
  const { profile, setProfile, bookmarks, toggleBookmark, addApplication, getApplication } = useStore();
  const [skillOpen, setSkillOpen] = useState(false);
  const [toast, setToast] = useState("");

  if (!job) notFound();
  const m = calcMatch(job, profile);
  const app = getApplication(job.id);
  const expired = dday(job) < 0;
  const d = dday(job);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const apply = () => {
    const r = addApplication(job.id);
    if (r.duplicate) showToast("이미 지원 관리 중인 공고입니다 (중복 지원 차단 — F-18)");
    else if (r.ok) showToast("칸반 '서류 준비 중'에 등록되었습니다");
  };

  const share = () => {
    navigator.clipboard?.writeText(location.href).catch(() => {});
    showToast("공고 링크가 클립보드에 복사되었습니다");
  };

  const toggleSkill = (s: string) =>
    setProfile({
      ...profile,
      skills: profile.skills.includes(s) ? profile.skills.filter((x) => x !== s) : [...profile.skills, s],
    });

  const FACTORS = [
    { label: "기술 스택 일치율", s: m.skills.score, max: m.skills.max, note: `${m.skills.matched.length}/${job.requiredSkills.length}개 일치` },
    { label: "희망 직무 일치", s: m.targetRole.score, max: m.targetRole.max, note: m.targetRole.ok ? `희망 직군(${profile.targetRole}) 일치` : `희망 ${profile.targetRole} ≠ ${job.category}` },
    { label: "경력 조건", s: m.career.score, max: m.career.max, note: m.career.ok ? `${job.career} — 조건 충족` : `${job.career} 요구` },
    { label: "마감 임박도", s: m.deadline.score, max: m.deadline.max, note: expired ? "마감된 공고" : `${ddayLabel(d)} 마감` },
    { label: "전공·카테고리 일치", s: m.major.score, max: m.major.max, note: m.major.ok ? "컴퓨터공학 관련 공고" : "타 전공 공고" },
  ];

  const stageLabel = app ? KANBAN_STAGES.find((s) => s.key === app.status)?.label : null;

  return (
    <div className="flex flex-col gap-5 pb-20">
      {/* 브레드크럼 + 메타 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[12px] text-on-surface-variant min-w-0">
          <Link href="/" className="flex items-center gap-1 hover:text-primary font-semibold transition-colors">
            <Icon name="arrow_back" size={16} /> 공고 목록으로 돌아가기
          </Link>
          <span className="text-outline-variant">/</span>
          <span>맞춤 공고</span>
          <span className="text-outline-variant">/</span>
          <span>{job.company}</span>
          <span className="text-outline-variant">/</span>
          <span className="text-on-surface font-semibold truncate max-w-[280px]">{job.position}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg">
            공고 번호 #JF-{job.id.toUpperCase()}
          </span>
          {!expired && (
            <span className="flex items-center gap-1 text-[11px] text-on-surface-variant font-mono">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" /> 키워드 매칭 분석됨
            </span>
          )}
        </div>
      </div>

      {/* 히어로 카드 — 그라데이션 상단 액센트 */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-primary-container to-tertiary" />
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-16 h-16 rounded-xl bg-surface-container-low flex items-center justify-center text-primary font-headline text-[24px] font-bold shrink-0 shadow-sm">
              {job.companyInitial}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-headline text-[16px] font-bold text-on-surface">{job.company}</span>
                <Icon name="verified" size={18} className="text-primary" />
                <span className="text-[11px] font-semibold bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded">{job.location}</span>
                <span className="text-[11px] font-semibold bg-primary-fixed text-on-primary-fixed px-1.5 py-0.5 rounded">{job.category}</span>
                {expired && <span className="text-[11px] font-bold bg-surface-container text-secondary px-1.5 py-0.5 rounded">마감된 공고</span>}
              </div>
              <h1 className="font-headline text-[22px] font-bold text-on-surface mt-1.5 leading-snug tracking-tight">{job.position}</h1>
              <p className="text-[12.5px] text-secondary mt-1.5">
                {job.career} · {job.employType} · 등록 {fmtDate(jobCreatedAt(job))} · 마감 {fmtDate(jobDeadline(job))}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <button
              onClick={() => toggleBookmark(job.id)}
              className={`h-11 px-4 rounded-xl text-[13px] font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                bookmarks.includes(job.id)
                  ? "bg-primary-fixed text-on-primary-fixed"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <Icon name={bookmarks.includes(job.id) ? "bookmark_added" : "bookmark"} size={18} />
              {bookmarks.includes(job.id) ? "스크랩 완료" : "공고 스크랩"}
            </button>
            <button
              onClick={share}
              className="h-11 w-11 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface flex items-center justify-center transition-colors shadow-sm"
              title="공유 및 링크 복사"
            >
              <Icon name="share" size={18} />
            </button>
            <Link
              href={`/cover-letter?job=${job.id}`}
              className="h-11 px-4 rounded-xl bg-secondary-container text-on-secondary-container hover:bg-primary-fixed hover:text-on-primary-fixed text-[13px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Icon name="auto_fix_high" size={18} /> 자소서 코칭
            </Link>
            {app ? (
              <Link
                href="/kanban"
                className="h-11 px-5 rounded-xl bg-tertiary-container text-on-tertiary text-[13px] font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Icon name="view_kanban" size={18} /> {stageLabel}
              </Link>
            ) : (
              <button
                onClick={apply}
                disabled={expired}
                className="h-11 px-5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-[13px] font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                지원 관리에 등록 <Icon name="arrow_forward" size={17} />
              </button>
            )}
          </div>
        </div>

        {/* 4개 핵심 지표 타일 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4 bg-surface-container-low/60 rounded-xl">
          <div className="bg-surface-container-lowest p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-outline flex items-center gap-1"><Icon name="event" size={15} />서류 마감일</span>
              <DdayBadge job={job} />
            </div>
            <p className="font-headline text-[15px] font-bold text-on-surface">{fmtDate(jobDeadline(job))}</p>
            <p className="font-mono text-[11px] text-outline mt-0.5">{expired ? "모집 종료" : `마감 ${ddayLabel(d)}`}</p>
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-outline flex items-center gap-1"><Icon name="payments" size={15} />예상 처우</span>
              <span className="text-[10px] font-bold bg-tertiary-container text-on-tertiary px-2 py-0.5 rounded-full">공고 기준</span>
            </div>
            <p className="font-headline text-[15px] font-bold text-on-surface">{job.salary}</p>
            <p className="font-mono text-[11px] text-outline mt-0.5">{job.employType} · {job.career}</p>
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-outline flex items-center gap-1"><Icon name="location_on" size={15} />근무지 및 형태</span>
            </div>
            <p className="font-headline text-[15px] font-bold text-on-surface">{job.location}</p>
            <p className="font-mono text-[11px] text-outline mt-0.5">{job.tags.slice(0, 2).join(" · ") || job.category}</p>
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-outline flex items-center gap-1"><Icon name="account_tree" size={15} />채용 전형 절차</span>
              <span className="text-[10px] font-bold bg-surface-container text-secondary px-2 py-0.5 rounded-full">공고 참고</span>
            </div>
            <p className="font-headline text-[14px] font-bold text-on-surface">서류 &gt; 코테 &gt; 면접 &gt; 최종</p>
            <p className="font-mono text-[11px] text-outline mt-0.5">지원 후 칸반에서 단계 추적</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* 좌: 공고 본문 */}
        <section className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-headline text-[17px] font-bold flex items-center gap-1.5 text-on-surface">
                <Icon name="description" size={19} className="text-primary" /> 공고 요약
              </h2>
              <span className="text-[11px] font-semibold bg-surface-container text-on-surface px-2 py-1 rounded">{job.category} 직군</span>
            </div>
            <p className="text-[14px] text-on-surface-variant leading-relaxed">{job.description}</p>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
            <h2 className="font-headline text-[17px] font-bold mb-3 flex items-center gap-1.5 text-on-surface">
              <Icon name="checklist" size={19} className="text-primary" /> 자격 요건
            </h2>
            <ul className="flex flex-col gap-2">
              {job.requirements.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[13.5px] text-on-surface-variant">
                  <Icon name="check_circle" size={17} className="text-tertiary mt-0.5 shrink-0" /> {r}
                </li>
              ))}
            </ul>
            <h3 className="font-headline text-[14px] font-bold mt-5 mb-2 text-secondary">우대 사항</h3>
            <ul className="flex flex-col gap-2">
              {job.preferred.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[13.5px] text-on-surface-variant">
                  <Icon name="add_circle" size={17} className="text-outline mt-0.5 shrink-0" /> {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
            <h2 className="font-headline text-[17px] font-bold mb-3 flex items-center gap-1.5 text-on-surface">
              <Icon name="code" size={19} className="text-primary" /> 요구 기술 스택
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {job.requiredSkills.map((s) => (
                <SkillTag key={s} label={s} dim={!m.skills.matched.includes(s)} />
              ))}
            </div>
            <p className="text-[11px] text-secondary mt-3 flex items-center gap-1">
              <Icon name="info" size={15} className="text-primary" />
              진한 태그 = 내 프로필 보유 스킬 · 흐린 태그 = 미보유 (학습 추천)
            </p>
          </div>
        </section>

        {/* 우: 적합도 분석 + 프로필 + 액션 — sticky */}
        <aside className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-20">
          {/* 매칭 비교 카드 */}
          <div className="bg-surface-container-lowest rounded-xl shadow-md p-5">
            <div className="flex items-start justify-between gap-2 mb-4 pb-3 border-b border-surface-container">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon name="bolt" size={18} className="text-primary" />
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">프로필 기반 적합도 분석</span>
                </div>
                <h3 className="font-headline text-[18px] font-bold text-on-surface">내 스펙 vs 요구역량 비교</h3>
                <p className="text-[12px] text-on-surface-variant">데모 프로필 기준 · 5요소 100점 화이트박스 채점</p>
              </div>
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle className="text-surface-container" cx="32" cy="32" fill="none" r="26" stroke="currentColor" strokeWidth="5" />
                  <circle
                    cx="32" cy="32" fill="none" r="26"
                    stroke={m.total >= 85 ? "#0d9668" : m.total >= 70 ? "#1d4fd8" : "#d97706"}
                    strokeDasharray={163.36}
                    strokeDashoffset={163.36 * (1 - m.total / 100)}
                    strokeLinecap="round" strokeWidth="5"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-[13px] font-bold text-on-surface">{m.total}%</span>
                  <span className={`text-[9px] font-bold uppercase leading-none ${m.total >= 85 ? "text-tertiary" : m.total >= 70 ? "text-primary" : "text-amber-600"}`}>
                    {m.total >= 85 ? "HIGH" : m.total >= 70 ? "GOOD" : "LOW"}
                  </span>
                </div>
              </div>
            </div>

            {/* 스킬 diff 체크리스트 */}
            <div className="flex flex-col gap-2 mb-4">
              {job.requiredSkills.map((s) => {
                const ok = m.skills.matched.includes(s);
                return (
                  <div key={s} className="p-2.5 rounded-lg bg-surface-container-low flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${ok ? "bg-tertiary-container text-on-tertiary" : "bg-surface-container-highest text-secondary"}`}>
                      <Icon name={ok ? "done" : "remove"} size={14} />
                    </div>
                    <div className="w-full flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-on-surface font-mono">{s}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ok ? "bg-tertiary-container text-on-tertiary" : "bg-surface-container-high text-secondary"}`}>
                        {ok ? "일치/충족" : "미보유"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5요소 산출식 공개 */}
            <div className="flex flex-col gap-2.5 pt-3 border-t border-surface-container">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">점수 산출 근거 (5요소)</span>
              {FACTORS.map((x) => (
                <div key={x.label}>
                  <div className="flex items-center justify-between text-[12px] mb-0.5">
                    <span className="font-semibold text-on-surface">{x.label}</span>
                    <span className="font-mono font-bold text-primary">{x.s}/{x.max}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                    <div className="h-full bg-primary-container rounded-full" style={{ width: `${(x.s / x.max) * 100}%` }} />
                  </div>
                  <p className="text-[10.5px] text-secondary mt-0.5">{x.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* F-27 축소판 — 내 스킬·희망직무 */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-headline text-[15px] font-bold flex items-center gap-1.5 text-on-surface">
                <Icon name="tune" size={18} className="text-tertiary" /> 내 프로필 기준
              </h2>
              <button onClick={() => setSkillOpen(!skillOpen)} className="text-[11px] font-bold text-primary hover:underline">
                {skillOpen ? "접기" : "수정"}
              </button>
            </div>
            <p className="text-[12px] text-secondary mb-2">
              희망 직군 <b className="text-on-surface">{profile.targetRole}</b> · 경력 <b className="text-on-surface">{profile.career}</b>
            </p>
            <div className="flex flex-wrap gap-1">
              {profile.skills.map((s) => (
                <SkillTag key={s} label={s} />
              ))}
            </div>
            {skillOpen && (
              <div className="mt-3 pt-3 border-t border-surface-container flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] font-bold text-secondary uppercase mb-1">희망 직군</div>
                    <select
                      className="w-full h-8 px-2 rounded-lg bg-surface-container-low text-[12px]"
                      value={profile.targetRole}
                      onChange={(e) => setProfile({ ...profile, targetRole: e.target.value })}
                    >
                      {JOB_CATEGORIES.filter((c) => c !== "전체").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-secondary uppercase mb-1">경력</div>
                    <select
                      className="w-full h-8 px-2 rounded-lg bg-surface-container-low text-[12px]"
                      value={profile.career}
                      onChange={(e) => setProfile({ ...profile, career: e.target.value })}
                    >
                      {["신입", "경력무관", "인턴"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-secondary uppercase mb-1">보유 기술 (클릭 토글)</div>
                  <div className="flex flex-wrap gap-1">
                    {SKILL_POOL.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleSkill(s)}
                        className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                          profile.skills.includes(s) ? "bg-secondary-container text-on-secondary-fixed" : "bg-surface-container-low text-outline hover:text-on-surface"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 하단 고정 CTA 바 — 프로토타입 sticky bottom bar */}
      <div className="fixed bottom-0 left-0 lg:left-[260px] right-0 bg-surface/90 backdrop-blur-md px-4 md:px-8 py-3 shadow-[0_-4px_20px_rgba(11,28,48,0.08)] z-30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:block min-w-0">
            <p className="font-headline text-[14px] font-bold text-on-surface truncate">{job.company} — {job.position}</p>
            <p className={`font-mono text-[11px] font-semibold ${expired ? "text-secondary" : "text-error"}`}>
              {expired ? "모집 마감된 공고입니다" : `서류 마감까지 ${ddayLabel(d)} (${fmtDate(jobDeadline(job))})`}
            </p>
          </div>
          <span className="text-[11px] font-bold bg-tertiary-container text-on-tertiary px-2 py-0.5 rounded shrink-0">내 적합도 {m.total}%</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toggleBookmark(job.id)}
            className={`hidden md:flex items-center gap-1 px-4 h-10 rounded-xl text-[13px] font-semibold transition-colors ${
              bookmarks.includes(job.id) ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <Icon name={bookmarks.includes(job.id) ? "bookmark_added" : "bookmark"} size={17} /> 스크랩
          </button>
          <Link
            href={`/cover-letter?job=${job.id}`}
            className="flex items-center gap-1 px-4 h-10 rounded-xl bg-secondary-container text-on-secondary-container hover:bg-primary-fixed hover:text-on-primary-fixed text-[13px] font-semibold transition-colors"
          >
            <Icon name="edit_note" size={17} /> 자소서 코칭
          </Link>
          {app ? (
            <Link href="/kanban" className="flex items-center gap-1 px-5 h-10 rounded-xl bg-tertiary-container text-on-tertiary text-[13px] font-bold shadow-md">
              {stageLabel} <Icon name="arrow_forward" size={16} />
            </Link>
          ) : (
            <button
              onClick={apply}
              disabled={expired}
              className="flex items-center gap-1 px-5 h-10 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-[13px] font-bold transition-all shadow-md disabled:opacity-50"
            >
              바로 지원하기 <Icon name="arrow_forward" size={16} />
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 lg:left-auto lg:right-8 lg:translate-x-0 bg-inverse-surface text-inverse-on-surface px-5 py-2.5 rounded-xl text-[13px] font-semibold shadow-xl z-50 flex items-center gap-2">
          <Icon name="check_circle" size={18} className="text-tertiary-fixed" /> {toast}
        </div>
      )}
    </div>
  );
}
