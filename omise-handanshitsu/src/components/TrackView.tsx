"use client";

import { useEffect } from "react";
import { track, type EventName, type EventProps } from "@/lib/analytics";

/** マウント時に 1 回だけ計測イベントを送る */
export function TrackView({ name, props }: { name: EventName; props?: EventProps }) {
  const serialized = JSON.stringify(props ?? {});
  useEffect(() => {
    track(name, JSON.parse(serialized) as EventProps);
  }, [name, serialized]);
  return null;
}
