import type { ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";

export const textareaCls =
  "w-full resize-none rounded-xl bg-white/[0.05] px-3 py-2 text-[13px] leading-[1.4] text-white/90 outline-none ring-1 ring-inset ring-white/[0.08] placeholder:text-white/25 focus:ring-white/20";

export const inputCls =
  "h-8 w-full rounded-lg bg-white/[0.06] px-2.5 text-[12.5px] text-white/90 outline-none ring-1 ring-inset ring-white/[0.08] placeholder:text-white/30 focus:ring-white/20";

export const selectCls =
  "h-8 min-w-0 flex-1 rounded-lg bg-white/[0.06] px-2 text-[12px] text-white/85 outline-none ring-1 ring-inset ring-white/[0.08] focus:ring-white/20";

export const scrollCls = "min-h-0 flex-1 overflow-y-auto";

export function ViewHeader({
  leading,
  trailing,
  onClose,
}: {
  leading: ReactNode;
  trailing?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex h-6 items-center justify-between">
      <div className="flex min-w-0 items-center gap-2 text-[12px] font-medium tracking-[0.005em] text-white/40">
        {leading}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {trailing}
        <button
          type="button"
          aria-label="Collapse"
          onClick={onClose}
          className="-mr-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white/30 outline-none transition-colors duration-150 hover:bg-white/[0.07] hover:text-white/75 focus-visible:ring-1 focus-visible:ring-white/30"
        >
          <X size={13} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

export function BackLabel({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="-ml-1 flex min-w-0 items-center gap-0.5 rounded-full pr-1.5 text-[12px] font-medium tracking-[0.005em] text-white/40 outline-none transition-colors duration-150 hover:text-white/75 focus-visible:ring-1 focus-visible:ring-white/30"
    >
      <ChevronLeft size={14} strokeWidth={1.8} />
      {title}
    </button>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-3.5 text-[17px] font-semibold leading-[1.25] tracking-[-0.02em] text-white">
      {children}
    </h2>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1 line-clamp-2 text-[13.5px] leading-[1.45] tracking-[-0.005em] text-white/50">
      {children}
    </p>
  );
}

const BUTTON: Record<"primary" | "quiet" | "ghost" | "default", string> = {
  primary:
    "h-8 rounded-full bg-white px-4 text-[12.5px] font-medium tracking-[-0.005em] text-[#050506] hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/40",
  quiet:
    "h-8 rounded-full px-3.5 text-[12.5px] font-medium tracking-[-0.005em] text-white/55 hover:bg-white/[0.07] hover:text-white focus-visible:ring-1 focus-visible:ring-white/30",
  ghost:
    "h-8 rounded-full px-3 text-[12px] font-medium text-white/50 hover:bg-white/[0.06] hover:text-white/80 focus-visible:ring-1 focus-visible:ring-white/30",
  default:
    "flex h-8 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-[12px] font-medium text-white/80 hover:bg-white/[0.09] focus-visible:ring-1 focus-visible:ring-white/30",
};

export function Button({
  children,
  onClick,
  disabled,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "quiet" | "ghost" | "default";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 outline-none transition duration-150 disabled:pointer-events-none disabled:opacity-35 active:scale-[0.97] ${BUTTON[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 outline-none transition duration-150 hover:bg-white/[0.07] focus-visible:ring-1 focus-visible:ring-white/30 disabled:pointer-events-none disabled:opacity-35 active:scale-95"
    >
      {children}
    </button>
  );
}
