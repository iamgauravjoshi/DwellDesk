"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  IndianRupee,
  Mail,
  MessageCircle,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  Button,
  Card,
  Confirm,
  Field,
  Input,
  PageHeader,
} from "@/components/ui";
import { api, useAction } from "@/lib/hooks";

const INTEGRATIONS = [
  { icon: MessageCircle, name: "WhatsApp alerts", desc: "Rent reminders, receipts & notices over WhatsApp Business API", status: "Coming soon" },
  { icon: Smartphone, name: "SMS gateway", desc: "OTP entry passes and due-date nudges via SMS", status: "Coming soon" },
  { icon: Mail, name: "Email receipts", desc: "Auto-email PDF receipts on every collection", status: "Coming soon" },
  { icon: IndianRupee, name: "UPI payment links", desc: "Generate UPI collect links per invoice and auto-reconcile", status: "Coming soon" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("Aarav Mehta");
  const [resetOpen, setResetOpen] = useState(false);

  const saveProfile = useAction(() => api("/api/auth/me", { method: "PATCH", body: { name } }), {
    success: "Profile updated",
    silent: false,
  });

  const reseed = useAction(() => api("/api/seed", { method: "POST" }), {
    invalidateKeys: [
      ["dashboard"], ["properties"], ["rooms"], ["tenants"], ["billing"], ["payments"],
      ["expenses"], ["staff"], ["complaints"], ["visitors"], ["mess"], ["notices"], ["reports"],
    ],
    success: "Workspace refreshed with fresh demo data",
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Workspace preferences, integrations roadmap and data tools" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Profile" subtitle="Your owner account">
          <div className="space-y-4">
            <Field label="Display name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email" hint="sign-in email cannot change here">
              <Input value="owner@pgos.in" disabled />
            </Field>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] text-emerald-800">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Sessions are signed, httpOnly cookies. Passwords are scrypt-hashed server-side.
            </div>
            <div className="flex justify-end">
              <Button onClick={async () => { try { await saveProfile.mutateAsync(null); router.refresh(); } catch {} }} loading={saveProfile.isPending}>
                <Save className="h-4 w-4" /> Save profile
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Workspace" subtitle="Regional defaults">
          <dl className="space-y-3.5 text-sm">
            {[
              ["Currency", "Indian Rupee (₹, en-IN)"],
              ["Billing cycle", "Monthly — due on the 5th"],
              ["Late fee default", "₹300 after grace period"],
              ["Properties", "Bengaluru portfolio"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center gap-4">
                <dt className="w-40 shrink-0 text-ink-400">{k}</dt>
                <dd className="font-medium text-ink-800">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 border-t border-ink-900/6 pt-4">
            <p className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-400">
              <Building2 className="h-3.5 w-3.5" /> Data tools
            </p>
            <p className="mb-3 text-[12.5px] leading-relaxed text-ink-500">
              Reset this workspace to a fresh, fully populated demo dataset — handy after heavy
              experimentation.
            </p>
            <Button variant="outline" onClick={() => setResetOpen(true)}>
              <RefreshCw className="h-4 w-4" /> Reseed demo data
            </Button>
          </div>
        </Card>
      </div>

      <Card title="Integrations" subtitle="Where PG·OS is heading — hooks are built, wiring lands next">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {INTEGRATIONS.map((ig) => (
            <div key={ig.name} className="flex items-start gap-3.5 rounded-2xl border border-ink-900/8 bg-ink-50/50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-iris-600 shadow-sm">
                <ig.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-ink-900">{ig.name}</p>
                  <span className="rounded-full bg-ink-900/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    {ig.status}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{ig.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-iris-200/70 bg-iris-50 px-4 py-3 text-[12.5px] text-iris-800">
          <Send className="h-4 w-4 shrink-0" />
          Tenant portal (self-serve dues, receipts, complaints & mess menu) ships with the integrations milestone.
        </div>
      </Card>

      <Card title="About PG·OS">
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-500">
          PG·OS is a full-stack operations suite for PG and hostel owners: property and bed-level
          inventory, resident lifecycle with KYC and guardians, automated rent billing with dues and
          receipts, expense tracking with P&L, staff, visitors, complaints, mess planning and notice
          boards — all backed by an auditable activity log.
        </p>
      </Card>

      <Confirm
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={async () => {
          await reseed.mutateAsync(null);
          setResetOpen(false);
          router.push("/");
        }}
        loading={reseed.isPending}
        confirmLabel="Reseed workspace"
        title="Reset to demo data?"
        body="All current records are wiped and replaced with the seeded Sunrise Residency, Maple Heights and Orchid Stays dataset. Your login stays the same."
      />
    </div>
  );
}
