"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { create } from "zustand";
import {
  CheckCircle2,
  AlertCircle,
  Inbox,
  Loader2,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { avatarTone, cx, initials } from "@/lib/utils";

/* ------------------------------------------------------------------ Toast */
type Toast = { id: number; kind: "success" | "error"; msg: string };

const useToastStore = create<{
  toasts: Toast[];
  push: (kind: Toast["kind"], msg: string) => void;
  dismiss: (id: number) => void;
}>((set) => ({
  toasts: [],
  push: (kind, msg) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, msg }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  const push = useToastStore((s) => s.push);
  return useMemo(
    () => ({
      success: (msg: string) => push("success", msg),
      error: (msg: string) => push("error", msg),
    }),
    [push]
  );
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast pointer-events-auto flex items-start gap-3 rounded-xl border border-ink-800/10 bg-ink-900 px-4 py-3 text-sm text-white shadow-pop"
        >
          {t.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          )}
          <p className="flex-1 leading-snug">{t.msg}</p>
          <button onClick={() => dismiss(t.id)} className="text-white/50 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- Button */
type BtnVariant = "primary" | "dark" | "outline" | "ghost" | "danger" | "soft";

const BTN: Record<BtnVariant, string> = {
  primary:
    "bg-iris-600 text-white hover:bg-iris-700 shadow-sm disabled:hover:bg-iris-600",
  dark: "bg-ink-900 text-white hover:bg-ink-800 shadow-sm",
  outline:
    "border border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
  soft: "bg-iris-50 text-iris-700 hover:bg-iris-100",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-9.5 px-4 text-sm",
        size === "lg" && "h-11 px-5 text-sm",
        BTN[variant],
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Badge */
const TONE_BADGE: Record<string, string> = {
  slate: "bg-ink-100 text-ink-600 ring-ink-200/60",
  iris: "bg-iris-50 text-iris-700 ring-iris-200/70",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  amber: "bg-amber-50 text-amber-700 ring-amber-200/70",
  rose: "bg-rose-50 text-rose-700 ring-rose-200/70",
  sky: "bg-sky-50 text-sky-700 ring-sky-200/70",
  violet: "bg-violet-50 text-violet-700 ring-violet-200/70",
};

const TONE_DOT: Record<string, string> = {
  slate: "bg-ink-400",
  iris: "bg-iris-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
};

export function Badge({
  tone = "slate",
  children,
  dot,
  className,
}: {
  tone?: string;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        TONE_BADGE[tone] || TONE_BADGE.slate,
        className
      )}
    >
      {dot && <span className={cx("h-1.5 w-1.5 rounded-full", TONE_DOT[tone] || TONE_DOT.slate)} />}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, string> = {
  active: "emerald",
  reserved: "sky",
  moved_out: "slate",
  exited: "slate",
  on_leave: "amber",
  available: "emerald",
  occupied: "iris",
  maintenance: "amber",
  paid: "emerald",
  partial: "amber",
  pending: "amber",
  overdue: "rose",
  open: "amber",
  in_progress: "sky",
  resolved: "emerald",
  low: "slate",
  medium: "amber",
  high: "rose",
  cash: "slate",
  upi: "iris",
  bank: "sky",
  card: "violet",
  pg: "iris",
  hostel: "sky",
  coliving: "violet",
  day: "amber",
  night: "iris",
  rotational: "sky",
  all: "slate",
  residents: "emerald",
  staff: "sky",
};

export const pretty = (s?: string | null) =>
  (s || "—").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function StatusBadge({ value, className }: { value?: string | null; className?: string }) {
  return (
    <Badge tone={STATUS_TONES[value || ""] || "slate"} dot className={className}>
      {pretty(value)}
    </Badge>
  );
}

/* ------------------------------------------------------------------- Card */
export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  pad = true,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-ink-900/8 bg-white shadow-card",
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-ink-900/6 px-5 py-4">
          <div>
            {typeof title === "string" ? (
              <h3 className="font-display text-[15px] font-semibold tracking-tight">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cx(pad && "p-5")}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------- Stat card */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "iris",
  delta,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: "iris" | "emerald" | "amber" | "rose" | "sky" | "violet" | "slate";
  delta?: ReactNode;
}) {
  const ICON_TONE: Record<string, string> = {
    iris: "bg-iris-50 text-iris-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-ink-100 text-ink-500",
  };
  return (
    <div className="rounded-2xl border border-ink-900/8 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-ink-400">{label}</p>
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl", ICON_TONE[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="font-display mt-1 text-[26px] font-semibold leading-none tracking-tight text-ink-900">
        {value}
      </p>
      {(hint || delta) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-ink-400">
          {delta}
          {hint}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Form fields */
export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 flex items-baseline gap-1 text-[12.5px] font-medium text-ink-600">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {hint && <span className="ml-auto text-[11px] font-normal text-ink-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cx(
        "h-9.5 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-300 focus:border-iris-400 focus:outline-none focus:ring-2 focus:ring-iris-100 disabled:bg-ink-50 disabled:text-ink-400",
        className
      )}
    />
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cx(
        "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-iris-400 focus:outline-none focus:ring-2 focus:ring-iris-100",
        className
      )}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cx(
        "h-9.5 w-full cursor-pointer rounded-lg border border-ink-200 bg-white px-2.5 text-sm text-ink-900 focus:border-iris-400 focus:outline-none focus:ring-2 focus:ring-iris-100 disabled:bg-ink-50 disabled:text-ink-400",
        className
      )}
    >
      {children}
    </select>
  );
}

export function SearchInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cx("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
      <Input className="pl-9" {...rest} />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cx("inline-flex flex-wrap items-center gap-1 rounded-xl bg-ink-100/80 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all",
            o.value === value
              ? "bg-white text-ink-900 shadow-sm"
              : "text-ink-500 hover:text-ink-800"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- Avatar */
export function Avatar({ name, className }: { name?: string; className?: string }) {
  return (
    <span
      className={cx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
        avatarTone(name),
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

/* ----------------------------------------------------------------- Loader */
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cx("flex items-center justify-center py-16", className)}>
      <Loader2 className="h-6 w-6 animate-spin text-iris-500" />
    </div>
  );
}

/* ------------------------------------------------------------ Empty state */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  action,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8" : "py-14"
      )}
    >
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
        <Icon className="h-5.5 w-5.5" />
      </span>
      <p className="font-display text-sm font-semibold text-ink-800">{title}</p>
      {body && <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink-400">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Table */
export type Column<T = any> = {
  header: ReactNode;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
};

export function Table<T = any>({
  columns,
  rows,
  loading,
  empty,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-900/8 text-left">
            {columns.map((c, i) => (
              <th
                key={i}
                className={cx(
                  "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.className
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 6 }).map((_, r) => (
              <tr key={r} className="border-b border-ink-900/5">
                {columns.map((_, c) => (
                  <td key={c} className="px-4 py-3.5">
                    <div className="h-4 animate-pulse rounded-md bg-ink-100" style={{ width: `${45 + ((r * 13 + c * 29) % 45)}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && (rows || []).map((row, i) => (
            <tr
              key={(row as any)?.id ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cx(
                "border-b border-ink-900/5 transition-colors last:border-0",
                onRowClick && "cursor-pointer hover:bg-iris-50/40"
              )}
            >
              {columns.map((c, j) => (
                <td
                  key={j}
                  className={cx(
                    "px-4 py-3.5 align-middle text-ink-700",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.className
                  )}
                >
                  {c.render ? c.render(row, i) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && (rows || []).length === 0 && <div>{empty}</div>}
    </div>
  );
}

/* ---------------------------------------------------------- Modal & drawer */
function Overlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50">
      <div className="animate-fade absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]" onClick={onClose} />
      {children}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <Overlay onClose={onClose}>
      <div className="absolute inset-0 overflow-y-auto p-4 sm:p-8">
        <div
          className={cx(
            "animate-pop relative mx-auto w-full rounded-2xl bg-white shadow-pop",
            width
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-ink-900/6 px-6 py-4">
            <div>
              <h3 className="font-display text-[16px] font-semibold tracking-tight">{title}</h3>
              {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </header>
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </Overlay>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "sm:max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <Overlay onClose={onClose}>
      <aside
        className={cx(
          "animate-slide-in absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-pop",
          width
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink-900/6 px-6 py-4">
          <div>
            <h3 className="font-display text-[16px] font-semibold tracking-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="border-t border-ink-900/6 bg-ink-50/50 px-6 py-4">{footer}</footer>}
      </aside>
    </Overlay>
  );
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Delete",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
      {body && <p className="text-sm leading-relaxed text-ink-500">{body}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------------- Dropdown */
export function Dropdown({
  trigger,
  items,
  align = "right",
}: {
  trigger: ReactNode;
  items: { label: string; icon?: LucideIcon; onClick: () => void; danger?: boolean }[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <span onClick={() => setOpen((v) => !v)}>{trigger}</span>
      {open && (
        <div
          className={cx(
            "animate-pop absolute z-30 mt-1.5 w-48 overflow-hidden rounded-xl border border-ink-900/8 bg-white py-1 shadow-pop",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={cx(
                "flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium transition-colors",
                item.danger
                  ? "text-rose-600 hover:bg-rose-50"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              )}
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Page header */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="animate-rise mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-ink-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[13px] text-ink-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
