"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  BedDouble,
  LogOut,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Confirm,
  Dropdown,
  EmptyState,
  PageHeader,
  SearchInput,
  Segmented,
  Select,
  StatusBadge,
  Table,
  type Column,
} from "@/components/ui";
import ResidentForm from "@/components/resident-form";
import { useCrud, useList } from "@/lib/hooks";
import { fmtDate, inr } from "@/lib/utils";

function ResidentsInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { data, isLoading } = useList<any[]>(["tenants"], "/api/tenants");
  const { data: props } = useList<any[]>(["properties"], "/api/properties");
  const crud = useCrud<any>("tenants", "/api/tenants");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [propertyId, setPropertyId] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [checkingOut, setCheckingOut] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);

  useEffect(() => {
    if (sp.get("add") === "1") {
      setEditing(null);
      setFormOpen(true);
    }
  }, [sp]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data || []).filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (propertyId !== "all" && t.propertyId !== Number(propertyId)) return false;
      if (needle && !(`${t.name} ${t.phone} ${t.email ?? ""} ${t.organization ?? ""}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [data, q, status, propertyId]);

  const save = async (payload: any) => {
    if (editing) {
      await crud.update.mutateAsync({ id: editing.id, ...payload });
    } else {
      await crud.create.mutateAsync(payload);
    }
    setFormOpen(false);
    setEditing(null);
  };

  const columns: Column<any>[] = [
    {
      header: "Resident",
      render: (t) => (
        <div className="flex items-center gap-3">
          <Avatar name={t.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{t.name}</p>
            <p className="flex items-center gap-1 text-xs text-ink-400">
              <Phone className="h-3 w-3" /> {t.phone}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Room · Bed",
      render: (t) =>
        t.roomNumber ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-600">
            <BedDouble className="h-3.5 w-3.5 text-ink-300" />
            {t.roomNumber}-{t.bedLabel}
            <span className="text-ink-300">·</span>
            <span className="text-ink-400">{t.propertyName}</span>
          </span>
        ) : (
          <span className="text-xs italic text-ink-300">{t.status === "moved_out" ? "Checked out" : "Waitlisted"}</span>
        ),
    },
    {
      header: "Rent",
      align: "right",
      render: (t) => <span className="font-medium tabular-nums">{t.rent ? inr(t.rent) : "—"}</span>,
    },
    {
      header: "Due",
      align: "right",
      render: (t) =>
        t.due > 0 ? (
          <span className="font-semibold tabular-nums text-rose-600">{inr(t.due)}</span>
        ) : (
          <Badge tone="emerald">Clear</Badge>
        ),
    },
    { header: "Joined", render: (t) => <span className="text-ink-500">{fmtDate(t.joinDate)}</span> },
    { header: "Status", render: (t) => <StatusBadge value={t.status} /> },
    {
      header: "",
      align: "right",
      className: "w-12",
      render: (t) => (
        <Dropdown
          trigger={
            <span className="inline-flex rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900">
              <MoreHorizontal className="h-4.5 w-4.5" />
            </span>
          }
          items={[
            { label: "View profile", icon: UsersRound, onClick: () => router.push(`/residents/${t.id}`) },
            { label: "Edit details", icon: Pencil, onClick: () => { setEditing(t); setFormOpen(true); } },
            ...(t.status !== "moved_out"
              ? [
                  { label: "Transfer bed", icon: ArrowLeftRight, onClick: () => router.push(`/residents/${t.id}?transfer=1`) },
                  { label: "Check out", icon: LogOut, onClick: () => setCheckingOut(t) },
                ]
              : []),
            { label: "Delete record", icon: Trash2, danger: true, onClick: () => setDeleting(t) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Residents"
        subtitle="Everyone living (or about to live) across your properties"
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> New resident
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, company…" className="w-full sm:w-72" />
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "reserved", label: "Reserved" },
            { value: "moved_out", label: "Moved out" },
          ]}
        />
        <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-48">
          <option value="all">All properties</option>
          {(props || []).map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
        <span className="ml-auto text-xs text-ink-400">{filtered.length} resident{filtered.length === 1 ? "" : "s"}</span>
      </div>

      <div className="rounded-2xl border border-ink-900/8 bg-white shadow-card">
        <Table
          columns={columns}
          rows={filtered}
          loading={isLoading}
          onRowClick={(t) => router.push(`/residents/${t.id}`)}
          empty={
            <EmptyState
              icon={UsersRound}
              title={q || status !== "all" ? "No residents match" : "No residents yet"}
              body={q || status !== "all" ? "Try a different search or filter." : "Check in your first resident to get billing rolling."}
              action={!q && status === "all" ? <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> New resident</Button> : undefined}
            />
          }
        />
      </div>

      <ResidentForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing}
        pending={crud.create.isPending || crud.update.isPending}
        onSubmit={save}
      />

      <Confirm
        open={!!checkingOut}
        onClose={() => setCheckingOut(null)}
        onConfirm={async () => {
          await crud.update.mutateAsync({ id: checkingOut.id, status: "moved_out" });
          setCheckingOut(null);
        }}
        loading={crud.update.isPending}
        confirmLabel="Check out"
        title={`Check out ${checkingOut?.name}?`}
        body={`Bed ${checkingOut?.roomNumber ?? ""}-${checkingOut?.bedLabel ?? ""} will be freed up and their stay history closed. Dues stay on record.`}
      />

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await crud.remove.mutateAsync(deleting.id);
          setDeleting(null);
        }}
        loading={crud.remove.isPending}
        title={`Delete ${deleting?.name}?`}
        body="Removes the resident along with their invoices, payments and stay history. Prefer check-out to keep financial records."
      />
    </div>
  );
}

export default function ResidentsPage() {
  return (
    <Suspense>
      <ResidentsInner />
    </Suspense>
  );
}
