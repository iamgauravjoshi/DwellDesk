"use client";

import { useState } from "react";
import {
  Building2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
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
  useToast,
} from "@/components/ui";
import { useCrud, useList } from "@/lib/hooks";
import { inr } from "@/lib/utils";

const AMENITY_OPTIONS = ["wifi", "meals", "laundry", "power backup", "cctv", "gym", "housekeeping", "bike parking", "study hall", "community events"];

type Form = {
  name: string;
  code: string;
  type: string;
  city: string;
  address: string;
  floors: number;
  managerName: string;
  phone: string;
  amenities: string[];
};

const emptyForm: Form = {
  name: "",
  code: "",
  type: "pg",
  city: "Bengaluru",
  address: "",
  floors: 2,
  managerName: "",
  phone: "",
  amenities: ["wifi", "meals"],
};

export default function PropertiesPage() {
  const { data, isLoading } = useList<any[]>(["properties"], "/api/properties");
  const crud = useCrud<any>("properties", "/api/properties");
  const toast = useToast();

  const [editing, setEditing] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [deleting, setDeleting] = useState<any | null>(null);

  const set = (k: keyof Form, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleAmenity = (a: string) =>
    set("amenities", form.amenities.includes(a) ? form.amenities.filter((x) => x !== a) : [...form.amenities, a]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name,
      code: p.code,
      type: p.type,
      city: p.city,
      address: p.address,
      floors: p.floors,
      managerName: p.managerName ?? "",
      phone: p.phone ?? "",
      amenities: p.amenities ?? [],
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      toast.error("Name and address are required");
      return;
    }
    const code = form.code.trim() || form.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
    if (editing) await crud.update.mutateAsync({ id: editing.id, ...form, code });
    else await crud.create.mutateAsync({ ...form, code });
    setFormOpen(false);
  };

  const pending = crud.create.isPending || crud.update.isPending;

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle="Buildings you operate — floors, rooms and beds roll up here"
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add property
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : (data || []).length === 0 ? (
        <div className="rounded-2xl border border-ink-900/8 bg-white shadow-card">
          <EmptyState
            icon={Building2}
            title="No properties yet"
            body="Add your first PG or hostel to start assigning rooms, beds and residents."
            action={
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Add property
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(data || []).map((p: any, i: number) => {
            const pct = p.bedsCount ? Math.round((p.occupiedBeds / p.bedsCount) * 100) : 0;
            return (
              <div
                key={p.id}
                className="animate-rise group flex flex-col overflow-hidden rounded-2xl border border-ink-900/8 bg-white shadow-card transition-shadow hover:shadow-pop"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="texture-dark relative bg-ink-950 p-5 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge tone="iris" className="mb-2 !bg-white/10 !text-iris-200 !ring-white/15">
                        {pretty(p.type)}
                      </Badge>
                      <h3 className="font-display text-[19px] font-semibold tracking-tight">{p.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                        <MapPin className="h-3 w-3" /> {p.address}, {p.city}
                      </p>
                    </div>
                    <Dropdown
                      trigger={
                        <span className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
                          <MoreHorizontal className="h-4.5 w-4.5" />
                        </span>
                      }
                      items={[
                        { label: "Edit property", icon: Pencil, onClick: () => openEdit(p) },
                        { label: "Delete", icon: Trash2, danger: true, onClick: () => setDeleting(p) },
                      ]}
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-5 text-xs">
                    <span>
                      <span className="font-display text-base font-semibold">{p.residents}</span>{" "}
                      <span className="text-zinc-400">residents</span>
                    </span>
                    <span className="h-4 w-px bg-white/15" />
                    <span>
                      <span className="font-display text-base font-semibold">{p.bedsCount - p.occupiedBeds}</span>{" "}
                      <span className="text-zinc-400">beds free</span>
                    </span>
                    <span className="ml-auto font-mono text-[11px] font-semibold tracking-wider text-zinc-500">
                      {p.code}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-ink-500">Occupancy</span>
                      <span className="font-semibold text-ink-800">
                        {p.occupiedBeds}/{p.bedsCount} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-iris-500 to-iris-400 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-emerald-50 px-2 py-2.5">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-emerald-600/80">Collected</p>
                      <p className="mt-0.5 text-[14.5px] font-semibold text-emerald-700">{inr(p.collectedThisMonth)}</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 px-2 py-2.5">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-amber-600/80">Pending</p>
                      <p className="mt-0.5 text-[14.5px] font-semibold text-amber-700">{inr(p.pendingThisMonth)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-ink-900/6 pt-4">
                    <Avatar name={p.managerName || p.name} className="h-7 w-7 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink-700">{p.managerName || "—"}</p>
                      <p className="flex items-center gap-1 text-[11px] text-ink-400">
                        <Phone className="h-3 w-3" /> {p.phone || "No phone"}
                      </p>
                    </div>
                    <Badge tone="slate">{p.roomsCount} rooms</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form drawer */}
      <Drawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add property"}
        subtitle="Rooms and beds are added separately from the allocation board"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={pending}>{editing ? "Save changes" : "Create property"}</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Property name" required className="col-span-2 sm:col-span-1">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Sunrise Residency" />
            </Field>
            <Field label="Short code" hint="auto if empty">
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="SUN" maxLength={5} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="pg">PG (paying guest)</option>
                <option value="hostel">Hostel</option>
                <option value="coliving">Co-living</option>
              </Select>
            </Field>
            <Field label="Floors">
              <Input type="number" min={1} max={40} value={form.floors} onChange={(e) => set("floors", Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Address" required>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="21, 5th Cross, Koramangala" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Manager phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98XXXXXXXX" />
            </Field>
          </div>
          <Field label="Manager name">
            <Input value={form.managerName} onChange={(e) => set("managerName", e.target.value)} placeholder="On-site manager" />
          </Field>
          <Field label="Amenities">
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={
                    form.amenities.includes(a)
                      ? "rounded-full bg-iris-600 px-3 py-1.5 text-xs font-medium text-white"
                      : "rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-500 hover:bg-ink-200"
                  }
                >
                  {pretty(a)}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Drawer>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await crud.remove.mutateAsync(deleting.id);
          setDeleting(null);
        }}
        loading={crud.remove.isPending}
        title={`Delete ${deleting?.name}?`}
        body="This removes the property along with its rooms, beds and linked records. This cannot be undone."
      />
    </div>
  );
}
