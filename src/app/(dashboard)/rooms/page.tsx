"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Bath,
  BedDouble,
  CheckCircle2,
  DoorOpen,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Wrench,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Confirm,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  pretty,
  Select,
  Spinner,
  StatusBadge,
  useToast,
} from "@/components/ui";
import { api, useAction, useCrud, useList } from "@/lib/hooks";
import { cx, inr } from "@/lib/utils";

const ROOM_TYPES = ["single", "double", "triple", "quad"];
const CAP: Record<string, number> = { single: 1, double: 2, triple: 3, quad: 4 };

const BED_CHIP: Record<string, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300",
  occupied: "border-iris-200 bg-iris-50 text-iris-700 hover:border-iris-300",
  reserved: "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300",
  maintenance: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300",
};

export default function RoomsPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: props } = useList<any[]>(["properties"], "/api/properties");
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const activeProperty = propertyId ?? props?.[0]?.id ?? null;

  const { data: rooms, isLoading } = useList<any[]>(
    ["rooms", activeProperty],
    `/api/rooms${activeProperty ? `?propertyId=${activeProperty}` : ""}`
  );
  const { data: tenants } = useList<any[]>(["tenants"], "/api/tenants");

  const [bed, setBed] = useState<any | null>(null);
  const [roomForBed, setRoomForBed] = useState<any | null>(null);
  const [roomForm, setRoomForm] = useState<any | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<any | null>(null);
  const [assignee, setAssignee] = useState<string>("");

  const invalidateKeys = [["rooms"], ["tenants"], ["dashboard"], ["properties"]];

  const transfer = useAction(
    ({ tenantId, bedId }: any) =>
      api(`/api/tenants/${tenantId}/transfer`, { method: "POST", body: { bedId } }),
    { invalidateKeys, success: "Bed assigned" }
  );
  const checkout = useAction(
    ({ tenantId }: any) =>
      api(`/api/tenants/${tenantId}`, { method: "PATCH", body: { status: "moved_out" } }),
    { invalidateKeys, success: "Resident checked out" }
  );
  const activate = useAction(
    ({ tenantId }: any) =>
      api(`/api/tenants/${tenantId}`, { method: "PATCH", body: { status: "active" } }),
    { invalidateKeys, success: "Booking activated — welcome aboard" }
  );
  const bedStatus = useAction(
    ({ id, status }: any) => api(`/api/beds/${id}`, { method: "PATCH", body: { status } }),
    { invalidateKeys, success: "Bed updated" }
  );

  const roomCrud = useCrud<any>("rooms", "/api/rooms");
  const saveRoom = async () => {
    if (!roomForm.number?.trim()) return toast.error("Room number is required");
    if (roomForm.id) {
      await roomCrud.update.mutateAsync({
        id: roomForm.id,
        floor: roomForm.floor,
        number: roomForm.number,
        type: roomForm.type,
        rent: roomForm.rent,
        attachedBath: roomForm.attachedBath,
      });
    } else {
      await roomCrud.create.mutateAsync({ ...roomForm, propertyId: activeProperty });
    }
    setRoomForm(null);
  };

  const unassigned = useMemo(
    () => (tenants || []).filter((t) => t.status !== "moved_out" && !t.bedId),
    [tenants]
  );

  const floors = useMemo(() => {
    const map = new Map<number, any[]>();
    (rooms || []).forEach((r) => {
      const list = map.get(r.floor) ?? [];
      list.push(r);
      map.set(r.floor, list);
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [rooms]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { available: 0, occupied: 0, reserved: 0, maintenance: 0 };
    (rooms || []).forEach((r) => r.beds.forEach((b: any) => (c[b.status] = (c[b.status] || 0) + 1)));
    return c;
  }, [rooms]);

  const openBed = (b: any, room: any) => {
    setBed(b);
    setRoomForBed(room);
    setAssignee("");
  };

  return (
    <div>
      <PageHeader
        title="Rooms & Beds"
        subtitle="Allocation board — click any bed to assign, transfer or service it"
        actions={
          <Button onClick={() => setRoomForm({ floor: 1, number: "", type: "double", rent: 10000, attachedBath: false, capacity: 2 })}>
            <Plus className="h-4 w-4" /> Add room
          </Button>
        }
      />

      {/* Property tabs + status summary */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-ink-100/80 p-1">
          {(props || []).map((p: any) => (
            <button
              key={p.id}
              onClick={() => setPropertyId(p.id)}
              className={cx(
                "rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-all",
                p.id === activeProperty ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {(["available", "occupied", "reserved", "maintenance"] as const).map((s) => (
            <span key={s} className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold", BED_CHIP[s])}>
              <BedDouble className="h-3 w-3" /> {counts[s] ?? 0} {pretty(s)}
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : floors.length === 0 ? (
        <div className="rounded-2xl border border-ink-900/8 bg-white shadow-card">
          <EmptyState
            icon={BedDouble}
            title="No rooms in this property yet"
            body="Create your first room — beds are generated automatically from its capacity."
            action={<Button onClick={() => setRoomForm({ floor: 1, number: "", type: "double", rent: 10000, attachedBath: false, capacity: 2 })}><Plus className="h-4 w-4" /> Add room</Button>}
          />
        </div>
      ) : (
        <div className="space-y-7">
          {floors.map(([floor, floorRooms]) => (
            <div key={floor} className="animate-rise">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
                <DoorOpen className="h-3.5 w-3.5" />
                {floor === 0 ? "Ground Floor" : `Floor ${floor}`}
                <span className="h-px flex-1 bg-ink-900/8" />
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {floorRooms.map((room: any) => {
                  const occ = room.beds.filter((b: any) => b.status === "occupied").length;
                  return (
                    <div key={room.id} className="rounded-2xl border border-ink-900/8 bg-white p-4.5 shadow-card">
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-[17px] font-semibold tracking-tight">
                              Room {room.number}
                            </h3>
                            <Badge tone="slate">{pretty(room.type)}</Badge>
                            {room.attachedBath && (
                              <span title="Attached bathroom"><Bath className="h-3.5 w-3.5 text-sky-500" /></span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-ink-400">
                            {inr(room.rent)}<span className="text-ink-300">/bed/mo</span> · {occ}/{room.beds.length} occupied
                          </p>
                        </div>
                        <DropdownRoom
                          onEdit={() => setRoomForm({ ...room })}
                          onDelete={() => setDeletingRoom(room)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {room.beds.map((b: any) => (
                          <button
                            key={b.id}
                            onClick={() => openBed(b, room)}
                            className={cx(
                              "flex min-w-20 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[12px] font-semibold transition-all",
                              BED_CHIP[b.status]
                            )}
                          >
                            <BedDouble className="h-3.5 w-3.5" />
                            <span>{room.number}-{b.label}</span>
                            {b.occupant && <span className="max-w-16 truncate font-normal">· {b.occupant.name.split(" ")[0]}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bed action modal */}
      <Modal
        open={!!bed}
        onClose={() => setBed(null)}
        title={bed && roomForBed ? `Bed ${roomForBed.number}-${bed.label}` : ""}
        subtitle={bed ? pretty(bed.status) : ""}
        width="max-w-md"
      >
        {bed && roomForBed && (
          <div className="space-y-4">
            {bed.occupant ? (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-ink-900/8 bg-ink-50/60 p-4">
                  <Avatar name={bed.occupant.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{bed.occupant.name}</p>
                    <StatusBadge value={bed.occupant.status} className="mt-1" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/residents/${bed.occupant.id}`)}>
                    Profile
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {bed.occupant.status === "reserved" ? (
                    <Button
                      variant="soft"
                      loading={activate.isPending}
                      onClick={async () => { await activate.mutateAsync({ tenantId: bed.occupant.id }); setBed(null); }}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Activate booking
                    </Button>
                  ) : (
                    <Button
                      variant="soft"
                      onClick={() => { router.push(`/residents/${bed.occupant.id}?transfer=1`); }}
                    >
                      <ArrowLeftRight className="h-4 w-4" /> Transfer
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    loading={checkout.isPending}
                    onClick={async () => { await checkout.mutateAsync({ tenantId: bed.occupant.id }); setBed(null); }}
                  >
                    <LogOut className="h-4 w-4" /> Check out
                  </Button>
                </div>
              </>
            ) : (
              <>
                {bed.status === "maintenance" ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">
                    This bed is under maintenance and hidden from allocation.
                  </div>
                ) : (
                  <Field label="Assign resident" hint={`${unassigned.length} waiting for a bed`}>
                    <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                      <option value="">Select a resident…</option>
                      {unassigned.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {pretty(t.status)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <div className="flex flex-wrap gap-2">
                  {bed.status !== "maintenance" && (
                    <>
                      <Button
                        disabled={!assignee}
                        loading={transfer.isPending}
                        onClick={async () => { await transfer.mutateAsync({ tenantId: Number(assignee), bedId: bed.id }); setBed(null); }}
                      >
                        <UserPlus className="h-4 w-4" /> Assign
                      </Button>
                      <Button
                        variant="outline"
                        loading={bedStatus.isPending}
                        onClick={async () => { await bedStatus.mutateAsync({ id: bed.id, status: "maintenance" }); setBed(null); }}
                      >
                        <Wrench className="h-4 w-4" /> Mark maintenance
                      </Button>
                    </>
                  )}
                  {bed.status === "maintenance" && (
                    <Button
                      variant="soft"
                      loading={bedStatus.isPending}
                      onClick={async () => { await bedStatus.mutateAsync({ id: bed.id, status: "available" }); setBed(null); }}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Back to available
                    </Button>
                  )}
                </div>
                {bed.status === "available" && unassigned.length === 0 && (
                  <p className="text-xs text-ink-400">
                    Everyone is accommodated. Add a new resident from the Residents page to fill this bed.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Room form drawer */}
      <Drawer
        open={!!roomForm}
        onClose={() => setRoomForm(null)}
        title={roomForm?.id ? `Edit Room ${roomForm.number}` : "Add room"}
        subtitle={roomForm?.id ? "Capacity and beds stay unchanged" : "Beds are created automatically from the sharing type"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRoomForm(null)}>Cancel</Button>
            <Button onClick={saveRoom} loading={roomCrud.create.isPending || roomCrud.update.isPending}>
              {roomForm?.id ? "Save changes" : "Create room"}
            </Button>
          </div>
        }
        width="sm:max-w-md"
      >
        {roomForm && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Room number / name" required>
                <Input value={roomForm.number} onChange={(e) => setRoomForm({ ...roomForm, number: e.target.value })} placeholder="304 / C2" />
              </Field>
              <Field label="Floor">
                <Input type="number" min={0} value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Sharing type">
              <div className="grid grid-cols-4 gap-2">
                {ROOM_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setRoomForm({ ...roomForm, type: t, capacity: CAP[t] })}
                    className={cx(
                      "rounded-xl border px-2 py-2.5 text-center transition-all",
                      roomForm.type === t ? "border-iris-400 bg-iris-50" : "border-ink-200 hover:border-ink-300"
                    )}
                  >
                    <p className="text-[12.5px] font-semibold capitalize text-ink-800">{t}</p>
                    <p className="text-[10.5px] text-ink-400">{CAP[t]} bed{CAP[t] > 1 ? "s" : ""}</p>
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Rent per bed / month" required>
                <Input type="number" min={0} step={500} value={roomForm.rent} onChange={(e) => setRoomForm({ ...roomForm, rent: Number(e.target.value) })} />
              </Field>
              <Field label="Attached bathroom">
                <Select value={roomForm.attachedBath ? "yes" : "no"} onChange={(e) => setRoomForm({ ...roomForm, attachedBath: e.target.value === "yes" })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </Select>
              </Field>
            </div>
          </div>
        )}
      </Drawer>

      <Confirm
        open={!!deletingRoom}
        onClose={() => setDeletingRoom(null)}
        onConfirm={async () => {
          try {
            await roomCrud.remove.mutateAsync(deletingRoom.id);
          } catch {
            /* toast handled by the crud hook */
          } finally {
            setDeletingRoom(null);
          }
        }}
        loading={roomCrud.remove.isPending}
        title={`Delete Room ${deletingRoom?.number}?`}
        body="Its beds will be removed too. Rooms with active residents cannot be deleted."
      />
    </div>
  );
}

function DropdownRoom({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <span className="flex items-center gap-1">
      <button onClick={onEdit} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900" title="Edit room">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={onDelete} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Delete room">
        <Trash2 className="h-4 w-4" />
      </button>
    </span>
  );
}
