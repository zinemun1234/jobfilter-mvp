"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable, type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { JOBS } from "@/lib/seed";
import { KANBAN_STAGES, KanbanStage } from "@/lib/types";
import { useStore } from "@/lib/store";
import { DdayBadge, Icon } from "@/components/ui";
import { calcMatch, dday } from "@/lib/logic";

const STAGE_DOT: Record<KanbanStage, string> = {
  PREPARING: "bg-secondary",
  APPLIED: "bg-outline",
  DOC_PASSED: "bg-surface-tint",
  INTERVIEW: "bg-primary-container",
  ACCEPTED: "bg-primary",
  REJECTED: "bg-tertiary-container",
};

function KanbanCard({ jobId, history, memo }: { jobId: string; history: { status: KanbanStage; changedAt: string }[]; memo: string }) {
  const job = JOBS.find((j) => j.id === jobId);
  const { profile } = useStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: jobId });
  if (!job) return null;
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  const score = calcMatch(job, profile).total;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group relative bg-surface-container-lowest p-3.5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center font-bold text-primary text-[11px] shrink-0">
            {job.companyInitial}
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-on-surface truncate">{job.company}</h3>
            <p className="text-[11px] text-secondary truncate">{job.position}</p>
          </div>
        </div>
        <DdayBadge job={job} />
      </div>
      {memo && <p className="text-[11px] text-secondary mt-1.5 line-clamp-1">{memo}</p>}
      <div className="flex items-center justify-between my-1.5 pt-1">
        <span className="text-[10.5px] font-semibold text-secondary">CS 적합도</span>
        <span className="font-mono text-[12px] text-primary font-bold">{score}%</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {job.requiredSkills.slice(0, 2).map((s) => (
          <span key={s} className="text-[10.5px] font-semibold bg-surface-container-low text-primary-container px-2 py-0.5 rounded">{s}</span>
        ))}
      </div>
      {/* hover quick actions + StatusHistory */}
      <div className="pt-2 mt-2 border-t border-surface-container flex items-center justify-between">
        <Link
          href={`/cover-letter?job=${jobId}`}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
        >
          <Icon name="visibility" size={14} /> 자소서 보기
        </Link>
        <HistoryPopover history={history} />
      </div>
    </div>
  );
}

function HistoryPopover({ history }: { history: { status: KanbanStage; changedAt: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-secondary hover:text-primary flex items-center gap-0.5"
        title="상태 변경 이력"
      >
        <Icon name="history" size={15} />
        <span className="text-[10px] font-mono font-semibold">{history.length}</span>
      </button>
      {open && (
        <div className="absolute right-0 bottom-6 z-30 w-52 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg p-3">
          <div className="text-[10px] font-bold text-outline uppercase mb-1.5">상태 이력 (StatusHistory)</div>
          <div className="flex flex-col gap-1">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-on-surface">{KANBAN_STAGES.find((s) => s.key === h.status)?.label}</span>
                <span className="font-mono text-outline">
                  {new Date(h.changedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Column({ stage, children, count }: { stage: (typeof KANBAN_STAGES)[number]; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  return (
    <div
      ref={setNodeRef}
      className={`w-[260px] shrink-0 rounded-xl p-2.5 flex flex-col gap-2 transition-colors min-h-[200px] ${
        stage.active ? "bg-surface-container-low" : "bg-surface-container-low/60"
      } ${isOver ? "ring-2 ring-primary/40 bg-primary-fixed/40" : ""}`}
    >
      <div className="flex items-center justify-between px-1.5 py-1">
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${STAGE_DOT[stage.key]}`} />
          <h2 className="text-[13px] font-bold text-on-surface">{stage.label}</h2>
          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface">{count}</span>
        </div>
        <span className="text-secondary"><Icon name="more_horiz" size={18} /></span>
      </div>
      {children}
    </div>
  );
}

export default function KanbanPage() {
  const { applications, moveApplication, addApplication, removeApplication, profile } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dupMsg, setDupMsg] = useState("");
  const [query, setQuery] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byStage = useMemo(() => {
    const map: Record<KanbanStage, typeof applications> = {
      PREPARING: [], APPLIED: [], DOC_PASSED: [], INTERVIEW: [], ACCEPTED: [], REJECTED: [],
    };
    applications.forEach((a) => map[a.status].push(a));
    return map;
  }, [applications]);

  const q = query.trim().toLowerCase();
  const visible = (jobId: string) => {
    if (!q) return true;
    const j = JOBS.find((x) => x.id === jobId);
    return !!j && (j.company.toLowerCase().includes(q) || j.position.toLowerCase().includes(q));
  };

  const available = JOBS.filter((j) => !applications.some((a) => a.jobId === j.id) && dday(j) >= 0);
  const activeJob = activeId ? JOBS.find((j) => j.id === activeId) : null;

  const inProgress = applications.filter((a) => !["ACCEPTED", "REJECTED"].includes(a.status)).length;
  const urgentThisWeek = applications.filter((a) => {
    const j = JOBS.find((x) => x.id === a.jobId);
    return j && dday(j) >= 0 && dday(j) <= 7 && !["ACCEPTED", "REJECTED"].includes(a.status);
  }).length;
  const avgScore = applications.length
    ? Math.round(applications.reduce((s, a) => s + calcMatch(JOBS.find((j) => j.id === a.jobId)!, profile).total, 0) / applications.filter((a) => JOBS.some((j) => j.id === a.jobId)).length || 1)
    : 0;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const jobId = String(e.active.id);
    const over = e.over?.id;
    if (over && KANBAN_STAGES.some((s) => s.key === over)) {
      moveApplication(jobId, over as KanbanStage); // 상태 변경 → StatusHistory 기록 (TC-03)
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 헤더 배너 — 파이프라인 통계 */}
      <section className="bg-surface-container-low rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold bg-primary-container text-on-primary px-1.5 py-0.5 rounded">지원 파이프라인</span>
              <span className="font-mono text-[11px] text-secondary flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" /> 로컬 데모 · 실시간 반영
              </span>
            </div>
            <h1 className="font-headline text-[24px] font-bold text-on-surface">
              지원 현황 관리 보드 <span className="font-mono text-[17px] text-primary font-bold">(총 {applications.length}건)</span>
            </h1>
            <p className="text-[13px] text-on-surface-variant mt-0.5">서류 접수부터 최종 합격까지 채용 단계별 파이프라인을 한눈에 추적하세요.</p>
          </div>
          <div className="flex items-center gap-4 bg-surface-container-lowest px-4 py-3 rounded-xl shadow-sm">
            <div>
              <div className="text-[10px] font-semibold text-secondary uppercase">진행 중</div>
              <div className="font-mono text-[20px] font-bold text-on-surface">{inProgress}건</div>
            </div>
            <div className="w-px h-8 bg-surface-container-highest" />
            <div>
              <div className="text-[10px] font-semibold text-secondary uppercase">이번 주 마감</div>
              <div className={`font-mono text-[20px] font-bold ${urgentThisWeek ? "text-error" : "text-on-surface"}`}>
                {urgentThisWeek}건 {urgentThisWeek > 0 && <span className="text-[10px] bg-error-container/40 text-error px-1 rounded font-sans font-bold">주의</span>}
              </div>
            </div>
            <div className="w-px h-8 bg-surface-container-highest" />
            <div>
              <div className="text-[10px] font-semibold text-secondary uppercase">평균 CS 적합도</div>
              <div className="font-mono text-[20px] font-bold text-primary">{avgScore}%</div>
            </div>
          </div>
        </div>
        {/* 6단계 요약 바 */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-1.5">
          {KANBAN_STAGES.map((s) => (
            <div key={s.key} className="bg-surface-container-lowest px-3 py-1.5 rounded flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${STAGE_DOT[s.key]}`} />
                <span className="text-[11px] font-semibold text-on-surface">{s.label}</span>
              </div>
              <span className="font-mono text-[12px] font-bold text-secondary">{byStage[s.key].length}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 툴바 — 검색 + 추가 */}
      <section className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm border border-surface-container flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative min-w-[240px]">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface-container-low text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/15"
            placeholder="기업명 또는 포지션 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setAddOpen(!addOpen)}
          className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-primary-container text-on-primary hover:bg-primary text-[13px] font-bold shadow-sm transition-all active:scale-95"
        >
          <Icon name="add_circle" size={19} /> 새 지원 기업 추가하기
        </button>
      </section>

      {/* F-18 중복 지원 검사 + 지원 등록 */}
      {addOpen && (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-4 shadow-sm">
          <div className="text-[12px] font-bold text-on-surface mb-2">진행 중인 공고에서 추가 (미등록 공고 {available.length}건)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {available.map((j) => (
              <button
                key={j.id}
                onClick={() => {
                  const r = addApplication(j.id);
                  if (r.duplicate) setDupMsg(`${j.company} — 이미 등록된 공고입니다 (중복 지원 차단)`);
                  else { setDupMsg(""); setAddOpen(false); }
                  setTimeout(() => setDupMsg(""), 2500);
                }}
                className="text-left rounded-lg border border-surface-container p-3 hover:border-primary hover:bg-surface transition-colors"
              >
                <div className="text-[11px] font-bold text-secondary">{j.company}</div>
                <div className="text-[13px] font-bold text-on-surface line-clamp-1">{j.position}</div>
                <div className="mt-1"><DdayBadge job={j} /></div>
              </button>
            ))}
            {available.length === 0 && <p className="text-[12px] text-secondary">추가 가능한 공고가 없습니다.</p>}
          </div>
          {dupMsg && <p className="text-[12px] font-bold text-error mt-2">{dupMsg}</p>}
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3 items-start">
          {KANBAN_STAGES.map((stage) => (
            <Column key={stage.key} stage={stage} count={byStage[stage.key].filter((a) => visible(a.jobId)).length}>
              {byStage[stage.key].filter((a) => visible(a.jobId)).map((a) => (
                <div key={a.jobId} className="relative group/del">
                  <KanbanCard jobId={a.jobId} history={a.history} memo={a.memo} />
                  <button
                    onClick={() => removeApplication(a.jobId)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-on-error text-[10px] font-bold opacity-0 group-hover/del:opacity-100 transition-opacity flex items-center justify-center z-10"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
              {byStage[stage.key].filter((a) => visible(a.jobId)).length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-surface-container-high p-4 text-center text-[11px] text-outline">
                  카드를 여기로 드래그
                </div>
              )}
            </Column>
          ))}
        </div>
        <DragOverlay>
          {activeJob && (
            <div className="bg-surface-container-lowest rounded-xl border-2 border-primary p-3.5 shadow-xl w-[260px] rotate-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center font-bold text-primary text-[11px]">{activeJob.companyInitial}</div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-on-surface truncate">{activeJob.company}</div>
                  <div className="text-[11px] text-secondary truncate">{activeJob.position}</div>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {applications.length === 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-10 text-center flex flex-col items-center gap-2 shadow-sm">
          <Icon name="inbox" size={36} className="text-outline" />
          <p className="font-headline text-[15px] font-bold">등록된 지원이 없습니다</p>
          <p className="text-[12.5px] text-secondary">공고 상세에서 &lsquo;지원 관리에 등록&rsquo;을 누르거나 위 버튼으로 추가하세요.</p>
          <Link href="/" className="mt-1 px-4 h-9 rounded-lg bg-primary text-on-primary text-[13px] font-bold inline-flex items-center gap-1">
            공고 보러가기 <Icon name="arrow_forward" size={15} />
          </Link>
        </div>
      )}
    </div>
  );
}
