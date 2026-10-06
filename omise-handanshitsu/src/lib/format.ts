/** 依存ゼロの整形ヘルパー（クライアントにも届く） */
export function formatDateJa(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}
