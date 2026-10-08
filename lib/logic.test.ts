import { describe, it, expect } from "vitest";
import {
  analyzeCoverLetter, calcMatch, countKeywordOccurrences, buildHeatmap,
  classifyJobText, heatLevel, filterJobs, paginateJobs,
} from "./logic";
import { JOBS, DEFAULT_PROFILE, SKILL_KEYWORDS } from "./seed";
import { RUBRIC } from "./types";

// ---------- F-16 '분석 불가' 게이트 — I-01 회귀 (무의미 입력이 고득점 받던 버그) ----------
describe("분석 불가 게이트 (I-01 회귀)", () => {
  it("단독 자모 반복(ㅋㅋㅋ)은 UNANALYZABLE — 점수 0", () => {
    const r = analyzeCoverLetter("ㅋ".repeat(40), JOBS[0]);
    expect(r.status).toBe("UNANALYZABLE");
    expect(r.total).toBe(0);
    expect(r.criteria).toHaveLength(0);
    expect(r.reason).toBeTruthy();
  });

  it("30자 미만 입력 차단", () => {
    expect(analyzeCoverLetter("짧은 글", JOBS[0]).status).toBe("UNANALYZABLE");
  });

  it("유효 단어 수 미달 차단 (숫자 나열)", () => {
    const r = analyzeCoverLetter("1 2 3 4 5", JOBS[0]);
    expect(r.status).toBe("UNANALYZABLE");
  });

  it("문자 비율 미달 차단 (기호 위주)", () => {
    const r = analyzeCoverLetter("!@#$%^&*()!@#$%^&*()!@#$%^&*()!@#$%", JOBS[0]);
    expect(r.status).toBe("UNANALYZABLE");
  });
});

// ---------- F-16 채점 — 7개 가중치 합계 일치 ----------
describe("자소서 채점 (F-16·F-28)", () => {
  const good =
    "대학 3학년 동아리에서 Spring Boot 기반 주문 시스템 개발을 맡았습니다. 쿼리 병목 상황이 문제였는데, " +
    "MySQL 인덱스를 재설계해서 응답 시간을 40% 단축했습니다. 팀원 3명과 협업하며 Git 코드 리뷰를 도입해 " +
    "배포 오류를 5건에서 0건으로 줄였습니다. Java와 Docker 경험을 귀사 서버 플랫폼에 적용하고 싶습니다.";

  it("정상 입력은 OK + 총점 = 7개 기준 점수 합계", () => {
    const r = analyzeCoverLetter(good, JOBS[0]);
    expect(r.status).toBe("OK");
    expect(r.criteria).toHaveLength(7);
    const sum = r.criteria.reduce((a, c) => a + c.score, 0);
    expect(r.total).toBe(sum);
    expect(r.total).toBeGreaterThan(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it("7개 항목 가중치 합 = 100 (F-28 공개 기준)", () => {
    expect(RUBRIC.reduce((a, c) => a + c.weight, 0)).toBe(100);
    expect(RUBRIC.map((r) => r.weight)).toEqual([25, 20, 15, 15, 10, 10, 5]);
  });
});

// ---------- F-17 키워드 히트맵 — I-02/C-01 회귀 (부분 문자열 오매칭 버그) ----------
describe("단어 경계 매칭 (I-02 회귀)", () => {
  it("Java ≠ JavaScript — 부분 문자열 매칭 금지", () => {
    expect(countKeywordOccurrences("JavaScript만 사용했습니다", "Java")).toBe(0);
    expect(countKeywordOccurrences("Java와 JavaScript를 사용", "Java")).toBe(1);
  });

  it("C ≠ C++ / C#", () => {
    expect(countKeywordOccurrences("C++과 C#을 사용", "C")).toBe(0);
    expect(countKeywordOccurrences("C와 C++", "C")).toBe(1);
  });

  it("C++ 자체는 매칭됨 (특수문자 키워드 처리)", () => {
    expect(countKeywordOccurrences("C++ 프로젝트", "C++")).toBe(1);
    expect(countKeywordOccurrences("C++14와 Modern C++", "C++")).toBe(2);
  });

  it("대소문자 무관 — 'spring boot' ↔ 'Spring Boot'", () => {
    expect(countKeywordOccurrences("spring boot 기반 개발", "Spring Boot")).toBe(1);
    expect(countKeywordOccurrences("SPRING BOOT", "Spring Boot")).toBe(1);
  });

  it("히트맵은 4단계 레벨 (3회+/2회/1회/미출현) — I-03 범례 일치", () => {
    expect(heatLevel(3)).toBe(3);
    expect(heatLevel(4)).toBe(3);
    expect(heatLevel(2)).toBe(2);
    expect(heatLevel(1)).toBe(1);
    expect(heatLevel(0)).toBe(0);
  });

  it("buildHeatmap은 요구 키워드별 출현 횟수를 내림차순 정렬", () => {
    const h = buildHeatmap("Java Java Spring", ["Java", "Spring", "Kafka"]);
    expect(h.find((x) => x.keyword === "Java")?.count).toBe(2);
    expect(h.find((x) => x.keyword === "Kafka")?.count).toBe(0);
    expect(h[0].count).toBeGreaterThanOrEqual(h[h.length - 1].count);
  });
});

// ---------- F-12 매칭 점수 — 5요소 조합 ----------
describe("매칭 점수 5요소 (F-12)", () => {
  it("총점 = 5요소 합계, 0~100 범위", () => {
    for (const job of JOBS.slice(0, 5)) {
      const m = calcMatch(job, DEFAULT_PROFILE);
      expect(m.total).toBe(
        m.skills.score + m.targetRole.score + m.career.score + m.deadline.score + m.major.score
      );
      expect(m.total).toBeGreaterThanOrEqual(0);
      expect(m.total).toBeLessThanOrEqual(100);
    }
  });

  it("스킬 전부 보유 시 스킬 점수 50점 만점", () => {
    const job = JOBS[0];
    const m = calcMatch(job, { ...DEFAULT_PROFILE, skills: job.requiredSkills });
    expect(m.skills.score).toBe(50);
    expect(m.skills.missing).toHaveLength(0);
  });

  it("마감된 공고는 마감 임박도 0점", () => {
    const expired = JOBS.find((j) => j.deadlineOffset < 0) ?? JOBS[0];
    const m = calcMatch({ ...expired, deadlineOffset: -5 }, DEFAULT_PROFILE);
    expect(m.deadline.score).toBe(0);
  });

  it("타학과 공고는 전공 일치 감점 (15→5)", () => {
    const nonCs = JOBS.find((j) => j.major !== "컴퓨터공학")!;
    const m = calcMatch(nonCs, DEFAULT_PROFILE);
    expect(m.major.score).toBe(5);
    expect(m.major.ok).toBe(false);
  });
});

// ---------- F-11 서버측 필터 순수 함수 ----------
describe("공고 필터·정렬 (F-11, /api/listings 공유 로직)", () => {
  it("검색어 필터 — 회사·직무·스킬 대상", () => {
    const r = filterJobs(JOBS, { q: "카카오" }, DEFAULT_PROFILE);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((j) => j.company.includes("카카오"))).toBe(true);
  });

  it("학과 필터 — 데이터사이언스 공고만", () => {
    const r = filterJobs(JOBS, { major: "데이터사이언스" }, DEFAULT_PROFILE);
    expect(r.length).toBe(2);
    expect(r.every((j) => j.major === "데이터사이언스")).toBe(true);
  });

  it("마감 범위 필터 — 진행중만", () => {
    const r = filterJobs(JOBS, { dl: "진행중" }, DEFAULT_PROFILE);
    expect(r.every((j) => j.deadlineOffset >= 0)).toBe(true);
  });

  it("북마크 필터 — bmIds 안의 공고만", () => {
    const r = filterJobs(JOBS, { bm: true, bmIds: ["j01", "j05"] }, DEFAULT_PROFILE);
    expect(r.map((j) => j.id).sort()).toEqual(["j01", "j05"]);
  });

  it("페이지네이션 — 크기·총건수·페이지 클램프", () => {
    const p = paginateJobs(JOBS, 2, 8);
    expect(p.items).toHaveLength(8);
    expect(p.pageCount).toBe(3);
    const over = paginateJobs(JOBS, 99, 8);
    expect(over.page).toBe(3); // 범위 초과 → 마지막 페이지로 클램프
  });
});

// ---------- 자동 분류 (공고 키워드 사전 매칭) ----------
describe("공고 자동 분류", () => {
  it("classifyJobText는 단어 경계로 사전 키워드를 매칭", () => {
    const hits = classifyJobText("Java Spring Boot 기반 API 개발, JavaScript 금지", SKILL_KEYWORDS);
    expect(hits).toContain("Java");
    expect(hits).toContain("JavaScript"); // 본문에 명시됨
    expect(hits).toContain("Spring Boot");
    expect(hits).not.toContain("Kafka");
  });
});
