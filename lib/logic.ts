import { Job, AnalysisResult, CriterionResult } from "./types";

// ---------- 날짜 / D-day ----------

export function jobDeadline(job: Job): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  d.setDate(d.getDate() + job.deadlineOffset);
  return d;
}

export function jobCreatedAt(job: Job): Date {
  const d = new Date();
  d.setDate(d.getDate() - job.createdOffset);
  return d;
}

export function dday(job: Job): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dl = jobDeadline(job);
  dl.setHours(0, 0, 0, 0);
  return Math.round((dl.getTime() - now.getTime()) / 86400000);
}

export function ddayLabel(d: number): string {
  if (d < 0) return "마감";
  if (d === 0) return "D-DAY";
  return `D-${d}`;
}

export function ddayColor(d: number): { bg: string; fg: string } {
  if (d < 0) return { bg: "#e6edf9", fg: "#515b70" }; // 마감 회색
  if (d <= 1) return { bg: "#fff1f2", fg: "#e11d48" }; // 긴급 빨강
  if (d <= 7) return { bg: "#fffbeb", fg: "#d97706" }; // 임박 주황
  return { bg: "#f1f5f9", fg: "#475569" }; // 여유 회색
}

export function fmtDate(d: Date): string {
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

// ---------- 매칭 점수 (F-12, 용어 §8.1: 5요소 조합) ----------

export type MatchBreakdown = {
  total: number;
  skills: { score: number; max: number; matched: string[]; missing: string[] };
  targetRole: { score: number; max: number; ok: boolean };
  career: { score: number; max: number; ok: boolean };
  deadline: { score: number; max: number; d: number };
  major: { score: number; max: number; ok: boolean };
};

export function calcMatch(
  job: Job,
  profile: { skills: string[]; targetRole: string; career: string }
): MatchBreakdown {
  const norm = (s: string) => s.toLowerCase().replace(/[\s.]/g, "");
  const my = new Set(profile.skills.map(norm));

  const matched = job.requiredSkills.filter((s) => my.has(norm(s)));
  const missing = job.requiredSkills.filter((s) => !my.has(norm(s)));

  // 1. 기술 스택 일치율 — 50점
  const skillsMax = 50;
  const skillsScore =
    job.requiredSkills.length === 0
      ? skillsMax
      : Math.round((matched.length / job.requiredSkills.length) * skillsMax);

  // 2. 희망 직무 일치 — 15점
  const roleMax = 15;
  const roleOk = profile.targetRole === job.category || job.category === "공통";
  const roleScore = roleOk ? roleMax : profile.targetRole === "공통" ? 10 : 4;

  // 3. 경력 조건 — 10점
  const careerMax = 10;
  const careerOk = job.career === "경력무관" || job.career === profile.career || job.career === "인턴";
  const careerScore = careerOk ? careerMax : 3;

  // 4. 마감 임박도 — 10점 (마감 공고 0, 임박할수록 높음 — 지원 가능성 신호)
  const d = dday(job);
  const deadlineMax = 10;
  const deadlineScore = d < 0 ? 0 : d <= 3 ? 10 : d <= 7 ? 9 : d <= 14 ? 7 : d <= 30 ? 5 : 3;

  // 5. 전공·카테고리 일치 — 15점 (컴공 특화: CS 카테고리 공고 = 전공 일치)
  const majorMax = 15;
  const majorOk = job.major === "컴퓨터공학";
  const majorScore = majorOk ? majorMax : 5;

  return {
    total: skillsScore + roleScore + careerScore + deadlineScore + majorScore,
    skills: { score: skillsScore, max: skillsMax, matched, missing },
    targetRole: { score: roleScore, max: roleMax, ok: roleOk },
    career: { score: careerScore, max: careerMax, ok: careerOk },
    deadline: { score: deadlineScore, max: deadlineMax, d },
    major: { score: majorScore, max: majorMax, ok: majorOk },
  };
}

// ---------- 키워드 매칭 (F-17: 단어 경계만, 대소문자 무관 — I-02/C-01 회귀 방지) ----------

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 라틴 키워드는 단어 경계(\b)로만 매칭: "Java" ≠ "JavaScript", "C" ≠ "C++"
// C++/C#/CI/CD 처럼 \b가 안 먹는 문자열은 별도 패턴 처리. 한글 키워드는 부분 매칭 허용.
// 뒤쪽 경계는 문자·기호만 차단 — 버전 접미사(C++14, Java8, Python3)는 해당 스킬 언급으로 인정.
export function countKeywordOccurrences(text: string, keyword: string): number {
  const kw = keyword.trim();
  if (!kw) return 0;
  let count = 0;
  if (/^[A-Za-z0-9+#./ -]+$/.test(kw)) {
    // 영문 계열: 경계 커스텀 — 앞은 영숫자/#/+/., 뒤는 영문자/#/+. 가 아닌 위치에서만 매칭
    const re = new RegExp(`(?<![A-Za-z0-9+#.])${escapeRe(kw)}(?![A-Za-z+#.])`, "gi");
    count = (text.match(re) || []).length;
  } else {
    count = (text.match(new RegExp(escapeRe(kw), "gi")) || []).length;
  }
  return count;
}

export function buildHeatmap(text: string, keywords: string[]) {
  return keywords
    .map((keyword) => ({ keyword, count: countKeywordOccurrences(text, keyword) }))
    .sort((a, b) => b.count - a.count);
}

export function heatLevel(count: number): number {
  if (count >= 3) return 3;
  if (count === 2) return 2;
  if (count === 1) return 1;
  return 0;
}

// ---------- 자소서 코칭 분석 (F-16, '분석 불가' 게이트 — I-01 회귀 방지) ----------

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?다음죠요니다]\s)|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const STAR_CUES: Record<string, RegExp[]> = {
  situation: [/상황|배경|당시|~시절|문제를|마주했|직면/, /문제|과제|난관|병목|이슈/],
  task: [/목표|과제|역할|맡아|담당/, /해야|필요했/],
  action: [/구현했|개발했|설계했|도입했|해결했|개선했|분석했|작성했|진행했|수행했/],
  result: [/결과|성과|달성|개선|향상|단축|절감|증가|감소|%|배\b/],
};

const TEAMWORK_WORDS = ["함께", "팀", "협업", "공유", "코드 리뷰", "코드리뷰", "페어", "스터디", "동아리", "협력", "소통", "리뷰", "회의", "기여"];
const WEAK_WORDS = ["많이", "정말", "그냥", "약간", "좀", "것 같", "노력했습니다", "최선을 다해", "열심히"];

export function analyzeCoverLetter(text: string, job: Job | null): AnalysisResult {
  const analyzedAt = new Date().toISOString();
  const clean = text.trim();

  // '분석 불가' 게이트 — 단독 자모 비율·유효 단어 수·문자 비율 (명세 F-16 예외 조항)
  const jamoOnly = (clean.match(/[ㄱ-ㅎㅏ-ㅣ]/g) || []).length;
  const hangulWords = (clean.match(/[가-힣a-zA-Z0-9+#.]+/g) || []).filter((w) => w.length >= 1);
  const letters = (clean.match(/[가-힣a-zA-Z0-9]/g) || []).length;
  const jamoRatio = clean.length > 0 ? jamoOnly / clean.length : 0;
  const letterRatio = clean.length > 0 ? letters / clean.length : 0;

  if (clean.length < 30 || jamoRatio > 0.3 || hangulWords.length < 10 || letterRatio < 0.5) {
    const reason =
      clean.length < 30
        ? "입력 분량이 분석 최소 기준(30자)에 미달합니다."
        : jamoRatio > 0.3
          ? "단독 자모(ㅋㅋ, ㅠㅠ 등) 비율이 높아 의미 있는 문장으로 판정되지 않았습니다."
          : hangulWords.length < 10
            ? "유효 단어 수가 기준(10개)에 미달합니다."
            : "문자 비율이 기준에 미달합니다. 일반 문장 형태로 작성해 주세요.";
    return { status: "UNANALYZABLE", total: 0, criteria: [], heatmap: [], reason, analyzedAt };
  }

  const sentences = splitSentences(clean);
  const criteria: CriterionResult[] = [];

  // 1) STAR 구조 (25) — 상황/과제/행동/결과 단서 4그룹 커버리지
  {
    const hit = Object.values(STAR_CUES).filter((cues) => cues.some((c) => c.test(clean))).length;
    const score = Math.round((hit / 4) * 25);
    const missing = ["상황", "과제", "행동", "결과"][hit] ?? "";
    criteria.push({
      key: "star",
      label: "STAR 구조",
      weight: 25,
      score,
      feedback:
        hit === 4
          ? "상황-과제-행동-결과 구조가 명확합니다."
          : `STAR 4요소 중 ${hit}개가 확인됩니다. '${missing}' 요소를 보강하세요.`,
    });
  }

  // 2) 직군 핵심 키워드 (20) — 공고 요구 스킬의 본문 출현율
  {
    const required = job ? job.requiredSkills : [];
    const hits = required.filter((k) => countKeywordOccurrences(clean, k) > 0);
    const score = required.length === 0 ? 12 : Math.round((hits.length / required.length) * 20);
    criteria.push({
      key: "keyword",
      label: "직군 핵심 키워드",
      weight: 20,
      score,
      feedback:
        required.length === 0
          ? "대상 공고가 없어 일반 기준으로 채점했습니다."
          : hits.length === required.length
            ? `공고 핵심 키워드 ${required.length}개가 모두 본문에 포함되어 있습니다.`
            : `요구 키워드 ${required.length}개 중 ${hits.length}개 언급. 미포함: ${required.filter((k) => !hits.includes(k)).slice(0, 4).join(", ")}`,
    });
  }

  // 3) 구체적 수치·성과 (15) — 숫자+단위 패턴 밀도
  {
    const metricMatches = clean.match(/\d+(\.\d+)?\s*(%|배|명|건|개|ms|초|분|시간|일|만원|원|줄|회|개월|년)/g) || [];
    const density = metricMatches.length;
    const score = Math.min(15, Math.round((density / 4) * 15));
    criteria.push({
      key: "metrics",
      label: "구체적 수치·성과",
      weight: 15,
      score,
      feedback:
        density >= 4
          ? `정량 지표 ${density}건 — 수치 근거가 충분합니다.`
          : `정량 표현이 ${density}건뿐입니다. 응답시간·처리량·참여 인원 등 수치를 추가하세요.`,
    });
  }

  // 4) 표현력·어휘 (15) — 약한 표현·수동태 비율 역산
  {
    const weakHits = WEAK_WORDS.reduce((n, w) => n + (clean.split(w).length - 1), 0);
    const passive = (clean.match(/되었|되어|받았|당했/g) || []).length;
    const active = (clean.match(/구현했|개발했|설계했|해결했|도입했|개선했|주도|기여/g) || []).length;
    const ratio = sentences.length > 0 ? (weakHits + passive) / sentences.length : 1;
    const score = Math.max(3, Math.round(15 - ratio * 20 + Math.min(active, 3)));
    criteria.push({
      key: "expression",
      label: "표현력·어휘",
      weight: 15,
      score: Math.min(15, score),
      feedback:
        weakHits + passive === 0
          ? "능동형·구체 표현 위주로 잘 작성되었습니다."
          : `모호·수동 표현 ${weakHits + passive}건 발견('${WEAK_WORDS.filter((w) => clean.includes(w))[0] ?? "수동태"}' 등). 능동형으로 교체하세요.`,
    });
  }

  // 5) 적정 분량 (10) — 500~1500자 권장 밴드
  {
    const len = clean.length;
    const score = len >= 500 && len <= 1500 ? 10 : len >= 300 && len <= 2000 ? 7 : len >= 200 ? 4 : 2;
    criteria.push({
      key: "length",
      label: "적정 분량",
      weight: 10,
      score,
      feedback:
        score === 10
          ? `공백 포함 ${len}자 — 권장 분량(500~1500자)을 충족합니다.`
          : `${len}자입니다. 권장 분량은 500~1500자입니다.`,
    });
  }

  // 6) 문장 길이 다양성 (10) — 문장 길이 변동계수
  {
    const lens = sentences.map((s) => s.length);
    const avg = lens.reduce((a, b) => a + b, 0) / Math.max(lens.length, 1);
    const sd = Math.sqrt(lens.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(lens.length, 1));
    const cv = avg > 0 ? sd / avg : 0;
    const score = lens.length < 2 ? 3 : cv >= 0.5 ? 10 : cv >= 0.35 ? 7 : cv >= 0.2 ? 5 : 3;
    criteria.push({
      key: "variety",
      label: "문장 길이 다양성",
      weight: 10,
      score,
      feedback:
        score >= 7
          ? `문장 ${lens.length}개, 길이 변동이 적절합니다(평균 ${Math.round(avg)}자).`
          : `문장 길이가 단조롭습니다(평균 ${Math.round(avg)}자, 편차 작음). 길고 짧은 문장을 섞으세요.`,
    });
  }

  // 7) 협업·팀워크 표현 (5)
  {
    const hits = TEAMWORK_WORDS.filter((w) => clean.includes(w));
    const score = hits.length >= 2 ? 5 : hits.length === 1 ? 3 : 0;
    criteria.push({
      key: "teamwork",
      label: "협업·팀워크 표현",
      weight: 5,
      score,
      feedback:
        hits.length > 0
          ? `협업 표현(${hits.slice(0, 3).join(", ")})이 확인됩니다.`
          : "협업·팀 경험 표현이 없습니다. '함께/팀/코드리뷰' 등 1회 이상 언급하세요.",
    });
  }

  const total = criteria.reduce((a, c) => a + c.score, 0);
  const heatmap = buildHeatmap(clean, job ? job.requiredSkills : []);

  return { status: "OK", total, criteria, heatmap, analyzedAt };
}

// ---------- 공고 목록 필터·정렬 (F-11, 검수 A-02: 서버 측 필터링 — /api/listings와 페이지가 공유) ----------

export type ListingFilter = {
  q?: string;
  career?: string;
  type?: string; // 고용형태
  cat?: string; // 직군 카테고리
  major?: string; // 학과 — F-11 명세 필터
  loc?: string;
  tag?: string;
  dl?: string; // 마감 범위: 7일이내 | 14일이내 | 진행중
  bm?: boolean;
  bmIds?: string[]; // 북마크 필터 시 대상 id 목록 (클라이언트 소유 → 파라미터로 전달)
  sort?: "match" | "deadline" | "latest";
};

export function filterJobs(
  jobs: Job[],
  f: ListingFilter,
  profile: { skills: string[]; targetRole: string; career: string }
): Job[] {
  let list = jobs.slice();
  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter((j) =>
      [j.company, j.position, j.description, ...j.tags, ...j.requiredSkills].join(" ").toLowerCase().includes(q)
    );
  }
  if (f.career && f.career !== "전체") list = list.filter((j) => j.career === f.career || j.career === "경력무관");
  if (f.type && f.type !== "전체") list = list.filter((j) => j.employType === f.type);
  if (f.cat && f.cat !== "전체") list = list.filter((j) => j.category === f.cat);
  if (f.major && f.major !== "전체") list = list.filter((j) => j.major === f.major);
  if (f.loc && f.loc !== "전체") list = list.filter((j) => j.location.includes(f.loc!));
  if (f.tag && f.tag !== "전체") list = list.filter((j) => j.tags.includes(f.tag!));
  if (f.dl === "7일이내") list = list.filter((j) => { const d = dday(j); return d >= 0 && d <= 7; });
  if (f.dl === "14일이내") list = list.filter((j) => { const d = dday(j); return d >= 0 && d <= 14; });
  if (f.dl === "진행중") list = list.filter((j) => dday(j) >= 0);
  if (f.bm && f.bmIds) list = list.filter((j) => f.bmIds!.includes(j.id));

  const score = (j: Job) => calcMatch(j, profile).total;
  if (f.sort === "deadline") list.sort((a, b) => dday(a) - dday(b));
  else if (f.sort === "latest") list.sort((a, b) => a.createdOffset - b.createdOffset);
  else list.sort((a, b) => score(b) - score(a)); // 기본: 매칭순
  return list;
}

export function paginateJobs(list: Job[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const p = Math.min(Math.max(1, page), pageCount);
  return { items: list.slice((p - 1) * pageSize, p * pageSize), total: list.length, page: p, pageCount };
}

// ---------- 공고 자동 분류 데모 (키워드 사전 매칭 — C-01 회귀: 대소문자 무관 + 단어 경계) ----------

export function classifyJobText(text: string, keywords: string[]): string[] {
  return keywords.filter((k) => countKeywordOccurrences(text, k) > 0);
}
