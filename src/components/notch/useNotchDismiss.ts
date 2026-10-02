import { useEffect } from "react";

export function useNotchDismiss(
  ref: { current: HTMLElement | null },
  enabled: boolean,
  onDismiss: () => void
) {
  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target && ref.current?.contains(target)) return;
      if (target?.closest?.("[data-notch-ignore]")) return;
      onDismiss();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, enabled, onDismiss]);
}