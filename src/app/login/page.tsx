"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  Building2,
  KeyRound,
  LogIn,
  Mail,
  Receipt,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Button, Input, useToast } from "@/components/ui";
import { api } from "@/lib/hooks";

const FEATURES = [
  { icon: Building2, label: "Properties, rooms & bed-level occupancy" },
  { icon: UsersRound, label: "Residents, KYC, guardians & stay history" },
  { icon: Receipt, label: "Rent billing, dues, receipts & P&L" },
];

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("owner@pgos.in");
  const [password, setPassword] = useState("demo1234");
  const [pending, setPending] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setPending(true);
    try {
      await api("/api/auth/login", { method: "POST", body: { email, password } });
      toast.success("Welcome back");
      router.replace("/");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Sign in failed");
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="texture-dark relative hidden w-[46%] flex-col justify-between overflow-hidden bg-ink-950 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-iris-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-iris-400/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-iris-400 to-iris-600 shadow-lg shadow-iris-900/60">
            <BedDouble className="h-5.5 w-5.5 text-white" />
          </span>
          <div>
            <p className="font-display text-xl font-bold tracking-tight">PG·OS</p>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              PG & Hostel Suite
            </p>
          </div>
        </div>

        <div className="relative">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-iris-200">
            <Sparkles className="h-3.5 w-3.5" /> The operating system for shared living
          </p>
          <h1 className="font-display text-[40px] font-semibold leading-[1.08] tracking-tight">
            Run every bed,
            <br />
            every bill,{" "}
            <span className="bg-gradient-to-r from-iris-300 to-iris-500 bg-clip-text text-transparent">
              one dashboard.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-400">
            From check-in to check-out — manage rooms, residents, rent, staff,
            complaints and finances for all your PGs and hostels in one place.
          </p>
          <ul className="mt-8 space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-3 text-[13.5px] text-zinc-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.07]">
                  <f.icon className="h-4 w-4 text-iris-300" />
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-8 border-t border-white/10 pt-6">
          {[
            ["38", "Beds managed"],
            ["3", "Properties"],
            ["94%", "Collection rate"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="font-display text-2xl font-semibold">{v}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-iris-400 to-iris-600">
              <BedDouble className="h-5 w-5 text-white" />
            </span>
            <span className="font-display text-lg font-bold text-ink-900">PG·OS</span>
          </div>

          <h2 className="font-display text-[26px] font-semibold tracking-tight text-ink-900">
            Sign in to your workspace
          </h2>
          <p className="mt-1.5 text-sm text-ink-400">
            Welcome back — your residents missed you.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium text-ink-600">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium text-ink-600">Password</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button type="submit" size="lg" loading={pending} className="w-full">
              {!pending && <LogIn className="h-4 w-4" />}
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-iris-200/70 bg-iris-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-iris-800">
              <Sparkles className="h-3.5 w-3.5" /> Demo workspace
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-iris-700/80">
              Email <span className="font-semibold">owner@pgos.in</span> · Password{" "}
              <span className="font-semibold">demo1234</span> — pre-filled, just hit
              sign in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
