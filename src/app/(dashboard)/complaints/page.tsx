"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCheck,
  CirclePlay,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";
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
  Textarea,
  useToast,
} from "@/components/ui";
import { useCrud, useList } from "@/lib/hooks";
import { timeAgo } from "@/lib/utils";

const CATEGORIES = ["plumbing", "electrical", "cleaning", "internet", "food", "furniture", "maintenance", "other"];
const CAT_TONE: Record<string, string> = {
  plumbing: "sky",
  electrical: "amber",
  cleaning: "emerald",
  internet: "iris",
  food: "rose",
  furniture: "violet",
  maintenance: "slate",
  other: "slate",
};
const COLUMNS = [
  { key: "open", label: "Open", tone: "amber" },
  { key: "in_progress", label: "In progress", tone: "sky" },
  { key: "resolved", label: "Resolved", tone: "emerald" },
] as const;

const emptyForm = { title: "", propertyId: "", tenantId: "", category: "maintenance", priority: "medium", description: "" };

export default function ComplaintsPage() {
  const { data, isLoading } = useList<any[]>(["complaints"], "/api/complaints");
  const { data: props } = useList<any[]>(["properties"], "/api/properties");
  const { data: tenants } = useList<any[]>(["tenants"], "/api/tenants");
  const crud = useCrud<any>("complaints", "/api/complaints");
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [deleting, setDeleting] = useState<any | null>(null);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const residentsForProperty = useMemo(
    () => (tenants || []).filter((t) => t.status === "active" && (!form.propertyId || t.propertyId === Number(form.propertyId))),
    [tenants, form.propertyId]
  );

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = { open: [], in_progress: [], resolved: [] };
    (data || []).forEach((c) => (g[c.status] ?? g.open).push(c));
    return g;
  }, [data]);

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ title: c.title, propertyId: c.propertyId, tenantId: c.tenantId ?? "", category: c.category, priority: c.priority, description: c.description ?? "" });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Give the issue a short title");
    if (!form.propertyId) return toast.error("Pick a property");
    const payload = { ...form, propertyId: Number(form.propertyId), tenantId: form.tenantId ? Number(form.tenantId) : null };
    if (editing) await crud.update.mutateAsync({ id: editing.id, ...payload });
    else await crud.create.mutateAsync(payload);
    setFormOpen(false);
    setEditing(null);
  };

  const move = (c: any, status: string) => crud.update.mutate({ id: c.id, status });

  return (
    <div>
      <PageHeader
        title="Complaints & Maintenance"
        subtitle="Triage issues across properties — keep residents happy"
        actions={<Button onClick={() => { setEditing(null); setForm(emptyForm); setFormOpen(true); }}><Plus className="h-4 w-4" /> Log complaint</Button>}
      />

      {isLoading ? (
        <Spinner />
      ) : (data || []).length === 0 ? (
        <Card>
          <EmptyState icon={Wrench} title="No complaints logged" body="When residents report issues, log them here and track them to resolution." action={<Button onClick={() => { setEditing(null); setForm(emptyForm); setFormOpen(true); }}><Plus className="h-4 w-4" /> Log complaint</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className="rounded-2xl border border-ink-900/8 bg-white/60 p-3">
              <div className="mb-3 flex items-center justify-between px-2 pt-1">
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-500">
                  <Badge tone={col.tone} dot>{col.label}</Badge>
                </p>
                <span className="text-xs font-semibold text-ink-400">{grouped[col.key].length}</span>
              </div>
              <div className="space-y-3">
                {grouped[col.key].length === 0 && (
                  <div className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-xs text-ink-300">
                    Nothing here
                  </div>
                )}
                {grouped[col.key].map((c) => (
                  <div key={c.id} className="animate-rise rounded-xl border border-ink-900/8 bg-white p-4 shadow-card">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13.5px] font-semibold leading-snug text-ink-900">{c.title}</p>
                      <Dropdown
                        trigger={<span className="shrink-0 rounded-md p-1 text-ink-300 hover:bg-ink-100 hover:text-ink-900"><MoreHorizontal className="h-4 w-4" /></span>}
                        items={[
                          ...(c.status !== "in_progress" ? [{ label: "Start work", icon: CirclePlay, onClick: () => move(c, "in_progress") }] : []),
                          ...(c.status !== "resolved" ? [{ label: "Mark resolved", icon: CheckCheck, onClick: () => move(c, "resolved") }] : []),
                          ...(c.status === "resolved" ? [{ label: "Reopen", icon: RotateCcw, onClick: () => move(c, "open") }] : []),
                          { label: "Edit", icon: Pencil, onClick: () => openEdit(c) },
                          { label: "Delete", icon: Trash2, danger: true, onClick: () => setDeleting(c) },
                        ]}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={CAT_TONE[c.category] ?? "slate"}>{pretty(c.category)}</Badge>
                      <Badge tone={c.priority === "high" ? "rose" : c.priority === "medium" ? "amber" : "slate"} dot>
                        {c.priority === "high" && <Zap className="h-3 w-3" />}
                        {pretty(c.priority)}
                      </Badge>
                    </div>
                    {c.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-400">{c.description}</p>}
                    <div className="mt-3 flex items-center gap-2 border-t border-ink-900/5 pt-2.5">
                      {c.tenantName && <Avatar name={c.tenantName} className="h-6 w-6 text-[9px]" />}
                      <p className="min-w-0 flex-1 truncate text-[11px] text-ink-400">
                        {c.tenantName ?? "Staff report"} · {c.propertyName}
                      </p>
                      <span className="text-[10.5px] text-ink-300">{timeAgo(c.createdAt)}</span>
                    </div>
                    {c.status === "open" && (
                      <Button size="sm" variant="soft" className="mt-3 w-full" loading={crud.update.isPending && (crud.update.variables as any)?.id === c.id} onClick={() => move(c, "in_progress")}>
                        Start work <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {c.status === "in_progress" && (
                      <Button size="sm" variant="soft" className="mt-3 w-full" loading={crud.update.isPending && (crud.update.variables as any)?.id === c.id} onClick={() => move(c, "resolved")}>
                        <CheckCheck className="h-3.5 w-3.5" /> Mark resolved
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? "Edit complaint" : "Log a complaint"}
        subtitle="Attach the resident and property for faster resolution"
        width="sm:max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={crud.create.isPending || crud.update.isPending}>{editing ? "Save changes" : "Log complaint"}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Issue title" required>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Geyser not heating in 302" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Property" required>
              <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value, tenantId: "" })}>
                <option value="">Select…</option>
                {(props || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Resident">
              <Select value={form.tenantId} onChange={(e) => set("tenantId", e.target.value)} disabled={!form.propertyId}>
                <option value="">General / staff</option>
                {residentsForProperty.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}{t.roomNumber ? ` · ${t.roomNumber}` : ""}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{pretty(c)}</option>)}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High — urgent</option>
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What's broken, since when, any temporary fix…" />
          </Field>
        </div>
      </Drawer>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await crud.remove.mutateAsync(deleting.id); setDeleting(null); }}
        loading={crud.remove.isPending}
        title="Delete this complaint?"
        body={deleting?.title}
      />
    </div>
  );
}
