"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { create } from "zustand";
import {
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  CalendarDays,
  ConciergeBell,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Receipt,
  Settings,
  UserRound,
  UsersRound,
  UtensilsCrossed,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { cx } from "@/lib/utils";
import { api } from "@/lib/hooks";
import type { Session } from "@/lib/auth";

const useSidebar = create<{ open: boolean; set: (v: boolean) => void }>((set) => ({
  open: false,
  set: (open) => set({ open }),
}));

const NAV: {
  section: string;
  items: { href: string; label: string; icon: any }[];
}[] = [
  {
    section: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/reports", label: "Reports & P&L", icon: BarChart3 },
    ],
  },
  {
    section: "Property",
    items: [
      { href: "/properties", label: "Properties", icon: Building2 },
      { href: "/rooms", label: "Rooms & Beds", icon: BedDouble },
      { href: "/mess", label: "Mess & Food", icon: UtensilsCrossed },
    ],
  },
  {
    section: "People",
    items: [
      { href: "/residents", label: "Residents", icon: UsersRound },
      { href: "/staff", label: "Staff", icon: ConciergeBell },
      { href: "/visitors", label: "Visitors", icon: UserRound },
    ],
  },
  {
    section: "Finance",
    items: [
      { href: "/billing", label: "Billing & Payments", icon: Receipt },
      { href: "/expenses", label: "Expenses", icon: Wallet },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/complaints", label: "Complaints", icon: Wrench },
      { href: "/notices", label: "Notice Board", icon: Megaphone },
    ],
  },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {NAV.map((group) => (
        <div key={group.section}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            {group.section}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cx(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                      active
                        ? "bg-white/[0.08] text-white"
                        : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-iris-400" />
                    )}
                    <item.icon
                      className={cx(
                        "h-[17px] w-[17px]",
                        active ? "text-iris-300" : "text-zinc-500 group-hover:text-zinc-300"
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function Shell({ user, children }: { user: Session; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const open = useSidebar((s) => s.open);
  const setOpen = useSidebar((s) => s.set);

  useEffect(() => setOpen(false), [pathname, setOpen]);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Sidebar — desktop */}
      <aside className="texture-dark fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-ink-950 lg:flex">
        <div className="flex items-center gap-3 px-6 pb-5 pt-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-iris-400 to-iris-600 shadow-lg shadow-iris-900/50">
            <BedDouble className="h-5 w-5 text-white" />
          </span>
          <div>
            <p className="font-display text-[17px] font-bold leading-none tracking-tight text-white">
              PG·OS
            </p>
            <p className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Property Suite
            </p>
          </div>
        </div>
        <NavContent />
        <div className="border-t border-white/[0.07] p-3">
          <Link
            href="/settings"
            className={cx(
              "mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-white/[0.08] text-white"
                : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
            )}
          >
            <Settings className="h-[17px] w-[17px] text-zinc-500" />
            Settings
          </Link>
          <div className="mt-1 flex items-center gap-3 rounded-xl bg-white/[0.05] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-iris-500/20 text-[11px] font-bold text-iris-200">
              {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
              <p className="truncate text-[11px] capitalize text-zinc-500">{user.role}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar — mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} />
          <aside className="texture-dark absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink-950 shadow-pop">
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-iris-400 to-iris-600">
                  <BedDouble className="h-4.5 w-4.5 text-white" />
                </span>
                <span className="font-display text-[16px] font-bold text-white">PG·OS</span>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavContent onNavigate={() => setOpen(false)} />
            <div className="border-t border-white/[0.07] p-3">
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              >
                <LogOut className="h-[17px] w-[17px]" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-ink-900/8 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 md:px-8">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 text-[12.5px] font-medium text-ink-400 sm:flex">
            <CalendarDays className="h-4 w-4" />
            {today}
          </div>
          <div className="flex-1" />
          <Link
            href="/notices"
            className="relative rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-100"
            title="Notice board"
          >
            <Bell className="h-[18px] w-[18px]" />
          </Link>
          <div className="flex items-center gap-2.5 rounded-full border border-ink-900/8 bg-white py-1 pl-1 pr-3 shadow-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-iris-600 text-[10px] font-bold text-white">
              {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <span className="hidden text-[12.5px] font-semibold text-ink-700 sm:block">
              {user.name.split(" ")[0]}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 md:px-8">{children}</main>
    </div>
  );
}
