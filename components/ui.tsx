"use client";

import { dday, ddayColor, ddayLabel } from "@/lib/logic";
import { Job } from "@/lib/types";

export function Icon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>
      {name}
    </span>
  );
}

export function DdayBadge({ job }: { job: Job }) {
  const d = dday(job);
  const c = ddayColor(d);
  return (
    <span
      className="font-mono text-[11px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1"
      style={{ background: c.bg, color: c.fg }}
    >
      {d >= 0 && d <= 1 && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {ddayLabel(d)}
      {d >= 0 && d <= 3 ? " 긴급" : ""}
    </span>
  );
}

export function MatchRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 9) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 85 ? "#0d9668" : score >= 70 ? "#1d4fd8" : "#d97706";
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle className="stroke-surface-container-highest fill-none" cx={size / 2} cy={size / 2} r={r} strokeWidth="4.5" />
        <circle
          className="fill-none"
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute font-mono text-[13px] font-bold" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}

export function SkillTag({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <span
      className={`font-mono text-label-code px-1.5 py-1 rounded ${
        dim ? "bg-surface-container text-secondary font-medium" : "bg-secondary-container text-on-secondary-fixed font-semibold"
      }`}
    >
      {label}
    </span>
  );
}
