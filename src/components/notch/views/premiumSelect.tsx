import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  detail?: string;
  icon?: ReactNode;
};

type Props = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
};

type Position = { left: number; top: number; width: number; maxHeight: number };

export function PremiumSelect({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = "Choose an option",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const placeMenu = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 10;
      const width = Math.min(Math.max(rect.width, 210), window.innerWidth - margin * 2);
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
      const below = window.innerHeight - rect.bottom - margin;
      const above = rect.top - margin;
      const openBelow = below >= Math.min(260, above) || below > 190;
      const maxHeight = Math.max(120, Math.min(280, openBelow ? below : above));
      setPosition({
        left,
        width,
        maxHeight,
        top: openBelow ? rect.bottom + 6 : Math.max(margin, rect.top - maxHeight - 6),
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    placeMenu();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-9 w-full min-w-0 flex-none items-center gap-2.5 rounded-[11px] border border-white/[0.09] bg-white/[0.045] px-3 text-left text-[12.5px] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] outline-none transition hover:border-white/[0.16] hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/25 ${className}`}
      >
        {selected?.icon && <span className="flex h-[18px] w-[22px] shrink-0 items-center justify-center">{selected.icon}</span>}
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/45 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && position && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          data-notch-ignore
          role="listbox"
          aria-label={ariaLabel}
          className="fixed z-[10000] overflow-y-auto rounded-[13px] border border-white/[0.11] bg-[#171719]/[0.98] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.2)_transparent]"
          style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className={`flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors ${active ? "bg-white/[0.09] text-white" : "text-white/75 hover:bg-white/[0.07] hover:text-white"}`}
              >
                {option.icon && <span className="flex h-6 w-7 shrink-0 items-center justify-center">{option.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium">{option.label}</span>
                  {option.detail && <span className="mt-0.5 block truncate text-[10.5px] text-white/35">{option.detail}</span>}
                </span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-white/75" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
