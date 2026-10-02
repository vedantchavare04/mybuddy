/*
 * src/components/notch/useNotchNav.ts
 *
 * Internal navigation for the expanded notch. The route is null until the
 * user navigates, so the default is derived (event view if an event is
 * pending, otherwise home). It resets whenever the notch collapses.
 */

import { useEffect, useState } from "react";
import { PARENT, type Route } from "./notchRoutes";

export function useNotchNav(expanded: boolean, hasEvent: boolean) {
  const [route, setRoute] = useState<Route | null>(null);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (!expanded) {
      setRoute(null);
      setDirection(0);
    }
  }, [expanded]);

  const current: Route = route ?? (hasEvent ? "event" : "home");

  const go = (next: Route) => {
    setDirection(1);
    setRoute(next);
  };

  const back = () => {
    setDirection(-1);
    setRoute(
      current === "home" && hasEvent ? "event" : (PARENT[current] ?? "home")
    );
  };

  return { route: current, direction, go, back };
}