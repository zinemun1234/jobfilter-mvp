"use client";

import { useState } from "react";
import Link from "next/link";
import { Job } from "@/lib/types";
import { calcMatch, dday, jobDeadline, fmtDate } from "@/lib/logic";
import { useStore } from "@/lib/store";
import { DdayBadge, MatchRing, SkillTag, Icon } from "./ui";

const ACCENTS = ["#f59e0b", "#0d9668", "#2e7fd4", "#8b5cf6", "#e11d48", "#0891b2"];

export default function JobCard({ job }: { job: Job }) {
  const { profile, bookmarks, toggleBookmark } = useStore();
  const [copied, setCopied] = useState(false);
  const m = calcMatch(job, profile);
  const bookmarked = bookmarks.includes(job.id);
  const expired = dday(job) < 0;
  const accent = ACCENTS[(job.company.charCodeAt(0) + job.id.length) % ACCENTS.length];

  const share = () => {
    navigator.clipboard?.writeText(`${location.origin}/jobs/${job.id}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between relative group border border-surface-container overflow-hidden ${expired ? "opacity-60" : ""}`}
    >
      <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: accent }} />
      <div className="p-5 pb-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center font-headline text-[16px] font-bold shrink-0 shadow-sm" style={{ color: accent }}>
              {job.companyInitial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-headline text-[15px] font-bold text-on-surface">{job.company}</span>
                <span className="text-[11px] font-semibold bg-surface-container-high text-secondary px-1.5 py-0.5 rounded">
                  {job.location}
                </span>
              </div>
              <p className="text-[12px] text-secondary mt-0.5">
                {job.career} · {job.employType} · {job.category}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <DdayBadge job={job} />
            <span className="text-[11px] font-semibold text-secondary font-mono">
              {expired ? "마감됨" : `서류 마감: ${fmtDate(jobDeadline(job))}`}
            </span>
          </div>
        </div>

        <Link href={`/jobs/${job.id}`}>
          <h3 className="font-headline text-[17px] font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1 mt-1">
            {job.position}
          </h3>
          <p className="text-[13px] text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">{job.description}</p>
        </Link>

        <div className="bg-surface-container-low rounded-xl p-3 my-3 flex items-center gap-3">
          <MatchRing score={m.total} size={52} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${m.total >= 85 ? "bg-tertiary text-on-tertiary" : m.total >= 70 ? "bg-primary text-on-primary" : "bg-surface-container-high text-secondary"}`}>
                {m.total >= 85 ? "매우 적합" : m.total >= 70 ? "적합" : "보통"}
              </span>
              <span className="text-[11px] font-semibold text-secondary">프로필 대조</span>
            </div>
            <p className="text-[13px] text-on-surface font-medium mt-1">
              내 보유 역량 <span className="font-bold text-primary">{m.skills.matched.length} / {job.requiredSkills.length}개</span> 일치
            </p>
            {m.skills.missing.length > 0 && (
              <p className="text-[11px] font-semibold text-secondary truncate">
                부족: {m.skills.missing.slice(0, 2).join(", ")} <span className="text-tertiary">(학습 추천)</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {job.requiredSkills.slice(0, 6).map((s) => (
            <SkillTag key={s} label={s} dim={!m.skills.matched.includes(s)} />
          ))}
        </div>
        <p className="text-[11px] text-outline font-mono mt-2">{job.salary}</p>
      </div>

      <div className="m-5 mt-3 pt-3 border-t border-surface-container flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleBookmark(job.id)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              bookmarked ? "text-primary bg-primary-fixed" : "text-secondary hover:text-primary hover:bg-surface-container-low"
            }`}
            title={bookmarked ? "스크랩 해제" : "공고 스크랩 (F-13)"}
          >
            <Icon name={bookmarked ? "bookmark_added" : "bookmark"} size={20} />
          </button>
          <button
            onClick={share}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container-low transition-all"
            title="링크 복사"
          >
            <Icon name={copied ? "check" : "share"} size={19} />
          </button>
        </div>
        <Link
          href={`/jobs/${job.id}`}
          className="px-4 h-9 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-[13px] font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-[0.98]"
        >
          <span>상세 요강 &amp; 지원</span>
          <Icon name="arrow_forward" size={16} />
        </Link>
      </div>
    </div>
  );
}
