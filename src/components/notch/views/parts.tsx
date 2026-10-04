import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";

export function ViewHeader({
  leading,
  onClose,
  trailing,
}: {
  leading: ReactNode;
  onClose: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex h-6 shrink-0 items-center justify-between">
      <div className="flex min-w-0 items-center gap-2 text-[12px] font-medium tracking-[0.005em] text-white/40">
        {leading}
      </div>
      <div className="flex items-center gap-1">
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

export function BackLabel({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={`Back from ${title}`}
      className="-ml-1.5 flex h-6 items-center gap-0.5 rounded-full pl-1 pr-2.5 text-[12px] font-medium text-white/55 outline-none transition-colors duration-150 hover:bg-white/[0.07] hover:text-white focus-visible:ring-1 focus-visible:ring-white/30"
    >
      <ChevronLeft size={14} strokeWidth={1.9} />
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

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "quiet";
};

export function Button({
  variant = "ghost",
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium tracking-[-0.005em] outline-none transition duration-150 focus-visible:ring-2 focus-visible:ring-white/35 disabled:pointer-events-none disabled:opacity-35 active:scale-[0.97]";
  const look = {
    primary: "bg-white text-[#050506] hover:bg-white/90",
    ghost: "bg-white/[0.07] text-white/75 hover:bg-white/[0.11] hover:text-white",
    quiet: "text-white/55 hover:bg-white/[0.07] hover:text-white",
  }[variant];
  return <button type="button" className={`${base} ${look} ${className}`} {...rest} />;
}

export function IconButton({
  label,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/65 outline-none transition duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-white/35 disabled:pointer-events-none disabled:opacity-30 active:scale-95 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export const inputCls =
  "h-8 w-full rounded-[10px] bg-white/[0.05] px-3 text-[13px] text-white/90 outline-none ring-1 ring-inset ring-white/[0.06] transition-shadow duration-150 placeholder:text-white/30 focus:ring-white/20 [color-scheme:dark]";

export const textareaCls =
  "w-full resize-none rounded-[10px] bg-white/[0.05] px-3 py-2 text-[13.5px] leading-[1.4] text-white/90 outline-none ring-1 ring-inset ring-white/[0.06] transition-shadow duration-150 placeholder:text-white/30 focus:ring-white/20 [color-scheme:dark]";

export const selectCls =
  "h-8 min-w-0 flex-1 cursor-pointer rounded-[10px] bg-white/[0.05] px-2.5 text-[12.5px] text-white/80 outline-none ring-1 ring-inset ring-white/[0.06] focus:ring-white/20 [color-scheme:dark]";

export const scrollCls =
  "min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
