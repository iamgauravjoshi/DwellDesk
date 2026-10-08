"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  BedDouble,
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileText,
  HandCoins,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Receipt,
  Shield,
  UserRound,
  Wallet,
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
  pretty,
  Select,
  Spinner,
  StatusBadge,
  Table,
  type Column,
} from "@/components/ui";
import ResidentForm from "@/components/resident-form";
import { api, useAction, useList } from "@/lib/hooks";
import { cx, fmtDate, inr, isOverdue, monthLabel, todayISO } from "@/lib/utils";

function Detail() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const id = Number(params.id);

  const { data, isLoading } = useList<any>(["tenant", id], `/api/tenants/${id}`);
  const { data: props } = useList<any[]>(["properties"], "/api/properties");
  const [transferProp, setTransferProp] = useState<number>(0);
  const { data: rooms } = useList<any[]>(
    ["rooms", transferProp],
    `/api/rooms${transferProp ? `?propertyId=${transferProp}` : ""}`
  );

  const [tab, setTab] = useState("bills");
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferBed, setTransferBed] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payFor, setPayFor] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: "upi", date: todayISO() });

  const keys = [["tenant", id], ["tenants"], ["rooms"], ["dashboard"], ["billing"], ["payments"], ["properties"]];

  const edit = useAction((payload: any) => api(`/api/tenants/${id}`, { method: "PATCH", body: payload }), {
    invalidateKeys: keys,
    success: "Profile updated",
  });
  const checkout = useAction(() => api(`/api/tenants/${id}`, { method: "PATCH", body: { status: "moved_out" } }), {
    invalidateKeys: keys,
    success: "Checked out — bed freed",
  });
  const transfer = useAction((bedId: number) => api(`/api/tenants/${id}/transfer`, { method: "POST", body: { bedId } }), {
    invalidateKeys: keys,
    success: "Resident transferred",
  });
  const pay = useAction(
    (body: any) => api("/api/payments", { method: "POST", body }),
    { invalidateKeys: keys, success: "Payment recorded & receipt created" }
  );

  useEffect(() => {
    if (sp.get("transfer") === "1" && data) {
      setTransferProp(data.tenant.propertyId);
      setTransferOpen(true);
    }
  }, [sp, data]);

  const beds = useMemo(() => {
    const out: any[] = [];
    (rooms || []).forEach((r) =>
      r.beds.forEach((b: any) => {
        if (b.status === "available") out.push({ ...b, roomNumber: r.number, type: r.type, rent: r.rent });
      })
    );
    return out;
  }, [rooms]);

  if (isLoading || !data) return <Spinner />;
  const t = data.tenant;
  const { stats } = data;

  const invoiceCols: Column<any>[] = [
    { header: "Invoice", render: (i) => <span className="font-mono text-[12.5px] font-semibold">{i.invoiceNo}</span> },
    { header: "Period", render: (i) => monthLabel(i.monthKey) },
    {
      header: "Amount", align: "right",
      render: (i) => (
        <span className="tabular-nums">
          {inr(i.amount)}
          {i.lateFee > 0 && <span className="ml-1 text-xs text-rose-500">+{inr(i.lateFee)} fee</span>}
        </span>
      ),
    },
    { header: "Paid", align: "right", render: (i) => <span className="tabular-nums text-emerald-600">{inr(i.paidAmount)}</span> },
    { header: "Due by", render: (i) => <span className="text-ink-500">{fmtDate(i.dueDate)}</span> },
    { header: "Status", render: (i) => <StatusBadge value={isOverdue(i) ? "overdue" : i.status} /> },
    {
      header: "", align: "right", className: "w-28",
      render: (i) =>
        i.status !== "paid" ? (
          <Button
            size="sm"
            variant="soft"
            onClick={() => {
              setPayFor(i);
              setPayForm({ amount: i.amount + i.lateFee - i.paidAmount, method: "upi", date: todayISO() });
            }}
          >
            <HandCoins className="h-3.5 w-3.5" /> Collect
          </Button>
        ) : (
          <span className="text-xs text-ink-300">{i.method?.toUpperCase()}</span>
        ),
    },
  ];

  const paymentCols: Column<any>[] = [
    { header: "Receipt", render: (p) => <span className="font-mono text-[12.5px] font-semibold">{p.receiptNo}</span> },
    { header: "Date", render: (p) => fmtDate(p.date) },
    { header: "Method", render: (p) => <Badge tone={p.method}>{p.method.toUpperCase()}</Badge> },
    { header: "Note", render: (p) => <span className="text-ink-500">{p.note || "—"}</span> },
    { header: "Amount", align: "right", render: (p) => <span className="font-semibold tabular-nums text-emerald-600">+{inr(p.amount)}</span> },
  ];

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/residents")} className="flex items-center gap-1.5 text-[13px] font-medium text-ink-400 transition-colors hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> All residents
      </button>

      {/* Profile header */}
      <div className="animate-rise overflow-hidden rounded-2xl border border-ink-900/8 bg-white shadow-card">
        <div className="texture-dark bg-ink-950 p-6 text-white">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={t.name} className="h-16 w-16 text-lg ring-2 ring-white/20" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-semibold tracking-tight">{t.name}</h1>
                <StatusBadge value={t.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-zinc-400">
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {t.phone}</span>
                {t.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {t.email}</span>}
                {t.roomNumber ? (
                  <span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" /> {t.roomNumber}-{t.bedLabel}, {t.propertyName}</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {t.propertyName} · no bed</span>
                )}
                <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Since {fmtDate(t.joinDate)}</span>
              </div>
            </div>
            {t.status !== "moved_out" && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="!bg-white/10 !text-white !border-white/15 hover:!bg-white/20" onClick={() => { setTransferProp(t.propertyId); setTransferOpen(true); }}>
                  <ArrowLeftRight className="h-4 w-4" /> Transfer
                </Button>
                <Button variant="outline" className="!bg-white/10 !text-white !border-white/15 hover:!bg-white/20" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="danger" onClick={() => setCheckoutOpen(true)}>
                  <LogOut className="h-4 w-4" /> Check out
                </Button>
              </div>
            )}
            {t.status === "moved_out" && (
              <Badge tone="slate" className="!bg-white/10 !text-zinc-300 !ring-white/15">Moved out {fmtDate(t.moveOutDate)}</Badge>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-ink-900/6 sm:grid-cols-4">
          {[
            { label: "Monthly rent", value: inr(t.rent), icon: BedDouble },
            { label: "Deposit held", value: inr(t.deposit), icon: Shield },
            { label: "Collected so far", value: inr(stats.totalPaid), icon: CircleDollarSign },
            { label: "Outstanding", value: inr(stats.outstanding), icon: HandCoins, danger: stats.outstanding > 0 },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 px-5 py-4">
              <s.icon className={cx("h-4.5 w-4.5", s.danger ? "text-rose-500" : "text-ink-300")} />
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">{s.label}</p>
                <p className={cx("font-display text-[17px] font-semibold tabular-nums", s.danger ? "text-rose-600" : "text-ink-900")}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-ink-100/80 p-1">
        {[
          ["bills", "Bills & receipts", Receipt],
          ["overview", "Profile & KYC", UserRound],
          ["stays", "Stay history", Building2],
        ].map(([v, label, Icon]: any) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={cx(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-all",
              tab === v ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "bills" && (
        <div className="space-y-5">
          <Card title="Invoices" subtitle={`${data.invoices.length} raised · ${inr(stats.outstanding)} outstanding`} pad={false}>
            <Table columns={invoiceCols} rows={data.invoices} empty={<EmptyState compact icon={FileText} title="No invoices yet" body="Generate rent from Billing, or record a payment directly." />} />
          </Card>
          <Card title="Receipts" subtitle="Every rupee collected" pad={false}>
            <Table columns={paymentCols} rows={data.payments} empty={<EmptyState compact icon={Receipt} title="No payments recorded" />} />
          </Card>
        </div>
      )}

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card title="Identity & KYC">
            <dl className="space-y-3.5 text-sm">
              {[
                ["Occupation", `${pretty(t.occupation)}${t.organization ? ` · ${t.organization}` : ""}`],
                ["Gender", pretty(t.gender)],
                ["Date of birth", fmtDate(t.dob)],
                [`ID (${pretty(t.idType)})`, t.idNumber || "—"],
                ["Permanent address", t.permanentAddress || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <dt className="w-40 shrink-0 text-ink-400">{k}</dt>
                  <dd className="font-medium text-ink-800">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <div className="space-y-5">
            <Card title="Guardian & emergency">
              <dl className="space-y-3.5 text-sm">
                <div className="flex gap-4">
                  <dt className="w-40 shrink-0 text-ink-400">Guardian</dt>
                  <dd className="font-medium text-ink-800">{t.guardianName || "—"}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="w-40 shrink-0 text-ink-400">Guardian phone</dt>
                  <dd className="font-medium text-ink-800">{t.guardianPhone || "—"}</dd>
                </div>
              </dl>
            </Card>
            {t.notes && (
              <Card title="Notes">
                <p className="text-sm leading-relaxed text-ink-600">{t.notes}</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "stays" && (
        <Card title="Stay timeline" subtitle="Every bed this resident has occupied" pad={false}>
          {data.stays.length === 0 ? (
            <EmptyState compact icon={BedDouble} title="No stays recorded" body="Assign a bed to start the timeline." />
          ) : (
            <ul className="px-5 py-4">
              {data.stays.map((s: any, i: number) => (
                <li key={s.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className={cx("mt-1 h-3 w-3 rounded-full ring-4", i === 0 && !s.toDate ? "bg-iris-500 ring-iris-100" : "bg-ink-200 ring-ink-50")} />
                    {i < data.stays.length - 1 && <span className="mt-1 w-px flex-1 bg-ink-100" />}
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-semibold text-ink-900">
                      Room {s.roomNumber ?? "—"}{s.bedLabel ? ` · Bed ${s.bedLabel}` : ""} · {s.propertyName}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {fmtDate(s.fromDate)} → {s.toDate ? fmtDate(s.toDate) : "Present"} · {pretty(s.reason)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Edit */}
      <ResidentForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={t}
        pending={edit.isPending}
        onSubmit={async (payload) => { await edit.mutateAsync(payload); setEditOpen(false); }}
      />

      {/* Transfer */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer resident" subtitle={`Moving ${t.name} — old bed is freed automatically`} width="max-w-md">
        <div className="space-y-4">
          <Field label="Property">
            <Select value={transferProp || ""} onChange={(e) => { setTransferProp(Number(e.target.value)); setTransferBed(""); }}>
              <option value="">Select…</option>
              {(props || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Available bed" hint={`${beds.length} free`}>
            <Select value={transferBed} onChange={(e) => setTransferBed(e.target.value)} disabled={!transferProp}>
              <option value="">Select bed…</option>
              {beds.map((b: any) => (
                <option key={b.id} value={b.id}>{b.roomNumber}-{b.label} · {pretty(b.type)} · {inr(b.rent)}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button
              disabled={!transferBed}
              loading={transfer.isPending}
              onClick={async () => { await transfer.mutateAsync(Number(transferBed)); setTransferOpen(false); }}
            >
              <ArrowLeftRight className="h-4 w-4" /> Transfer here
            </Button>
          </div>
        </div>
      </Modal>

      {/* Checkout */}
      <Confirm
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={async () => { await checkout.mutateAsync(null); setCheckoutOpen(false); }}
        loading={checkout.isPending}
        confirmLabel="Check out"
        title={`Check out ${t.name}?`}
        body={`Bed ${t.roomNumber ?? ""}-${t.bedLabel ?? ""} will be freed, the stay closed, and ${t.name} moves to past residents. Outstanding dues (${inr(stats.outstanding)}) stay on record.`}
      />

      {/* Collect payment */}
      <Modal open={!!payFor} onClose={() => setPayFor(null)} title={payFor ? `Collect for ${payFor.invoiceNo}` : ""} subtitle={payFor ? `${monthLabel(payFor.monthKey)} rent · ${pretty(isOverdue(payFor) ? "overdue" : payFor.status)}` : ""} width="max-w-md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount" required>
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
              loading={pay.isPending}
              onClick={async () => {
                await pay.mutateAsync({ tenantId: id, invoiceId: payFor.id, amount: payForm.amount, method: payForm.method, date: payForm.date });
                setPayFor(null);
              }}
            >
              <Wallet className="h-4 w-4" /> Record {inr(payForm.amount)}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ResidentDetailPage() {
  return (
    <Suspense>
      <Detail />
    </Suspense>
  );
}
