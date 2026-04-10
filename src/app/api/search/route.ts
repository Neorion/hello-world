import { NextRequest, NextResponse } from "next/server";
import { searchWells } from "@/lib/search";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  try {
    const result = await searchWells({
      q: sp.get("q") ?? undefined,
      apiNumber: sp.get("apiNumber") ?? undefined,
      operatorName: sp.get("operatorName") ?? undefined,
      county: sp.get("county") ?? undefined,
      state: sp.get("state") ?? undefined,
      status: sp.get("status") ?? undefined,
      page: sp.has("page") ? parseInt(sp.get("page")!) : 1,
      pageSize: sp.has("pageSize") ? parseInt(sp.get("pageSize")!) : 25,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
