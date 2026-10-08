"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Confirm,
  Drawer,
  Dropdown,
  EmptyState,
  Field,
  Input,
  PageHeader,
  pretty,
  Select,
  StatCard,
  Table,
  Textarea,
  useToast,
  type Column,
} from "@/components/ui";
import { useCrud, useList } from "@/lib/hooks";
import { currentMonthKey, fmtDate, inr, monthKeyOf, todayISO } from "@/lib/utils";

const CATEGORIES = ["utilities", "salary", "groceries", "maintenance", "supplies", "marketing", "other"];
const CAT_TONE: Record<string, string> = {
  utilities: "sky",
  salary: "violet",
  groceries: "emerald",
  maintenance: "amber",
  supplies: "iris",
  marketing: "rose",
  other: "slate",
};

const emptyForm = { propertyId: "", category: "utilities", vendor: "", amount: 0, date: todayISO(), note: "" };

export default function ExpensesPage() {
  const { data, isLoading } = useList<any[]>(["expenses"], "/api/expenses");
  const { data: props } = useList<any[]>(["properties"], "/api/properties");
  const crud = useCrud<any>("expenses", "/api/expenses");
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const filtered = useMemo(
    () =>
      (data || []).filter(
        (e) =>
          (propertyFilter === "all" || e.propertyId === Number(propertyFilter)) &&
          (categoryFilter === "all" || e.category === categoryFilter)
      ),
    [data, propertyFilter, categoryFilter]
  );

  const thisMonthTotal = useMemo(
    () => (data || []).filter((e) => e.date?.startsWith(currentMonthKey())).reduce((a, e) => a + e.amount, 0),
    [data]
  );
  const lastMonthTotal = useMemo(() => {
    const d = new Date();
    const prev = monthKeyOf(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    return (data || []).filter((e) => e.date?.startsWith(prev)).reduce((a, e) => a + e.amount, 0);
  }, [data]);
  const topCategory = useMemo(() => {
    const map = new Map<string, number>();
    (data || []).forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    const top = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0] as string, total: top[1] as number } : null;
  }, [data]);

  const openEdit = (e: any) => {
    setEditing(e);
    setForm({ propertyId: e.propertyId ?? "", category: e.category, vendor: e.vendor ?? "", amount: e.amount, date: e.date, note: e.note ?? "" });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Enter a valid amount");
    const payload = { ...form, propertyId: form.propertyId || null, amount: Number(form.amount) };
    if (editing) await crud.update.mutateAsync({ id: editing.id, ...payload });
    else await crud.create.mutateAsync(payload);
    setFormOpen(false);
    setEditing(null);
  };

  const columns: Column<any>[] = [
    { header: "Date", render: (e) => <span className="text-ink-500">{fmtDate(e.date)}</span> },
    {
      header: "Category",
      render: (e) => <Badge tone={CAT_TONE[e.category] ?? "slate"}>{pretty(e.category)}</Badge>,
    },
    {
      header: "Vendor / note",
      render: (e) => (
        <div>
          <p className="font-medium text-ink-800">{e.vendor || "—"}</p>
          {e.note && <p className="max-w-64 truncate text-[11.5px] text-ink-400">{e.note}</p>}
        </div>
      ),
    },
    { header: "Property", render: (e) => <span className="text-ink-500">{e.propertyName ?? "All / shared"}</span> },
    { header: "Amount", align: "right", render: (e) => <span className="font-semibold tabular-nums text-ink-900">−{inr(e.amount)}</span> },
    {
      header: "", align: "right", className: "w-14",
      render: (e) => (
        <Dropdown
          trigger={<span className="inline-flex rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-900"><MoreHorizontal className="h-4.5 w-4.5" /></span>}
          items={[
            { label: "Edit", icon: Pencil, onClick: () => openEdit(e) },
            { label: "Delete", icon: Trash2, danger: true, onClick: () => setDeleting(e) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expenses"
        subtitle="Where the money goes — vendors, utilities, payroll and more"
        actions={<Button onClick={() => { setEditing(null); setForm(emptyForm); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add expense</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Spent this month" value={inr(thisMonthTotal)} icon={Wallet} tone="amber" hint={`vs ${inr(lastMonthTotal)} last month`} />
        <StatCard
          label="Top category"
          value={topCategory ? pretty(topCategory.name) : "—"}
          icon={Receipt}
          tone="violet"
          hint={topCategory ? `${inr(topCategory.total)} all time` : "no expenses yet"}
        />
        <StatCard label="All-time spend" value={inr((data || []).reduce((a, e) => a + e.amount, 0))} icon={Receipt} tone="slate" hint={`${(data || []).length} entries`} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="w-48">
          <option value="all">All properties</option>
          {(props || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-44">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{pretty(c)}</option>)}
        </Select>
        <span className="ml-auto text-xs text-ink-400">{filtered.length} entries</span>
      </div>

      <Card pad={false}>
        <Table
          columns={columns}
          rows={filtered}
          loading={isLoading}
          empty={<EmptyState icon={Wallet} title="No expenses recorded" body="Track utilities, groceries, salaries and vendor bills to see true profitability." action={<Button onClick={() => { setEditing(null); setForm(emptyForm); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add expense</Button>} />}
        />
      </Card>

      <Drawer
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? "Edit expense" : "Add expense"}
        subtitle="Pick a category — P&L reports group by these"
        width="sm:max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={crud.create.isPending || crud.update.isPending}>{editing ? "Save changes" : "Add expense"}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Category" required>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  className={form.category === c
                    ? "rounded-full bg-ink-900 px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-500 hover:bg-ink-200"}
                >
                  {pretty(c)}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (₹)" required>
              <Input type="number" min={1} value={form.amount || ""} onChange={(e) => set("amount", e.target.value)} placeholder="4500" />
            </Field>
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
          </div>
          <Field label="Vendor">
            <Input value={form.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="Metro Wholesale" />
          </Field>
          <Field label="Property">
            <Select value={form.propertyId} onChange={(e) => set("propertyId", e.target.value)}>
              <option value="">Shared / all properties</option>
              {(props || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Note">
            <Textarea rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="What was this for?" />
          </Field>
        </div>
      </Drawer>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await crud.remove.mutateAsync(deleting.id); setDeleting(null); }}
        loading={crud.remove.isPending}
        title="Delete this expense?"
        body={`${pretty(deleting?.category)} · ${inr(deleting?.amount ?? 0)} on ${fmtDate(deleting?.date)}`}
      />
    </div>
  );
}
