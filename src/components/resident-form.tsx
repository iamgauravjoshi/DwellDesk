"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Field, Input, Select, Textarea } from "@/components/ui";
import { useList } from "@/lib/hooks";
import { todayISO } from "@/lib/utils";

export type ResidentPayload = Record<string, any>;

const empty = {
  name: "",
  phone: "",
  email: "",
  gender: "male",
  dob: "",
  occupation: "working",
  organization: "",
  permanentAddress: "",
  idType: "aadhaar",
  idNumber: "",
  guardianName: "",
  guardianPhone: "",
  notes: "",
  status: "active",
  joinDate: todayISO(),
  propertyId: 0,
  roomId: 0,
  bedId: 0,
  rent: 0,
  deposit: 0,
  depositPaid: true,
  firstInvoice: true,
};

export default function ResidentForm({
  open,
  onClose,
  onSubmit,
  initial,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: ResidentPayload) => void;
  initial?: any | null;
  pending?: boolean;
}) {
  const editing = !!initial?.id;
  const [form, setForm] = useState<any>(empty);
  const { data: props } = useList<any[]>(["properties"], "/api/properties");
  const { data: rooms } = useList<any[]>(
    ["rooms", form.propertyId],
    `/api/rooms${form.propertyId ? `?propertyId=${form.propertyId}` : ""}`
  );

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        ...empty,
        ...initial,
        dob: initial.dob ?? "",
        email: initial.email ?? "",
        organization: initial.organization ?? "",
        permanentAddress: initial.permanentAddress ?? "",
        idNumber: initial.idNumber ?? "",
        guardianName: initial.guardianName ?? "",
        guardianPhone: initial.guardianPhone ?? "",
        notes: initial.notes ?? "",
        occupation: initial.occupation ?? "working",
      });
    } else {
      setForm({ ...empty, propertyId: props?.[0]?.id ?? 0 });
    }
  }, [open, initial, props]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const availableBeds = useMemo(() => {
    const out: { label: string; bedId: number; roomId: number; rent: number }[] = [];
    (rooms || []).forEach((r) =>
      r.beds
        .filter((b: any) => b.status === "available")
        .forEach((b: any) =>
          out.push({ label: `${r.number}-${b.label} · ${r.type}`, bedId: b.id, roomId: r.id, rent: r.rent })
        )
    );
    return out;
  }, [rooms]);

  const pickBed = (bedId: number) => {
    const slot = availableBeds.find((b) => b.bedId === bedId);
    setForm((f: any) => ({
      ...f,
      bedId,
      roomId: slot?.roomId ?? 0,
      rent: f.rent || slot?.rent || 0,
      deposit: f.deposit || (slot ? slot.rent * 2 : 0),
    }));
  };

  const submit = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    if (!editing && !form.propertyId) return;
    onSubmit({
      ...form,
      propertyId: Number(form.propertyId) || null,
      roomId: Number(form.roomId) || null,
      bedId: Number(form.bedId) || null,
      rent: Number(form.rent) || 0,
      deposit: Number(form.deposit) || 0,
    });
  };

  const invalid = !form.name.trim() || !form.phone.trim() || (!editing && !form.propertyId);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${initial?.name}` : "New resident"}
      subtitle={editing ? "Update profile, KYC and guardian details" : "Check in a resident — assign a bed now or later"}
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-ink-400">{invalid ? "Name, phone & property are required" : "Ready to save"}</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} loading={pending} disabled={invalid}>
              {editing ? "Save changes" : "Check in resident"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-7">
        <section>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">Personal</h4>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full name" required>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Kavya Rao" />
            </Field>
            <Field label="Phone" required>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98XXXXXXXX" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@gmail.com" />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={form.dob ?? ""} onChange={(e) => set("dob", e.target.value)} />
            </Field>
            <Field label="Occupation">
              <Select value={form.occupation} onChange={(e) => set("occupation", e.target.value)}>
                <option value="working">Working professional</option>
                <option value="student">Student</option>
              </Select>
            </Field>
            <Field label={form.occupation === "student" ? "College" : "Company"} className="col-span-2">
              <Input value={form.organization} onChange={(e) => set("organization", e.target.value)} placeholder={form.occupation === "student" ? "Christ University" : "Infosys"} />
            </Field>
          </div>
        </section>

        {!editing && (
          <section>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">Stay & bed</h4>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Property" required>
                <Select value={form.propertyId} onChange={(e) => setForm((f: any) => ({ ...f, propertyId: Number(e.target.value), bedId: 0, roomId: 0 }))}>
                  <option value={0}>Select property…</option>
                  {(props || []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Bed" hint={form.propertyId ? `${availableBeds.length} available` : undefined}>
                <Select value={form.bedId || ""} onChange={(e) => pickBed(Number(e.target.value))} disabled={!form.propertyId}>
                  <option value="">No bed yet / waitlist</option>
                  {availableBeds.map((b) => (
                    <option key={b.bedId} value={b.bedId}>{b.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Booking status">
                <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="active">Check in now</option>
                  <option value="reserved">Reserve (advance booking)</option>
                </Select>
              </Field>
              <Field label="Join date">
                <Input type="date" value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} />
              </Field>
              <Field label="Rent / month" required>
                <Input type="number" min={0} step={500} value={form.rent} onChange={(e) => set("rent", Number(e.target.value))} />
              </Field>
              <Field label="Security deposit">
                <Input type="number" min={0} step={500} value={form.deposit} onChange={(e) => set("deposit", Number(e.target.value))} />
              </Field>
              <label className="col-span-2 flex items-center gap-2.5 text-[13px] text-ink-600">
                <input type="checkbox" checked={form.depositPaid} onChange={(e) => set("depositPaid", e.target.checked)} className="h-4 w-4 rounded accent-iris-600" />
                Record deposit as paid (creates a receipt)
              </label>
              {form.status === "active" && (
                <label className="col-span-2 flex items-center gap-2.5 text-[13px] text-ink-600">
                  <input type="checkbox" checked={form.firstInvoice} onChange={(e) => set("firstInvoice", e.target.checked)} className="h-4 w-4 rounded accent-iris-600" />
                  Generate this month&#39;s rent invoice
                </label>
              )}
            </div>
          </section>
        )}

        <section>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">Guardian & KYC</h4>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Guardian name">
              <Input value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} placeholder="Parent / local guardian" />
            </Field>
            <Field label="Guardian phone">
              <Input value={form.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value)} placeholder="98XXXXXXXX" />
            </Field>
            <Field label="ID type">
              <Select value={form.idType} onChange={(e) => set("idType", e.target.value)}>
                <option value="aadhaar">Aadhaar</option>
                <option value="pan">PAN</option>
                <option value="passport">Passport</option>
                <option value="driving_license">Driving licence</option>
                <option value="college_id">College ID</option>
              </Select>
            </Field>
            <Field label="ID number">
              <Input value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} placeholder="XXXX XXXX 1234" />
            </Field>
            <Field label="Permanent address" className="col-span-2">
              <Textarea rows={2} value={form.permanentAddress} onChange={(e) => set("permanentAddress", e.target.value)} placeholder="Home town address" />
            </Field>
            <Field label="Notes" className="col-span-2">
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Allergies, preferences, quiet hours…" />
            </Field>
          </div>
        </section>
      </div>
    </Drawer>
  );
}
