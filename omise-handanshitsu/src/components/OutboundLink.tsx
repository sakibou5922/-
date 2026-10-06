"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

interface Props {
  href: string;
  sponsored: boolean;
  offerId: string;
  className?: string;
  children: ReactNode;
}

/** 外部サービスへのリンク。収益リンクは rel=sponsored（A14）。クリックを計測する。 */
export function OutboundLink({ href, sponsored, offerId, className, children }: Props) {
  const rel = sponsored ? "sponsored noopener noreferrer" : "noopener noreferrer";
  return (
    <a
      href={href}
      rel={rel}
      target="_blank"
      className={className}
      data-offer-id={offerId}
      data-sponsored={sponsored ? "true" : "false"}
      onClick={() => track(sponsored ? "affiliate_outbound" : "official_outbound", { offer_id: offerId })}
    >
      {children}
    </a>
  );
}
