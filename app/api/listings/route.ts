import { NextRequest, NextResponse } from "next/server";
import { JOBS, DEFAULT_PROFILE } from "@/lib/seed";
import { filterJobs, paginateJobs, ListingFilter } from "@/lib/logic";

// GET /api/listings — F-11 서버 측 필터링·페이지네이션 (검수 A-02, 성능 N-04)
// 프로필·북마크는 무로그인 MVP라 클라이언트(localStorage) 소유 → 쿼리 파라미터로 전달.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const profile = {
    skills: sp.get("pskills")?.split(",").filter(Boolean) ?? DEFAULT_PROFILE.skills,
    targetRole: sp.get("prole") ?? DEFAULT_PROFILE.targetRole,
    career: sp.get("pcareer") ?? DEFAULT_PROFILE.career,
  };

  const f: ListingFilter = {
    q: sp.get("q") ?? "",
    career: sp.get("career") ?? "전체",
    type: sp.get("type") ?? "전체",
    cat: sp.get("cat") ?? "전체",
    major: sp.get("major") ?? "전체",
    loc: sp.get("loc") ?? "전체",
    tag: sp.get("tag") ?? "전체",
    dl: sp.get("dl") ?? "전체",
    bm: sp.get("bm") === "1",
    bmIds: sp.get("bmids")?.split(",").filter(Boolean) ?? [],
    sort: (sp.get("sort") as ListingFilter["sort"]) || "match",
  };

  const list = filterJobs(JOBS, f, profile);
  const page = parseInt(sp.get("page") ?? "1", 10) || 1;
  const size = Math.min(50, parseInt(sp.get("size") ?? "8", 10) || 8);
  return NextResponse.json(paginateJobs(list, page, size));
}
