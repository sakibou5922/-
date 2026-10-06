// QA スクリプト共通：対象 URL・公開ルート・レポート出力
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const QA_DIR = path.resolve("docs/qa");

/** noindex の結果ページ（回答は URL のみ）。検証用の固定回答 */
export const RESULT_URL =
  "/check/result?st=OPERATING&bt=FOOD&rm=MIXED&op=MOST&oc=INVENTORY_IMPORTANT&sc=TEAM_4_PLUS&rr=MEDIUM&ex=LINE,POS,CASHLESS&md=YES&nc=NEED_MORE";

export async function publicRoutes() {
  const routes = JSON.parse(await readFile(path.resolve("config/routes.json"), "utf8"));
  return routes.public_routes;
}

export async function writeReport(name, data) {
  await mkdir(QA_DIR, { recursive: true });
  const file = path.join(QA_DIR, name);
  await writeFile(file, JSON.stringify(data, null, 2));
  return file;
}
