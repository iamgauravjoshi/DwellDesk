import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ Users */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("owner"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------ Properties */
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("pg"), // pg | hostel | coliving
  address: text("address").notNull(),
  city: text("city").notNull().default("Bengaluru"),
  floors: integer("floors").notNull().default(1),
  amenities: jsonb("amenities").$type<string[]>().notNull().default([]),
  managerName: text("manager_name"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------------------------------------- Rooms */
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  floor: integer("floor").notNull().default(0),
  number: text("number").notNull(),
  type: text("type").notNull().default("double"), // single|double|triple|quad
  capacity: integer("capacity").notNull().default(2),
  rent: integer("rent").notNull().default(8000), // per bed, per month (INR)
  attachedBath: boolean("attached_bath").notNull().default(false),
  amenities: jsonb("amenities").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("active"), // active | maintenance
});

/* ------------------------------------------------------------------ Beds */
export const beds = pgTable("beds", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // A | B | C | D
  status: text("status").notNull().default("available"), // available|occupied|reserved|maintenance
});

/* --------------------------------------------------------------- Tenants */
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "set null" }),
  bedId: integer("bed_id").references(() => beds.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  gender: text("gender").notNull().default("male"),
  dob: date("dob", { mode: "string" }),
  occupation: text("occupation"), // working | student
  organization: text("organization"), // company / college
  permanentAddress: text("permanent_address"),
  idType: text("id_type").default("aadhaar"),
  idNumber: text("id_number"),
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  joinDate: date("join_date", { mode: "string" }).notNull(),
  moveOutDate: date("move_out_date", { mode: "string" }),
  rent: integer("rent").notNull().default(0),
  deposit: integer("deposit").notNull().default(0),
  status: text("status").notNull().default("active"), // active|reserved|moved_out
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------------------------------------------------- Stay history */
export const stayHistory = pgTable("stay_history", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").notNull(),
  roomId: integer("room_id"),
  bedId: integer("bed_id"),
  fromDate: date("from_date", { mode: "string" }).notNull(),
  toDate: date("to_date", { mode: "string" }),
  reason: text("reason").notNull().default("check-in"), // check-in | transfer
});

/* --------------------------------------------------------------- Invoice */
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull().unique(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").notNull(),
  monthKey: text("month_key").notNull(), // YYYY-MM
  amount: integer("amount").notNull(),
  lateFee: integer("late_fee").notNull().default(0),
  paidAmount: integer("paid_amount").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending|partial|paid
  dueDate: date("due_date", { mode: "string" }),
  method: text("method"),
  note: text("note"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* -------------------------------------------------------------- Payments */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  receiptNo: text("receipt_no").notNull().unique(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, {
    onDelete: "set null",
  }),
  propertyId: integer("property_id").notNull(),
  amount: integer("amount").notNull(),
  method: text("method").notNull().default("upi"), // cash|upi|bank|card
  date: date("date", { mode: "string" }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* -------------------------------------------------------------- Expenses */
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, {
    onDelete: "cascade",
  }),
  category: text("category").notNull().default("other"), // utilities|salary|groceries|maintenance|supplies|marketing|other
  vendor: text("vendor"),
  amount: integer("amount").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------------------------------------- Staff */
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  role: text("role").notNull().default("caretaker"), // manager|caretaker|cook|housekeeping|security
  phone: text("phone").notNull(),
  salary: integer("salary").notNull().default(12000),
  shift: text("shift").notNull().default("day"), // day|night|rotational
  joinedOn: date("joined_on", { mode: "string" }),
  status: text("status").notNull().default("active"), // active|on_leave|exited
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------ Complaints */
export const complaints = pgTable("complaints", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  category: text("category").notNull().default("other"), // plumbing|electrical|cleaning|food|internet|furniture|other
  priority: text("priority").notNull().default("medium"), // low|medium|high
  status: text("status").notNull().default("open"), // open|in_progress|resolved
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

/* -------------------------------------------------------------- Visitors */
export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  relation: text("relation"),
  purpose: text("purpose"),
  checkIn: timestamp("check_in").defaultNow().notNull(),
  checkOut: timestamp("check_out"),
});

/* ------------------------------------------------------------- Mess menu */
export const messMenus = pgTable("mess_menus", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Monday
  breakfast: text("breakfast").notNull().default(""),
  lunch: text("lunch").notNull().default(""),
  snacks: text("snacks").notNull().default(""),
  dinner: text("dinner").notNull().default(""),
});

/* --------------------------------------------------------- Announcements */
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull().default("all"), // all | residents | staff
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------ Audit logs */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull().default("system"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
