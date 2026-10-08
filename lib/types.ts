export type Job = {
  id: string;
  company: string;
  companyInitial: string;
  position: string;
  location: string;
  career: string; // "신입" | "경력무관" | "인턴" ...
  employType: string; // "정규직" | "인턴" | "계약직"
  major: string; // 관련 전공
  salary: string;
  deadlineOffset: number; // 오늘 기준 +N일 (음수 = 마감 지남)
  tags: string[];
  requiredSkills: string[];
  description: string;
  requirements: string[];
  preferred: string[];
  url: string;
  category: string; // 백엔드 | 프론트엔드 | 인프라·DevOps | AI·데이터 | 모바일 | 공통
  createdOffset: number; // 등록일 = 오늘 - N일
};

export type KanbanStage =
  | "PREPARING" // 서류 준비 중
  | "APPLIED" // 지원 완료
  | "DOC_PASSED" // 서류 합격
  | "INTERVIEW" // 면접 예정
  | "ACCEPTED" // 최종 합격
  | "REJECTED"; // 불합격

export const KANBAN_STAGES: { key: KanbanStage; label: string; active: boolean }[] = [
  { key: "PREPARING", label: "서류 준비 중", active: true },
  { key: "APPLIED", label: "지원 완료", active: true },
  { key: "DOC_PASSED", label: "서류 합격", active: true },
  { key: "INTERVIEW", label: "면접 예정", active: true },
  { key: "ACCEPTED", label: "최종 합격", active: false },
  { key: "REJECTED", label: "불합격", active: false },
];

export type StatusChange = { status: KanbanStage; changedAt: string };

export type Application = {
  jobId: string;
  status: KanbanStage;
  memo: string;
  updatedAt: string;
  history: StatusChange[]; // StatusHistory — TC-03
};

export type CoverLetterItem = {
  question: string;
  content: string;
};

export type CoverLetter = {
  id: string;
  jobId: string | null;
  title: string;
  role: string; // 직군
  items: CoverLetterItem[];
  analysis: AnalysisResult | null;
  updatedAt: string;
  version: number;
};

export type CriterionResult = {
  key: string;
  label: string;
  weight: number;
  score: number;
  feedback: string;
};

export type AnalysisResult = {
  status: "OK" | "UNANALYZABLE";
  total: number;
  criteria: CriterionResult[];
  heatmap: { keyword: string; count: number }[];
  reason?: string;
  analyzedAt: string;
};

export const RUBRIC = [
  { key: "star", label: "STAR 구조", weight: 25 },
  { key: "keyword", label: "직군 핵심 키워드", weight: 20 },
  { key: "metrics", label: "구체적 수치·성과", weight: 15 },
  { key: "expression", label: "표현력·어휘", weight: 15 },
  { key: "length", label: "적정 분량", weight: 10 },
  { key: "variety", label: "문장 길이 다양성", weight: 10 },
  { key: "teamwork", label: "협업·팀워크 표현", weight: 5 },
] as const;
