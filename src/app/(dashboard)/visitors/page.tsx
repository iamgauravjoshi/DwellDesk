"use client";

import { useMemo, useState } from "react";
import { DoorOpen, LogOut, UserPlus, UserRound } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  pretty,
  Select,
  Table,
  useToast,
  type Column,
} from "@/components/ui";
import { api, useAction, useList } from "@/lib/hooks";
import { fmtDateTime, timeAgo } from "@/lib/utils";

export default function VisitorsPage() {
  const toast = useToast();
  const { data, isLoading } = useList<any[]>(["visitors"], "/api/visitors");
  const { data: props } = useList<any[]>(["properties"], "/api/properties");
  const { data: tenants } = useList<any[]>(["tenants"], "/api/tenants");

  const [form, setForm] = useState({ propertyId: "", tenantId: "", name: "", relation: "", purpose: "" });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const keys = [["visitors"], ["dashboard"]];
  const checkIn = useAction((body: any) => api("/api/visitors", { method: "POST", body }), {
    invalidateKeys: keys,
    success: "Visitor checked in",
  });
  const checkOut = useAction((id: number) => api(`/api/visitors/${id}`, { method: "PATCH", body: { checkOut: true } }), {
    invalidateKeys: keys,
    success: "Visitor checked out",
  });

  const activeResidents = useMemo(
    () => (tenants || []).filter((t) => t.status === "active" && (!form.propertyId || t.propertyId === Number(form.propertyId))),
    [tenants, form.propertyId]
  );

  const onPremises = useMemo(() => (data || []).filter((v) => !v.checkOut), [data]);
  const history = useMemo(() => (data || []).filter((v) => v.checkOut).slice(0, 40), [data]);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Visitor name is required");
    if (!form.propertyId) return toast.error("Pick a property");
    await checkIn.mutateAsync({
      propertyId: Number(form.propertyId),
      tenantId: form.tenantId ? Number(form.tenantId) : null,
      name: form.name,
      relation: form.relation,
      purpose: form.purpose,
    });
    setForm({ ...form, name: "", relation: "", purpose: "" });
  };

  const historyCols: Column<any>[] = [
    {
      header: "Visitor",
      render: (v) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={v.name} className="h-8 w-8 text-[10px]" />
          <div>
            <p className="font-medium text-ink-800">{v.name}</p>
            <p className="text-[11px] text-ink-400">{v.relation ? `${pretty(v.relation)} of ` : "Visiting "}{v.tenantName ?? "—"}</p>
          </div>
        </div>
      ),
    },
    { header: "Property", render: (v) => <span className="text-ink-500">{v.propertyName}</span> },
    { header: "In", render: (v) => <span className="text-ink-500">{fmtDateTime(v.checkIn)}</span> },
    { header: "Out", render: (v) => <span className="text-ink-500">{fmtDateTime(v.checkOut)}</span> },
    { header: "Purpose", render: (v) => <span className="text-ink-500">{v.purpose || "—"}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Visitors" subtitle="Gate log — who is inside, and who came by" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Check-in form */}
        <Card title="Check in a visitor" subtitle="Takes 10 seconds at the gate" className="h-fit">
          <div className="space-y-4">
            <Field label="Visitor name" required>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Relation">
                <Select value={form.relation} onChange={(e) => set("relation", e.target.value)}>
                  <option value="">Select…</option>
                  {["Father", "Mother", "Brother", "Sister", "Friend", "Cousin", "Delivery", "Service"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Purpose">
                <Input value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="Weekend visit" />
              </Field>
            </div>
            <Field label="Property" required>
              <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value, tenantId: "" })}>
                <option value="">Select property…</option>
                {(props || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Visiting resident">
              <Select value={form.tenantId} onChange={(e) => set("tenantId", e.target.value)} disabled={!form.propertyId}>
                <option value="">General / at gate</option>
                {activeResidents.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}{t.roomNumber ? ` · ${t.roomNumber}-${t.bedLabel}` : ""}</option>
                ))}
              </Select>
            </Field>
            <Button className="w-full" onClick={submit} loading={checkIn.isPending}>
              <UserPlus className="h-4 w-4" /> Check in
            </Button>
          </div>
        </Card>

        {/* On premises + history */}
        <div className="space-y-5 xl:col-span-2">
          <Card title={`On premises now — ${onPremises.length}`} subtitle="Tap check-out when they leave" pad={false}>
            {isLoading ? (
              <div className="space-y-3 p-5">{[0, 1].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-100" />)}</div>
            ) : onPremises.length === 0 ? (
              <EmptyState compact icon={DoorOpen} title="No one inside" body="Visitors you check in will show up here live." />
            ) : (
              <ul className="divide-y divide-ink-900/5">
                {onPremises.map((v: any) => (
                  <li key={v.id} className="flex items-center gap-4 px-5 py-3.5">
                    <Avatar name={v.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{v.name}</p>
                      <p className="text-xs text-ink-400">
                        {v.relation ? `${pretty(v.relation)} of ` : "Visiting "}{v.tenantName ?? "property"} · {v.propertyName}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <Badge tone="emerald" dot>Inside · {timeAgo(v.checkIn)}</Badge>
                      {v.purpose && <p className="mt-1 text-[11px] text-ink-400">{v.purpose}</p>}
                    </div>
                    <Button size="sm" variant="outline" loading={checkOut.isPending && checkOut.variables === v.id} onClick={() => checkOut.mutate(v.id)}>
                      <LogOut className="h-3.5 w-3.5" /> Check out
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Visitor history" subtitle="Last 40 completed visits" pad={false}>
            <Table
              columns={historyCols}
              rows={history}
              loading={isLoading}
              empty={<EmptyState compact icon={UserRound} title="No visits logged yet" />}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
