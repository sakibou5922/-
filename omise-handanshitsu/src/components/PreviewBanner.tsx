import { BRAND, isPublicRelease } from "@/lib/site";

/** 公開承認前（public_release_enabled=false）のときだけ出す帯 */
export function PreviewBanner() {
  if (isPublicRelease()) return null;
  return (
    <div className="preview-banner" role="status">
      <strong>PREVIEW CANDIDATE</strong>｜{BRAND.brand_name} は公開承認前の検証版です。料金・条件は検証中で、収益リンクは無効です。
    </div>
  );
}
