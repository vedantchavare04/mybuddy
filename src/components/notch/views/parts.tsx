import type { ReactNode } from "react";
import { X } from "lucide-react";

export function ViewHeader({
  leading,
  onClose,
}: {
  leading: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex h-6 items-center justify-between">
      <div className="flex min-w-0 items-center gap-2 text-[12px] font-medium tracking-[0.005em] text-white/40">
        {leading}
      </div>
      <button
        type="button"
        aria-label="Collapse"
        onClick={onClose}
        className="-mr-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white/30 outline-none transition-colors duration-150 hover:bg-white/[0.07] hover:text-white/75 focus-visible:ring-1 focus-visible:ring-white/30"
      >
        <X size={13} strokeWidth={1.8} />
      </button>
    </div>
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