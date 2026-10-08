"use client";

import { useState } from "react";
import { Coffee, Moon, Pencil, Salad, Sun, Sunrise, UtensilsCrossed } from "lucide-react";
import {
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  Textarea,
} from "@/components/ui";
import { api, useAction, useList } from "@/lib/hooks";
import { cx, inr } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = [
  { key: "breakfast", label: "Breakfast", icon: Sunrise, time: "7:30 – 9:30 AM" },
  { key: "lunch", label: "Lunch", icon: Sun, time: "12:30 – 2:00 PM" },
  { key: "snacks", label: "Snacks", icon: Coffee, time: "4:30 – 5:30 PM" },
  { key: "dinner", label: "Dinner", icon: Moon, time: "7:30 – 9:30 PM" },
] as const;

export default function MessPage() {
  const { data, isLoading } = useList<any[]>(["mess"], "/api/mess");
  const { data: expenses } = useList<any[]>(["expenses"], "/api/expenses");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ breakfast: "", lunch: "", snacks: "", dinner: "" });

  const save = useAction(
    (body: any) => api("/api/mess", { method: "POST", body }),
    { invalidateKeys: [["mess"]], success: "Menu updated" }
  );

  const grocerySpend = (expenses || [])
    .filter((e) => e.category === "groceries" && e.date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((a, e) => a + e.amount, 0);

  const rows = DAYS.map((d, i) => {
    const found = (data || []).find((m) => m.dayOfWeek === i) ?? { dayOfWeek: i, breakfast: "", lunch: "", snacks: "", dinner: "" };
    return { ...found, day: d };
  });

  const todayIdx = (new Date().getDay() + 6) % 7;

  const openEdit = (row: any) => {
    setEditing(row);
    setForm({ breakfast: row.breakfast, lunch: row.lunch, snacks: row.snacks, dinner: row.dinner });
  };

  return (
    <div>
      <PageHeader
        title="Mess & Food"
        subtitle={`Weekly menu for all properties${grocerySpend ? ` · groceries spent ${inr(grocerySpend)} this month` : ""}`}
      />

      {isLoading ? (
        <Spinner />
      ) : (data || []).length === 0 ? (
        <Card>
          <EmptyState icon={UtensilsCrossed} title="No menu published" body="Set up the weekly mess menu so residents know what's cooking." action={<Button onClick={() => openEdit(rows[0])}><Pencil className="h-4 w-4" /> Start with Monday</Button>} />
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((row, i) => (
            <div
              key={row.dayOfWeek}
              className={cx(
                "animate-rise rounded-2xl border bg-white shadow-card",
                row.dayOfWeek === todayIdx ? "border-iris-300 ring-2 ring-iris-100" : "border-ink-900/8"
              )}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center justify-between border-b border-ink-900/6 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className={cx(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    row.dayOfWeek === todayIdx ? "bg-iris-600 text-white" : "bg-ink-100 text-ink-400"
                  )}>
                    <Salad className="h-4 w-4" />
                  </span>
                  <p className="font-display text-[15px] font-semibold tracking-tight">
                    {row.day}
                    {row.dayOfWeek === todayIdx && <span className="ml-2 rounded-full bg-iris-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-iris-600">Today</span>}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit day
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-4">
                {MEALS.map((m, mi) => (
                  <div key={m.key} className={cx("px-5 py-4", mi < MEALS.length - 1 && "xl:border-r xl:border-ink-900/5")}>
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">
                      <m.icon className="h-3.5 w-3.5 text-iris-400" /> {m.label}
                      <span className="ml-auto font-medium normal-case tracking-normal text-ink-300">{m.time}</span>
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
                      {row[m.key] || <span className="italic text-ink-300">Not set</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.day}'s menu` : ""}
        subtitle="Separate items with commas — residents see this on their portal"
        width="sm:max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={async () => { await save.mutateAsync({ dayOfWeek: editing.dayOfWeek, ...form }); setEditing(null); }} loading={save.isPending}>
              Save menu
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {MEALS.map((m) => (
            <Field key={m.key} label={m.label} hint={m.time}>
              <Textarea rows={2} value={form[m.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [m.key]: e.target.value })} placeholder="Idli, sambar, chutney…" />
            </Field>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
