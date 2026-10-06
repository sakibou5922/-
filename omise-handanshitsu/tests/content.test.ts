import { describe, expect, it } from "vitest";
import { ARTICLES } from "@/lib/content/articles";
import { listSources } from "@/lib/evidence";
import { PUBLIC_ROUTES } from "@/lib/site";
import { QUESTION_BY_KEY } from "@/lib/decision/labels";

const BRAND_WORDS = /Square|Airレジ|Airペイ|freee|LINE|HOT PEPPER|ホットペッパー|Google/;

describe("A16 各記事に 即答・向く/向かない・代替・次の行動 がある", () => {
  for (const a of ARTICLES) {
    it(a.slug, () => {
      expect(a.immediateAnswer.length).toBeGreaterThan(0);
      expect(a.decisionRows.length).toBeGreaterThanOrEqual(3);
      for (const r of a.decisionRows) {
        expect(r.fit.length).toBeGreaterThan(0);
        expect(r.action.length).toBeGreaterThan(0);
      }
      expect(a.alternative.length).toBeGreaterThan(0);
      expect(a.nextAction.length).toBeGreaterThan(0);
      expect(a.measure.length).toBeGreaterThanOrEqual(3);
      expect(a.title.length).toBeLessThanOrEqual(60);
      expect(a.description.length).toBeGreaterThan(50);
      expect(PUBLIC_ROUTES).toContain(`/need/${a.slug}`);
    });
  }
});

describe("A17 紹介リンクを消しても価値が残る（記事本文に収益 URL を埋め込まない）", () => {
  it("本文に外部 URL やアフィリエイトパラメータがない", () => {
    for (const a of ARTICLES) {
      const text = JSON.stringify({ ...a, miniCheck: undefined });
      expect(text).not.toMatch(/https?:\/\//);
      expect(text).not.toMatch(/a8\.net|moshimo|af_id|utm_/i);
    }
  });
});

describe("A18 / A19 固有名の数値 claim は根拠付き", () => {
  const ids = new Set(listSources().map((s) => s.id));
  for (const a of ARTICLES) {
    it(a.slug, () => {
      for (const f of a.costFacts) {
        const named = BRAND_WORDS.test(f.text);
        const numeric = /[0-9０-９]/.test(f.text);
        if (named && numeric) {
          expect(f.sources.length, `根拠なし: ${f.text}`).toBeGreaterThan(0);
          expect(f.fallback, `fallback なし: ${f.text}`).toBeTruthy();
        }
        for (const id of f.sources) expect(ids.has(id), `未知の根拠 id: ${id}`).toBe(true);
      }
    });
  }
});

describe("ミニチェックは全組み合わせで有効な状態を返す", () => {
  for (const a of ARTICLES) {
    it(a.slug, () => {
      const mc = a.miniCheck;
      expect(mc.questions).toHaveLength(5);
      const stateIds = new Set(mc.states.map((s) => s.id));
      expect(stateIds.size).toBe(a.decisionRows.length);
      for (const r of a.decisionRows) expect(stateIds.has(r.state)).toBe(true);

      const seen = new Set<string>();
      const walk = (i: number, acc: Record<string, string>) => {
        if (i === mc.questions.length) {
          const s = mc.resolve(acc);
          expect(stateIds.has(s), `${a.slug}: ${JSON.stringify(acc)} → ${s}`).toBe(true);
          seen.add(s);
          return;
        }
        const q = mc.questions[i]!;
        for (const o of q.options) walk(i + 1, { ...acc, [q.id]: o.value });
      };
      walk(0, {});
      // すべての状態に到達できる
      expect([...stateIds].filter((s) => !seen.has(s))).toEqual([]);

      // prefill の写像先は 8問の有効な選択肢
      for (const q of mc.questions) {
        if (!q.prefill) continue;
        const valid = new Set(QUESTION_BY_KEY[q.prefill.key].options.map((o) => o.value));
        for (const v of Object.values(q.prefill.map)) expect(valid.has(v), `${q.prefill.key}=${v}`).toBe(true);
      }
    });
  }
});

describe("A15 予約記事は Starter で足りる人を有料へ誘導しない", () => {
  it("ミニチェックの手動十分ケースは NOT_NOW", () => {
    const a = ARTICLES.find((x) => x.slug === "reservation-system")!;
    const s = a.miniCheck.resolve({ model: "MIXED", channels: "ONE", after_hours: "NO", trouble: "NO", staff: "SOLO" });
    expect(s).toBe("MANUAL_OK");
    expect(a.miniCheck.states.find((x) => x.id === s)?.need).toBe("NOT_NOW");
    expect(a.risk.join("")).toContain("Starterで十分な人を有料へ誘導しません");
  });
});
