"use client";

import { useState } from "react";
import { ConciergeBell, MoreHorizontal, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import {
  Avatar,
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
  Spinner,
  StatusBadge,
  useToast,
} from "@/components/ui";
import { useCrud, useList } from "@/lib/hooks";
import { inr, todayISO } from "@/lib/utils";

const ROLES = ["manager", "caretaker", "cook", "housekeeping", "security", "warden"];
const ROLE_TONE: Record<string, string> = {
  manager: "iris",
  caretaker: "sky",
  cook: "amber",
  housekeeping: "emerald",
  security: "violet",
  warden: "rose",
};

const emptyForm = { name: "", role: "caretaker", phone: "", salary: 14000, shift: "day", propertyId: "", joinedOn: todayISO(), status: "active" };

export default function StaffPage() {
  const { data, isLoading } = useList<any[]>(["staff"], "/api/staff");
  const { data: props } = useList<any[]>(["properties"], "/api/properties");
  const crud = useCrud<any>("staff", "/api/staff");
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [deleting, setDeleting] = useState<any | null>(null);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, role: s.role, phone: s.phone, salary: s.salary, shift: s.shift, propertyId: s.propertyId ?? "", joinedOn: s.joinedOn ?? todayISO(), status: s.status });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name and phone are required");
    const payload = { ...form, propertyId: form.propertyId || null, salary: Number(form.salary) || 0 };
    if (editing) await crud.update.mutateAsync({ id: editing.id, ...payload });
    else await crud.create.mutateAsync(payload);
    setFormOpen(false);
    setEditing(null);
  };

  const monthlyPayroll = (data || []).filter((s) => s.status === "active").reduce((a, s) => a + s.salary, 0);

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={`${(data || []).filter((s) => s.status === "active").length} on duty · payroll ${inr(monthlyPayroll)}/mo`}
        actions={<Button onClick={() => { setEditing(null); setForm(emptyForm); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add staff</Button>}
      />

      {isLoading ? (
        <Spinner />
      ) : (data || []).length === 0 ? (
        <Card>
          <EmptyState icon={ConciergeBell} title="No staff yet" body="Add caretakers, cooks, security and housekeeping so residents know who's who." action={<Button onClick={() => { setEditing(null); setForm(emptyForm); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add staff</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(data || []).map((s: any, i: number) => (
            <div key={s.id} className="animate-rise rounded-2xl border border-ink-900/8 bg-white p-5 shadow-card" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start gap-3.5">
                <Avatar name={s.name} className="h-11 w-11 text-[13px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink-900">{s.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
                    <Phone className="h-3 w-3" /> {s.phone}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={ROLE_TONE[s.role] ?? "slate"}>{pretty(s.role)}</Badge>
                    <Badge tone={s.shift === "day" ? "amber" : "iris"}>{pretty(s.shift)} shift</Badge>
                    {s.status !== "active" && <StatusBadge value={s.status} />}
                  </div>
                </div>
                <Dropdown
                  trigger={<span className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-900"><MoreHorizontal className="h-4.5 w-4.5" /></span>}
                  items={[
                    { label: "Edit", icon: Pencil, onClick: () => openEdit(s) },
                    {
                      label: s.status === "active" ? "Mark on leave" : "Mark active",
                      icon: ConciergeBell,
                      onClick: () => crud.update.mutate({ id: s.id, status: s.status === "active" ? "on_leave" : "active" }),
                    },
                    { label: "Remove", icon: Trash2, danger: true, onClick: () => setDeleting(s) },
                  ]}
                />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-ink-900/6 pt-3.5 text-xs text-ink-400">
                <span>{s.propertyName ?? "All properties"}</span>
                <span className="font-semibold tabular-nums text-ink-800">{inr(s.salary)}<span className="font-normal text-ink-300">/mo</span></span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? `Edit ${editing.name}` : "Add staff member"}
        width="sm:max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={crud.create.isPending || crud.update.isPending}>{editing ? "Save changes" : "Add staff"}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Full name" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ramesh Kumar" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role">
              <Select value={form.role} onChange={(e) => set("role", e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{pretty(r)}</option>)}
              </Select>
            </Field>
            <Field label="Shift">
              <Select value={form.shift} onChange={(e) => set("shift", e.target.value)}>
                <option value="day">Day</option>
                <option value="night">Night</option>
                <option value="rotational">Rotational</option>
              </Select>
            </Field>
          </div>
          <Field label="Phone" required>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98XXXXXXXX" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly salary (₹)">
              <Input type="number" min={0} step={500} value={form.salary} onChange={(e) => set("salary", e.target.value)} />
            </Field>
            <Field label="Joined on">
              <Input type="date" value={form.joinedOn} onChange={(e) => set("joinedOn", e.target.value)} />
            </Field>
          </div>
          <Field label="Property">
            <Select value={form.propertyId} onChange={(e) => set("propertyId", e.target.value)}>
              <option value="">All / floats between properties</option>
              {(props || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
        </div>
      </Drawer>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await crud.remove.mutateAsync(deleting.id); setDeleting(null); }}
        loading={crud.remove.isPending}
        title={`Remove ${deleting?.name}?`}
        body="They'll be removed from the staff roster immediately."
      />
    </div>
  );
}
