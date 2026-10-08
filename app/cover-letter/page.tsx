"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { JOBS, WRITE_GUIDES, JOB_CATEGORIES } from "@/lib/seed";
import { analyzeCoverLetter, heatLevel } from "@/lib/logic";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/ui";
import { CoverLetter, CoverLetterItem, RUBRIC } from "@/lib/types";

const uid = () => Math.random().toString(36).slice(2, 9);

const QUESTION_PRESETS = [
  "지원 동기와 입사 후 이루고 싶은 목표를 서술하시오. (800자 이내)",
  "본인의 직무 역량과 관련된 프로젝트·경험을 서술하시오. (1000자 이내)",
  "협업 과정에서 갈등을 해결했던 경험을 서술하시오. (800자 이내)",
  "성장 과정 중 가장 도전적이었던 경험을 서술하시오. (800자 이내)",
];

function CoachInner() {
  const params = useSearchParams();
  const { coverLetters, saveCoverLetter } = useStore();

  const [jobId, setJobId] = useState<string>(params.get("job") ?? JOBS[0].id);
  const [role, setRole] = useState<string>("백엔드");
  const [title, setTitle] = useState("자기소개서 초안");
  const [items, setItems] = useState<CoverLetterItem[]>([
    { question: QUESTION_PRESETS[1], content: "" },
  ]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [toast, setToast] = useState("");
  const [analysis, setAnalysis] = useState<CoverLetter["analysis"]>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const job = JOBS.find((j) => j.id === jobId) ?? null;
  const guide = WRITE_GUIDES[role] ?? WRITE_GUIDES["공통"];
  const fullText = useMemo(() => items.map((i) => i.content).join("\n\n"), [items]);
  const item = items[Math.min(activeIdx, items.length - 1)];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  const updateItem = (patch: Partial<CoverLetterItem>) =>
    setItems((arr) => arr.map((it, i) => (i === activeIdx ? { ...it, ...patch } : it)));

  const insertFrame = () => {
    setItems((arr) => arr.map((it, i) => (i === activeIdx ? { ...it, content: it.content ? it.content + "\n" + guide.frame : guide.frame } : it)));
    showToast("문장 프레임이 본문에 삽입되었습니다");
  };

  const insertSnippet = (snip: string) =>
    setItems((arr) => arr.map((it, i) => (i === activeIdx ? { ...it, content: it.content + snip } : it)));

  const runAnalysis = () => {
    setAnalyzing(true);
    // 규칙 기반 분석 — 로딩 체감을 위해 약간의 지연 후 결과 반영 (LLM 아님)
    setTimeout(() => {
      const result = analyzeCoverLetter(fullText, job);
      setAnalysis(result);
      setAnalyzing(false);
    }, 350);
  };

  const save = () => {
    const existing = coverLetters.find((c) => c.title === title);
    const version = (existing?.version ?? 0) + 1; // F-15 버전 이력
    saveCoverLetter({
      id: existing?.id ?? uid(),
      jobId,
      title,
      role,
      items,
      analysis,
      updatedAt: new Date().toISOString(),
      version,
    });
    showToast(`저장됨 — 버전 ${version}`);
  };

  const loadCoverLetter = (id: string) => {
    const c = coverLetters.find((x) => x.id === id);
    if (!c) return;
    setTitle(c.title);
    setRole(c.role);
    setItems(c.items);
    setAnalysis(c.analysis);
    setActiveIdx(0);
    if (c.jobId) setJobId(c.jobId);
    setHistoryOpen(false);
    showToast(`${c.title} (v${c.version}) 불러옴`);
  };

  const copyText = () => {
    navigator.clipboard?.writeText(fullText).catch(() => {});
    showToast("자소서 본문이 클립보드에 복사되었습니다");
  };

  const downloadTxt = () => {
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${job?.company ?? "자소서"}_자기소개서.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("TXT 파일로 내려받았습니다");
  };

  const removed = (idx: number) => {
    setItems((a) => a.filter((_, i) => i !== idx));
    setActiveIdx((i) => Math.max(0, Math.min(i, items.length - 2)));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 상단 컨텍스트 바 — 브레드크럼 + 자동저장 + 액션 */}
      <header className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border border-surface-container">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap min-w-0">
          <div className="flex items-center gap-1 text-on-surface-variant text-[13px] min-w-0">
            <span className="flex items-center gap-1 text-primary font-semibold shrink-0">
              <Icon name="auto_fix_high" size={18} /> 자기소개서 코칭
            </span>
            <Icon name="chevron_right" size={16} className="text-outline" />
            <span className="font-headline text-[15px] font-semibold text-on-surface truncate">
              [{job?.company}] {job?.position}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-primary text-[11px] font-semibold w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
            타겟 공고: {job?.company} {job?.category}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-on-surface-variant font-mono text-[11px] bg-surface-container-low px-3 py-1.5 rounded-lg">
            <Icon name="cloud_done" size={16} className="text-tertiary" />
            로컬 자동 저장
            <span className="text-outline">|</span>
            <span className="text-on-surface font-bold">{fullText.length}자</span>
          </span>
          <div className="relative">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors text-[13px] font-semibold"
            >
              <Icon name="history" size={17} /> 이전 버전
            </button>
            {historyOpen && (
              <div className="absolute right-0 top-9 z-30 w-64 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg p-2">
                {coverLetters.length === 0 && <p className="text-[12px] text-secondary p-2">저장된 버전이 없습니다.</p>}
                {coverLetters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => loadCoverLetter(c.id)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-surface-container-low text-[12px] flex items-center justify-between"
                  >
                    <span className="font-semibold text-on-surface truncate">{c.title}</span>
                    <span className="font-mono text-primary font-bold shrink-0 ml-2">v{c.version}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={save}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors text-[13px] font-semibold"
          >
            <Icon name="save" size={17} /> 저장
          </button>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm text-[13px] font-bold active:scale-[0.98] disabled:opacity-60"
          >
            <Icon name="bolt" size={17} /> {analyzing ? "분석 중…" : "실시간 진단 실행"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* 좌: 에디터 워크스페이스 */}
        <section className="lg:col-span-6 flex flex-col gap-4">
          {/* 문항 탭 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {items.map((it, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap font-headline text-[13px] transition-all ${
                  idx === activeIdx
                    ? "bg-surface-container-lowest shadow-sm text-primary font-bold border border-primary-fixed-dim"
                    : "bg-surface-container text-secondary hover:text-on-surface"
                }`}
              >
                <span>{idx + 1}. {QUESTION_PRESETS.includes(it.question) ? it.question.split(".")[0].slice(0, 14) : "직접 입력 문항"}</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${idx === activeIdx ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container-high text-secondary"}`}>
                  {it.content.length}자
                </span>
              </button>
            ))}
            <button
              onClick={() => { setItems((a) => [...a, { question: QUESTION_PRESETS[0], content: "" }]); setActiveIdx(items.length); }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-secondary hover:text-primary text-[12px] font-bold whitespace-nowrap"
            >
              <Icon name="add" size={16} /> 문항 추가
            </button>
          </div>

          {/* 에디터 카드 */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4 border border-surface-container">
            {/* 문항 헤더 */}
            <div className="bg-surface-container-low p-4 rounded-xl flex items-start gap-2.5">
              <Icon name="help" size={20} className="text-primary-container mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">자소서 문항 {activeIdx + 1}</span>
                  {items.length > 1 && (
                    <button onClick={() => removed(activeIdx)} className="text-secondary hover:text-error text-[11px] font-bold flex items-center gap-0.5">
                      <Icon name="delete" size={14} /> 삭제
                    </button>
                  )}
                </div>
                <select
                  className="mt-1 w-full bg-transparent text-[13.5px] text-on-surface font-semibold focus:outline-none"
                  value={QUESTION_PRESETS.includes(item.question) ? item.question : "custom"}
                  onChange={(e) => e.target.value !== "custom" && updateItem({ question: e.target.value })}
                >
                  {QUESTION_PRESETS.map((q) => <option key={q} value={q}>{q}</option>)}
                  {!QUESTION_PRESETS.includes(item.question) && <option value="custom">직접 입력 문항</option>}
                </select>
              </div>
            </div>

            {/* 하이라이트 범례 */}
            <div className="flex items-center gap-4 text-[11.5px] overflow-x-auto">
              <span className="text-outline font-semibold shrink-0">실시간 피드백 하이라이트:</span>
              <span className="inline-flex items-center gap-1 shrink-0"><span className="w-2.5 h-2.5 rounded bg-tertiary-container inline-block" /><span className="text-tertiary font-medium">강점 기술 키워드</span></span>
              <span className="inline-flex items-center gap-1 shrink-0"><span className="w-2.5 h-2.5 rounded bg-primary-container inline-block" /><span className="text-primary font-medium">직무 요구 일치</span></span>
              <span className="inline-flex items-center gap-1 shrink-0"><span className="w-2.5 h-2.5 rounded bg-secondary-fixed inline-block" /><span className="text-secondary font-medium">문장 다듬기 제안</span></span>
            </div>

            {/* 간단 서식 툴바 — 실제 마커 삽입 */}
            <div className="flex items-center justify-between bg-surface-container-low px-2 py-1.5 rounded-lg">
              <div className="flex items-center gap-0.5">
                <button onClick={() => insertSnippet("**강조**")} className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors" title="강조 삽입">
                  <Icon name="format_bold" size={17} />
                </button>
                <button onClick={() => insertSnippet("\n• ")} className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors" title="목록 항목">
                  <Icon name="format_list_bulleted" size={17} />
                </button>
                <button onClick={() => insertSnippet("\n> ")} className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors" title="인용">
                  <Icon name="format_quote" size={17} />
                </button>
                <button onClick={() => updateItem({ content: "" })} className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors" title="본문 초기화">
                  <Icon name="format_clear" size={17} />
                </button>
              </div>
              <span className="text-[10px] font-mono text-outline hidden sm:block">서식 마커 삽입</span>
            </div>

            <textarea
              className="w-full min-h-[340px] p-4 rounded-xl bg-surface text-[14.5px] leading-relaxed text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 resize-y shadow-inner"
              placeholder="자기소개서 본문을 직접 작성하세요. 무의미한 입력(자음 반복 등)은 분석이 차단됩니다."
              value={item.content}
              onChange={(e) => updateItem({ content: e.target.value })}
            />

            {/* 하단 정보 바 */}
            <div className="flex items-center justify-between pt-1 text-[12px] text-on-surface-variant flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-tertiary font-medium">
                  <Icon name="verified" size={17} /> 규칙 분석 연동
                </span>
                <span className="text-outline">|</span>
                <span className="font-mono"><b className="text-on-surface">{item.content.length}</b>자 (공백 포함)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={copyText} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors text-[12px] font-semibold">
                  <Icon name="content_copy" size={14} /> 복사하기
                </button>
                <button onClick={downloadTxt} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors text-[12px] font-semibold">
                  <Icon name="download" size={14} /> TXT 내려받기
                </button>
              </div>
            </div>
          </div>

          {/* 분석 대상 공고 선택 */}
          <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">분석 대상 공고 (키워드 기준)</span>
              <select
                className="h-10 px-2 rounded-lg bg-surface-container-low text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
              >
                {JOBS.map((j) => (
                  <option key={j.id} value={j.id}>{j.company} — {j.position.slice(0, 28)}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">직군 (가이드 기준)</span>
              <select
                className="h-10 px-2 rounded-lg bg-surface-container-low text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {JOB_CATEGORIES.filter((c) => c !== "전체").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* 우: 분석 패널 */}
        <aside className="lg:col-span-6 flex flex-col gap-4">
          {/* 종합 진단 카드 */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4 border border-surface-container">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon name="analytics" size={20} className="text-primary" />
                <span className="font-headline text-[17px] font-bold text-on-surface">자기소개서 종합 진단</span>
              </div>
              {analysis?.status === "OK" && (
                <span className="text-[10px] font-bold bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> 키워드 매칭 진단 완료
                </span>
              )}
            </div>

            {!analysis && (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <Icon name="pending_actions" size={36} className="text-outline" />
                <p className="text-[13px] text-secondary">본문을 작성하고 <b>실시간 진단 실행</b>을 눌러 주세요.</p>
                <p className="text-[11px] text-outline">무의미한 입력(자음·모음 반복 등)은 자동 차단됩니다</p>
              </div>
            )}

            {analysis?.status === "UNANALYZABLE" && (
              <div className="rounded-xl bg-error-container/50 border border-error-container p-4">
                <div className="flex items-center gap-1.5 text-error font-bold text-[14px] mb-1">
                  <Icon name="block" size={18} /> 분석 불가
                </div>
                <p className="text-[13px] text-on-error-container leading-relaxed">{analysis.reason}</p>
                <p className="text-[11px] text-on-error-container/70 mt-2">
                  의미 없는 텍스트는 사전 차단됩니다 — 점수 어뷰징 방지 (지도교수 피드백 반영)
                </p>
              </div>
            )}

            {analysis?.status === "OK" && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 bg-surface-container-low rounded-xl">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="#e6edf9" strokeWidth="10" />
                      <circle
                        cx="60" cy="60" r="50" fill="transparent"
                        stroke="#2e7fd4" strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={314.159}
                        strokeDashoffset={314.159 * (1 - analysis.total / 100)}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="font-mono text-[24px] font-bold">{analysis.total}</span>
                      <span className="font-mono text-[10px] text-outline font-semibold">/ 100점</span>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-7 flex flex-col gap-2">
                  {analysis.criteria.slice(0, 4).map((c) => (
                    <div key={c.key}>
                      <div className="flex justify-between text-[12px] mb-0.5">
                        <span className="font-semibold text-on-surface">{c.label} ({c.weight}점)</span>
                        <span className="font-mono font-bold text-primary">{c.score}/{c.weight}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-container overflow-hidden">
                        <div className="h-full bg-primary-container rounded-full" style={{ width: `${(c.score / c.weight) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* F-66 직군별 작성 가이드 */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-3 border border-surface-container border-l-4 border-l-tertiary-container">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Icon name="menu_book" size={19} className="text-tertiary" />
                <span className="font-headline text-[15px] font-bold text-on-surface">직군별 작성 가이드</span>
                <span className="text-[10px] font-bold bg-tertiary-fixed text-on-tertiary-fixed px-1.5 py-0.5 rounded-full">가이드만 제공 · 직접 작성</span>
              </div>
              <span className="font-mono text-[11px] text-outline">문항 {activeIdx + 1} · {role}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-container-low">
              <div className="text-[11px] font-bold text-primary flex items-center gap-1 mb-1">
                <Icon name="frame_source" size={14} /> {role} · 문장 프레임 (빈칸 채우기형)
              </div>
              <p className="text-[13px] text-on-surface leading-relaxed">&ldquo;{guide.frame}&rdquo;</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-bold text-outline uppercase">이 문항에서 확인할 것</div>
              {guide.checks.map((c) => (
                <div key={c} className="flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">
                  <Icon name="radio_button_unchecked" size={15} className="text-secondary" /> {c}
                </div>
              ))}
            </div>
            <button
              onClick={insertFrame}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors text-[13px] font-semibold"
            >
              <Icon name="input" size={16} /> 문장 프레임 본문에 삽입
            </button>
          </div>

          {/* F-28 배점표 — 분석 전에도 가중치 공개 */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-3 border border-surface-container">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon name="grading" size={18} className="text-primary" />
                <span className="font-headline text-[15px] font-bold text-on-surface">평가 기준별 정밀 피드백 배점표</span>
              </div>
              <span className="font-mono text-[11px] text-outline">7개 항목 · 100점 만점</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="bg-surface-container-low text-on-surface-variant text-[10.5px] uppercase font-bold">
                  <tr>
                    <th className="py-2.5 px-2 rounded-l-lg">평가 항목</th>
                    <th className="py-2.5 px-1 text-center">가중치</th>
                    <th className="py-2.5 px-1 text-center">점수</th>
                    <th className="py-2.5 px-2 rounded-r-lg">정밀 진단 및 개선 권고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {RUBRIC.map((r) => {
                    const c = analysis?.status === "OK" ? analysis.criteria.find((x) => x.key === r.key) : null;
                    return (
                      <tr key={r.key} className="hover:bg-surface transition-colors align-top">
                        <td className="py-2 px-2 font-semibold text-on-surface whitespace-nowrap">{r.label}</td>
                        <td className="py-2 px-1 text-center font-mono text-outline">{r.weight}점</td>
                        <td className="py-2 px-1 text-center">
                          {c ? (
                            <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[11px] ${c.score / c.weight >= 0.7 ? "bg-tertiary-fixed text-on-tertiary-fixed" : c.score / c.weight >= 0.4 ? "bg-primary-fixed text-on-primary-fixed" : "bg-error-container text-on-error-container"}`}>
                              {c.score}점
                            </span>
                          ) : (
                            <span className="font-mono text-outline text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-on-surface-variant leading-relaxed">{c ? c.feedback : "진단 실행 후 표시"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* F-17 키워드 히트맵 */}
          {analysis?.status === "OK" && analysis.heatmap.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-3 border border-surface-container">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon name="local_fire_department" size={18} className="text-primary" />
                  <span className="font-headline text-[15px] font-bold text-on-surface">채용공고 필수 키워드 히트맵 & 빈도 분석</span>
                </div>
                <span className="text-[10px] font-bold bg-surface-container px-2 py-0.5 rounded-full text-secondary">
                  매칭률 {Math.round((analysis.heatmap.filter((h) => h.count > 0).length / analysis.heatmap.length) * 100)}%
                </span>
              </div>
              <p className="text-[12px] text-on-surface-variant">
                {job?.company} {job?.category} JD 핵심 기술 태그와의 실시간 텍스트 매칭 — 단어 경계 매칭 (Java≠JavaScript)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.heatmap.map((h) => {
                  const lv = heatLevel(h.count);
                  if (lv === 0)
                    return (
                      <button
                        key={h.keyword}
                        onClick={() => insertSnippet(h.keyword)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high text-secondary hover:text-on-surface transition-colors font-mono text-[12px] group"
                        title="본문에 키워드 삽입"
                      >
                        <Icon name="add" size={14} className="text-error" />
                        <span>{h.keyword}</span>
                        <span className="text-[10px] text-outline group-hover:text-on-surface">(미포함 · 추가 권장)</span>
                      </button>
                    );
                  const styles = [
                    "",
                    "bg-surface-variant text-on-surface",
                    "bg-primary-container text-on-primary",
                    "bg-primary text-on-primary",
                  ];
                  return (
                    <span key={h.keyword} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[12px] shadow-sm ${styles[lv]}`}>
                      <Icon name={lv >= 2 ? "check_circle" : "priority_high"} size={14} />
                      <span>{h.keyword} × {h.count}</span>
                      <span className="text-[10px] opacity-80">{lv >= 2 ? "(포함됨)" : "(권장 강조)"}</span>
                    </span>
                  );
                })}
              </div>
              <div className="p-3 rounded-lg bg-surface-container flex items-start gap-2">
                <Icon name="tips_and_updates" size={18} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[12px] text-on-surface-variant leading-relaxed">
                  <b className="text-on-surface">작성 추천 팁:</b> 미포함 키워드를 누르면 본문에 바로 삽입됩니다.
                  요구 스킬을 경험 문장 안에 자연스럽게 녹이면 <b className="text-tertiary">직군 키워드 점수</b>가 상승합니다.
                </p>
              </div>
            </div>
          )}

          {/* 채점 원칙 안내 */}
          <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-5">
            <h2 className="font-headline text-[14px] font-bold flex items-center gap-1.5 mb-2 text-on-surface">
              <Icon name="info" size={17} className="text-secondary" /> 채점 원칙 (화이트박스 공개)
            </h2>
            <p className="text-[11.5px] text-secondary leading-relaxed">
              본 서비스는 자소서를 대신 쓰지 않습니다. 규칙 기반 분석으로 감점 요인만 코칭하며,
              단독 자모 비율·유효 단어 수·문자 비율이 기준 미달이면 &lsquo;분석 불가&rsquo;로 차단합니다.
            </p>
          </div>
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-inverse-surface text-inverse-on-surface px-4 py-2.5 rounded-xl shadow-xl text-[13px] font-semibold">
          <Icon name="check_circle" size={18} className="text-tertiary-fixed" /> {toast}
        </div>
      )}
    </div>
  );
}

export default function CoverLetterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-secondary">로딩 중…</div>}>
      <CoachInner />
    </Suspense>
  );
}
