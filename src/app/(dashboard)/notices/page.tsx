"use client";

import { useState } from "react";
import { Megaphone, Send, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Confirm,
  EmptyState,
  Field,
  Input,
  PageHeader,
  pretty,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { useCrud, useList } from "@/lib/hooks";
import { timeAgo } from "@/lib/utils";

export default function NoticesPage() {
  const { data, isLoading } = useList<any[]>(["notices"], "/api/announcements");
  const crud = useCrud<any>("notices", "/api/announcements");
  const toast = useToast();

  const [form, setForm] = useState({ title: "", body: "", audience: "all" });
  const [deleting, setDeleting] = useState<any | null>(null);

  const publish = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and message are required");
    await crud.create.mutateAsync(form);
    setForm({ title: "", body: "", audience: "all" });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Notice Board" subtitle="Announcements for residents and staff — pinned newest first" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="Publish a notice" subtitle="Shown on dashboards and the tenant portal" className="h-fit">
          <div className="space-y-4">
            <Field label="Title" required>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Rent due reminder" />
            </Field>
            <Field label="Message" required>
              <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write something clear and kind…" />
            </Field>
            <Field label="Audience">
              <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="all">Everyone</option>
                <option value="residents">Residents only</option>
                <option value="staff">Staff only</option>
              </Select>
            </Field>
            <Button className="w-full" onClick={publish} loading={crud.create.isPending}>
              <Send className="h-4 w-4" /> Publish notice
            </Button>
            <p className="text-[11.5px] leading-relaxed text-ink-400">
              WhatsApp & SMS broadcast are on the integrations roadmap — notices already reach the
              in-app bell and tenant portal.
            </p>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {isLoading ? (
            <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-ink-100/70" />)}</div>
          ) : (data || []).length === 0 ? (
            <Card>
              <EmptyState icon={Megaphone} title="No notices yet" body="Publish your first announcement — rent reminders, events, maintenance windows." />
            </Card>
          ) : (
            (data || []).map((n: any, i: number) => (
              <article
                key={n.id}
                className="animate-rise group rounded-2xl border border-ink-900/8 bg-white p-5 shadow-card"
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[15.5px] font-semibold tracking-tight text-ink-900">{n.title}</h3>
                      <Badge tone={n.audience === "all" ? "slate" : n.audience === "residents" ? "emerald" : "sky"}>
                        {pretty(n.audience)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{n.body}</p>
                  </div>
                  <button
                    onClick={() => setDeleting(n)}
                    className="rounded-lg p-2 text-ink-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 border-t border-ink-900/5 pt-3 text-[11px] font-medium uppercase tracking-wider text-ink-300">
                  {timeAgo(n.createdAt)}
                </p>
              </article>
            ))
          )}
        </div>
      </div>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await crud.remove.mutateAsync(deleting.id); setDeleting(null); }}
        loading={crud.remove.isPending}
        title="Delete this notice?"
        body={deleting?.title}
      />
    </div>
  );
}
