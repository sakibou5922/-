import { NextResponse } from "next/server";
import { decide, RULE_VERSION, SCHEMA_VERSION } from "@/lib/decision/engine";
import { DecisionInputError } from "@/lib/decision/types";
import { QUESTIONS } from "@/lib/decision/labels";

export const dynamic = "force-dynamic";

/**
 * 正式な判断エンドポイント（08_ENGINEERING_CANDIDATE.md）。
 * POST { stage, business_type, ... } → 判断結果。回答は保存しない。点数は返さない。
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  try {
    const result = decide(body);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  } catch (e) {
    if (e instanceof DecisionInputError) {
      return NextResponse.json({ error: "DIAGNOSIS_INCOMPLETE", problems: e.problems }, { status: 400 });
    }
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/** スキーマの説明（人間・ツール向け） */
export async function GET() {
  return NextResponse.json(
    {
      rule_version: RULE_VERSION,
      schema_version: SCHEMA_VERSION,
      method: "POST",
      questions: QUESTIONS.map((q) => ({
        id: q.id,
        key: q.key,
        type: q.type,
        values: q.options.map((o) => o.value),
        conditional: Boolean(q.when),
      })),
      persist_personal_answers: false,
    },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
