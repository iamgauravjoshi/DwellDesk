"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BadgePercent,
  CircleDollarSign,
  HandCoins,
  Receipt,
  ReceiptText,
  Trash2,
  Wallet,
  Zap,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Confirm,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  pretty,
  SearchInput,
  Segmented,
  Select,
  StatCard,
  StatusBadge,
  Table,
  useToast,
  type Column,
} from "@/components/ui";
import { api, useAction, useList } from "@/lib/hooks";
import { currentMonthKey, fmtDate, inr, isOverdue, lastMonths, monthLabel, todayISO } from "@/lib/utils";

function BillingInner() {
  const sp = useSearchParams();
  const toast = useToast();
  const { data: invoices, isLoading } = useList<any[]>(["billing"], "/api/invoices");
  const { data: payments, isLoading: payLoading } = useList<any[]>(["payments"], "/api/payments");

  const [tab, setTab] = useState(sp.get("tab") ?? "invoices");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState(sp.get("status") ?? "all");
  const [q, setQ] = useState("");
  const [genOpen, setGenOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(currentMonthKey());
  const [payFor, setPayFor] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: "upi", date: todayISO() });
  const [deletingInvoice, setDeletingInvoice] = useState<any | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<any | null>(null);

  const keys = [["billing"], ["payments"], ["dashboard"], ["tenants"]];

  const collect = useAction((body: any) => api("/api/payments", { method: "POST", body }), {
    invalidateKeys: keys,
    success: "Payment recorded & receipt created",
  });
  const delInvoice = useAction((id: number) => api(`/api/invoices/${id}`, { method: "DELETE" }), {
    invalidateKeys: keys,
    success: "Invoice deleted",
  });
  const delPayment = useAction((id: number) => api(`/api/payments/${id}`, { method: "DELETE" }), {
    invalidateKeys: keys,
    success: "Payment removed — invoice balance restored",
  });
  const generate = useAction((monthKey: string) => api("/api/invoices/generate", { method: "POST", body: { monthKey } }), {
    invalidateKeys: keys,
    silent: true,
  });

  const monthOptions = useMemo(() => lastMonths(8).reverse(), []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (invoices || []).filter((i) => {
      if (month !== "all" && i.monthKey !== month) return false;
      const effective = isOverdue(i) ? "overdue" : i.status;
      if (status !== "all" && effective !== status) return false;
      if (needle && !(`${i.tenantName} ${i.invoiceNo}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [invoices, month, status, q]);

  const sums = useMemo(() => {
    const mk = currentMonthKey();
    const thisMonth = (invoices || []).filter((i) => i.monthKey === mk);
    const collected = thisMonth.reduce((a, i) => a + i.paidAmount, 0);
    const billed = thisMonth.reduce((a, i) => a + i.amount + i.lateFee, 0);
    const overdue = (invoices || []).filter((i) => isOverdue(i));
    return {
      collected,
      billed,
      pending: (invoices || []).filter((i) => i.status !== "paid").reduce((a, i) => a + i.amount + i.lateFee - i.paidAmount, 0),
      overdueAmount: overdue.reduce((a, i) => a + i.amount + i.lateFee - i.paidAmount, 0),
      overdueCount: overdue.length,
    };
  }, [invoices]);

  const invoiceCols: Column<any>[] = [
    { header: "Invoice", render: (i) => <span className="font-mono text-[12.5px] font-semibold text-ink-800">{i.invoiceNo}</span> },
    {
      header: "Resident",
      render: (i) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={i.tenantName} className="h-8 w-8 text-[10px]" />
          <div>
            <p className="font-medium text-ink-800">{i.tenantName}</p>
            <p className="text-[11px] text-ink-400">{i.propertyName}</p>
          </div>
        </div>
      ),
    },
    { header: "Period", render: (i) => monthLabel(i.monthKey) },
    {
      header: "Amount", align: "right",
      render: (i) => (
        <span className="tabular-nums font-medium">
          {inr(i.amount)}
          {i.lateFee > 0 && <span className="ml-1 block text-[11px] text-rose-500 sm:inline">+{inr(i.lateFee)} late</span>}
        </span>
      ),
    },
    { header: "Balance", align: "right", render: (i) => <span className={`tabular-nums font-semibold ${i.amount + i.lateFee - i.paidAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>{inr(i.amount + i.lateFee - i.paidAmount)}</span> },
    { header: "Due date", render: (i) => <span className="text-ink-500">{fmtDate(i.dueDate)}</span> },
    { header: "Status", render: (i) => <StatusBadge value={isOverdue(i) ? "overdue" : i.status} /> },
    {
      header: "", align: "right", className: "w-32",
      render: (i) => (
        <div className="flex items-center justify-end gap-1">
          {i.status !== "paid" && (
            <Button size="sm" variant="soft" onClick={() => { setPayFor(i); setPayForm({ amount: i.amount + i.lateFee - i.paidAmount, method: "upi", date: todayISO() }); }}>
              <HandCoins className="h-3.5 w-3.5" /> Collect
            </Button>
          )}
          <button onClick={() => setDeletingInvoice(i)} className="rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-rose-50 hover:text-rose-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const paymentCols: Column<any>[] = [
    { header: "Receipt", render: (p) => <span className="font-mono text-[12.5px] font-semibold">{p.receiptNo}</span> },
    { header: "Date", render: (p) => fmtDate(p.date) },
    {
      header: "Resident",
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={p.tenantName} className="h-8 w-8 text-[10px]" />
          <div>
            <p className="font-medium text-ink-800">{p.tenantName}</p>
            <p className="text-[11px] text-ink-400">{p.invoiceNo ?? p.note ?? "—"}</p>
          </div>
        </div>
      ),
    },
    { header: "Method", render: (p) => <Badge tone={p.method}>{p.method.toUpperCase()}</Badge> },
    { header: "Amount", align: "right", render: (p) => <span className="font-semibold tabular-nums text-emerald-600">+{inr(p.amount)}</span> },
    {
      header: "", align: "right", className: "w-14",
      render: (p) => (
        <button onClick={() => setDeletingPayment(p)} className="rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-rose-50 hover:text-rose-600">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing & Payments"
        subtitle="Rent invoices, collections, dues and receipts"
        actions={
          <Button onClick={() => setGenOpen(true)}>
            <Zap className="h-4 w-4" /> Generate rent invoices
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected this month" value={inr(sums.collected)} icon={CircleDollarSign} tone="emerald" hint={`of ${inr(sums.billed)} billed`} />
        <StatCard label="Pending collections" value={inr(sums.pending)} icon={HandCoins} tone="amber" hint="across all open invoices" />
        <StatCard label="Overdue" value={inr(sums.overdueAmount)} icon={AlertTriangle} tone="rose" hint={`${sums.overdueCount} invoice${sums.overdueCount === 1 ? "" : "s"} past due date`} />
        <StatCard
          label="Collection rate"
          value={`${sums.billed ? Math.round((sums.collected / sums.billed) * 100) : 0}%`}
          icon={BadgePercent}
          tone="iris"
          hint="of this month's billed rent"
        />
      </div>

      <div className="inline-flex items-center gap-1 rounded-xl bg-ink-100/80 p-1">
        {[
          ["invoices", "Invoices", ReceiptText],
          ["payments", "Payments & receipts", Wallet],
        ].map(([v, label, Icon]: any) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-all ${tab === v ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resident or invoice no…" className="w-full sm:w-64" />
            <Segmented
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "partial", label: "Partial" },
                { value: "overdue", label: "Overdue" },
                { value: "paid", label: "Paid" },
              ]}
            />
            <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-40">
              <option value="all">All months</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </Select>
            <span className="ml-auto text-xs text-ink-400">{filtered.length} invoices</span>
          </div>
          <Card pad={false}>
            <Table
              columns={invoiceCols}
              rows={filtered}
              loading={isLoading}
              empty={<EmptyState icon={Receipt} title="No invoices here" body="Generate the month's rent invoices in one shot, or adjust your filters." action={<Button onClick={() => setGenOpen(true)}><Zap className="h-4 w-4" /> Generate invoices</Button>} />}
            />
          </Card>
        </>
      )}

      {tab === "payments" && (
        <Card title="Receipts ledger" subtitle="Every collection, newest first" pad={false}>
          <Table
            columns={paymentCols}
            rows={(payments || [])}
            loading={payLoading}
            empty={<EmptyState icon={Wallet} title="No payments yet" body="Recorded collections will appear here with receipt numbers." />}
          />
        </Card>
      )}

      {/* Generate modal */}
      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate rent invoices" subtitle="One invoice per active resident — duplicates are skipped automatically" width="max-w-md">
        <div className="space-y-4">
          <Field label="Billing month">
            <Select value={genMonth} onChange={(e) => setGenMonth(e.target.value)}>
              {[...new Set([currentMonthKey(), ...monthOptions])].map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </Select>
          </Field>
          <div className="rounded-xl border border-iris-200/70 bg-iris-50 p-3.5 text-[12.5px] leading-relaxed text-iris-800">
            Invoices get rent from each resident&#39;s profile and fall due on the 5th of the following month. Late fees are added manually when needed.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button
              loading={generate.isPending}
              onClick={async () => {
                const res = await generate.mutateAsync(genMonth);
                toast.success(`${res.created} invoice${res.created === 1 ? "" : "s"} created for ${monthLabel(genMonth)}${res.skipped ? ` · ${res.skipped} skipped` : ""}`);
                setGenOpen(false);
              }}
            >
              <Zap className="h-4 w-4" /> Generate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Collect modal */}
      <Modal open={!!payFor} onClose={() => setPayFor(null)} title={payFor ? `Collect on ${payFor.invoiceNo}` : ""} subtitle={payFor ? `${payFor.tenantName} · ${monthLabel(payFor.monthKey)}` : ""} width="max-w-md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount" required hint={payFor ? `balance ${inr(payFor.amount + payFor.lateFee - payFor.paidAmount)}` : undefined}>
              <Input type="number" min={1} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} />
            </Field>
            <Field label="Method">
              <Select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank transfer</option>
                <option value="card">Card</option>
              </Select>
            </Field>
          </div>
          <Field label="Date">
            <Input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPayFor(null)}>Cancel</Button>
            <Button
              loading={collect.isPending}
              disabled={!payForm.amount}
              onClick={async () => {
                await collect.mutateAsync({ tenantId: payFor.tenantId, invoiceId: payFor.id, amount: payForm.amount, method: payForm.method, date: payForm.date });
                setPayFor(null);
              }}
            >
              <Wallet className="h-4 w-4" /> Record {inr(payForm.amount || 0)}
            </Button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!deletingInvoice}
        onClose={() => setDeletingInvoice(null)}
        onConfirm={async () => { await delInvoice.mutateAsync(deletingInvoice.id); setDeletingInvoice(null); }}
        loading={delInvoice.isPending}
        title={`Delete ${deletingInvoice?.invoiceNo}?`}
        body="Linked payments stay in the ledger but lose their invoice reference."
      />
      <Confirm
        open={!!deletingPayment}
        onClose={() => setDeletingPayment(null)}
        onConfirm={async () => { await delPayment.mutateAsync(deletingPayment.id); setDeletingPayment(null); }}
        loading={delPayment.isPending}
        title={`Remove ${deletingPayment?.receiptNo}?`}
        body="The payment amount is restored to the invoice balance — like reversing an accidental entry."
      />
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingInner />
    </Suspense>
  );
}
