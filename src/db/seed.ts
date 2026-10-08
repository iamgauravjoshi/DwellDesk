import "dotenv/config";
import { db } from "@/db";
import {
  announcements,
  auditLogs,
  beds,
  complaints,
  expenses,
  invoices,
  messMenus,
  payments,
  properties,
  rooms,
  staff,
  stayHistory,
  tenants,
  users,
  visitors,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";

/* ------------------------------------------------------------ utilities */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260214);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pad = (n: number) => String(n).padStart(2, "0");
const tmpNo = () => `TMP-${Math.random().toString(36).slice(2, 12)}`;

const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const monthsBack = (n: number): string[] => {
  const out: string[] = [];
  const now = new Date();
  for (let i = n; i >= 0; i--)
    out.push(keyOf(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  return out;
};
const dayOf = (key: string, day: number) => `${key}-${pad(Math.min(28, Math.max(1, day)))}`;
const phone = () =>
  `${pick(["98", "97", "96", "95", "91", "90", "88", "87", "86", "81", "77", "70", "63"])}${String(
    between(10000000, 99999999)
  )}`;

const FIRST = [
  "Aarav","Vihaan","Arjun","Karan","Rohan","Aditya","Kunal","Nikhil","Sahil","Manav","Dev","Ishaan",
  "Rahul","Sandeep","Vivek","Pranav","Harsh","Yash","Ankit","Gaurav","Siddharth","Abhishek","Tarun","Rakesh",
  "Kavya","Ananya","Priya","Sneha","Meera","Ishita","Riya","Tanvi","Nidhi","Shruti","Divya","Pooja","Lakshmi",
  "Aishwarya","Harini","Keerthi","Navya","Sanya","Trisha","Aditi","Juhi","Manasi","Radhika",
];
const LAST = [
  "Sharma","Verma","Patel","Iyer","Reddy","Nair","Khan","Das","Gupta","Mehta","Joshi","Kulkarni","Rao",
  "Pillai","Chauhan","Bansal","Agarwal","Mukherjee","Chandran","Pawar","Bhat","Singh","Yadav","Menon",
];
const COMPANY = [
  "Infosys","TCS","Wipro","Flipkart","Razorpay","Swiggy","Zomato","PhonePe","Freshworks","Urban Company",
  "Deloitte","Accenture","Byju's","Ola Electric","Myntra",
];
const COLLEGE = [
  "Christ University","RV College of Engineering","PES University","IIM Bangalore","St. Joseph's University",
  "Mount Carmel College","Jain University","NLSIU Bangalore",
];
const RELATIONS = ["Father", "Mother", "Brother", "Sister", "Friend", "Cousin", "Uncle"];

/* ------------------------------------------------------------------ data */
const PROPERTY_SEED = [
  {
    name: "Sunrise Residency",
    code: "SUN",
    type: "pg",
    address: "21, 5th Cross, Koramangala 4th Block",
    city: "Bengaluru",
    floors: 4,
    amenities: ["wifi", "meals", "laundry", "power backup", "cctv", "housekeeping"],
    managerName: "Prakash Shetty",
    phone: phone(),
    rooms: [
      { floor: 1, number: "101", type: "double", rent: 11500, attachedBath: true },
      { floor: 1, number: "102", type: "triple", rent: 8500 },
      { floor: 1, number: "103", type: "double", rent: 10800 },
      { floor: 2, number: "201", type: "double", rent: 11200, attachedBath: true },
      { floor: 2, number: "202", type: "double", rent: 11000 },
      { floor: 2, number: "203", type: "quad", rent: 6800 },
      { floor: 3, number: "301", type: "single", rent: 16500, attachedBath: true },
      { floor: 3, number: "302", type: "double", rent: 11500, attachedBath: true },
      { floor: 3, number: "303", type: "triple", rent: 8200 },
      { floor: 4, number: "401", type: "double", rent: 11800, attachedBath: true },
      { floor: 4, number: "402", type: "double", rent: 11000 },
    ],
  },
  {
    name: "Maple Heights Hostel",
    code: "MPL",
    type: "hostel",
    address: "88, 19th Main, HSR Layout Sector 2",
    city: "Bengaluru",
    floors: 3,
    amenities: ["wifi", "meals", "cctv", "study hall", "bike parking"],
    managerName: "Latha Venkatesh",
    phone: phone(),
    rooms: [
      { floor: 0, number: "G1", type: "triple", rent: 7800 },
      { floor: 0, number: "G2", type: "quad", rent: 6400 },
      { floor: 0, number: "G3", type: "triple", rent: 7800 },
      { floor: 1, number: "101", type: "quad", rent: 6500 },
      { floor: 1, number: "102", type: "double", rent: 9800, attachedBath: true },
      { floor: 1, number: "103", type: "quad", rent: 6600 },
      { floor: 2, number: "201", type: "double", rent: 10200, attachedBath: true },
      { floor: 2, number: "202", type: "double", rent: 9500 },
    ],
  },
  {
    name: "Orchid Stays",
    code: "ORC",
    type: "coliving",
    address: "7, 100 Feet Road, Indiranagar",
    city: "Bengaluru",
    floors: 5,
    amenities: ["wifi", "gym", "meals", "power backup", "cctv", "community events", "housekeeping"],
    managerName: "Rahul D'Souza",
    phone: phone(),
    rooms: [
      { floor: 1, number: "A1", type: "single", rent: 18500, attachedBath: true },
      { floor: 1, number: "A2", type: "double", rent: 13500, attachedBath: true },
      { floor: 2, number: "B1", type: "double", rent: 13200, attachedBath: true },
      { floor: 2, number: "B2", type: "single", rent: 17800, attachedBath: true },
      { floor: 3, number: "C1", type: "double", rent: 12800 },
      { floor: 3, number: "C2", type: "double", rent: 12800 },
      { floor: 4, number: "D1", type: "triple", rent: 9800 },
    ],
  },
];

const MESS = [
  ["Idli, vada, sambar, coconut chutney, tea & coffee","Rice, sambar, cabbage poriyal, dal, curd & papad","Veg sandwich + filter coffee","Chapati, paneer butter masala, jeera rice, salad"],
  ["Pongal, medu vada, chutney & sambar","Lemon rice, rasam, aloo fry, curd & pickle","Samosa + masala chai","Veg biryani, onion raita, brinjal curry"],
  ["Masala dosa, chutney & sambar","Sambar rice, beans poriyal, buttermilk & fryums","Banana bajji + tea","Chapati, chana masala, dal fry, rice"],
  ["Aloo paratha, curd & pickle","Rice, rajma, beetroot poriyal, curd","Bread pakora + chai","Veg pulao, dal tadka, mixed veg curry"],
  ["Poori with potato masala","Curd rice, sambar rice & veg korma","Muffins + cold coffee","Chapati, egg curry (paneer option), steamed rice"],
  ["Rava upma + kesari bath","Full meals: sambar, rasam, kootu, curd, sweet","Mysore bonda + chai","Veg fried rice, gobi manchurian"],
  ["Chole bhature + lassi","Chicken biryani (veg biryani option), raita","Cookies + tea","Dosa night: plain/masala dosa, chutney, sambar"],
];

const COMPLAINTS = [
  { title: "Geyser not heating in Room 302", category: "plumbing", priority: "high", status: "open" },
  { title: "Wi-Fi keeps dropping after 8 PM", category: "internet", priority: "high", status: "in_progress" },
  { title: "Water leakage from AC vent", category: "maintenance", priority: "medium", status: "in_progress" },
  { title: "Room cleaning skipped twice this week", category: "cleaning", priority: "medium", status: "open" },
  { title: "Dinner served cold again", category: "food", priority: "low", status: "open" },
  { title: "Ceiling fan making rattling noise", category: "electrical", priority: "medium", status: "resolved" },
  { title: "Mattress on bed G2-C needs replacement", category: "furniture", priority: "low", status: "resolved" },
  { title: "Lift stuck on 2nd floor this morning", category: "maintenance", priority: "high", status: "resolved" },
  { title: "Mosquito problem in common lounge", category: "cleaning", priority: "medium", status: "open" },
  { title: "Laundry pickup delayed by 2 days", category: "other", priority: "low", status: "resolved" },
  { title: "Main door lock jammed", category: "maintenance", priority: "high", status: "in_progress" },
  { title: "RO water tastes odd since Monday", category: "plumbing", priority: "medium", status: "resolved" },
  { title: "Power backup trips during night", category: "electrical", priority: "high", status: "open" },
  { title: "Parking slot taken by outsider's bike", category: "other", priority: "low", status: "resolved" },
];

const NOTICES = [
  { title: "Holi get-together this Sunday", body: "We're hosting a Holi brunch in the common lounge from 11 AM. Colors and snacks on us — guests welcome with prior intimation at the front desk.", audience: "residents" },
  { title: "Quarterly fire drill — Friday 10 AM", body: "A fire safety drill will be conducted across all floors this Friday at 10 AM. Participation is mandatory; the lift will be paused for 15 minutes.", audience: "all" },
  { title: "Wi-Fi upgraded to 300 Mbps", body: "The building broadband has been upgraded. Please reconnect to the PGOS-5G network. Reach the front desk if you face drops after the migration window.", audience: "residents" },
  { title: "Rent dues — gentle reminder", body: "7 residents have pending rent for this month. Dues outstanding past the 10th attract a late fee of ₹300. Pay via UPI to avoid receipts queue.", audience: "residents" },
  { title: "New mess menu rotation from Monday", body: "Based on last month's feedback poll, the mess menu rotates from Monday: dosa night moves to Sunday, and Wednesday lunch gets sambar rice.", audience: "all" },
];

/* ------------------------------------------------------------------ seed */
export async function resetDatabase() {
  await db.delete(auditLogs);
  await db.delete(announcements);
  await db.delete(messMenus);
  await db.delete(visitors);
  await db.delete(complaints);
  await db.delete(staff);
  await db.delete(expenses);
  await db.delete(payments);
  await db.delete(invoices);
  await db.delete(stayHistory);
  await db.delete(tenants);
  await db.delete(beds);
  await db.delete(rooms);
  await db.delete(properties);
  await db.delete(users);
}

export async function runSeed() {
  /* users */
  const [owner] = await db
    .insert(users)
    .values({
      email: "owner@pgos.in",
      name: "Aarav Mehta",
      role: "owner",
      passwordHash: hashPassword("demo1234"),
    })
    .returning();
  await db.insert(users).values({
    email: "manager@pgos.in",
    name: "Prakash Shetty",
    role: "manager",
    passwordHash: hashPassword("demo1234"),
  });

  /* properties, rooms, beds */
  const allBeds: { bed: any; room: any; property: any }[] = [];
  for (const p of PROPERTY_SEED) {
    const [prop] = await db
      .insert(properties)
      .values({
        name: p.name,
        code: p.code,
        type: p.type,
        address: p.address,
        city: p.city,
        floors: p.floors,
        amenities: p.amenities,
        managerName: p.managerName,
        phone: p.phone,
      })
      .returning();
    for (const r of p.rooms) {
      const cap = { single: 1, double: 2, triple: 3, quad: 4 }[r.type]!;
      const [room] = await db
        .insert(rooms)
        .values({
          propertyId: prop.id,
          floor: r.floor,
          number: r.number,
          type: r.type,
          capacity: cap,
          rent: r.rent,
          attachedBath: !!r.attachedBath,
          amenities: r.attachedBath ? ["attached bath", "hot water"] : ["hot water"],
        })
        .returning();
      for (let i = 0; i < cap; i++) {
        const [bed] = await db
          .insert(beds)
          .values({ roomId: room.id, label: "ABCD"[i], status: "available" })
          .returning();
        allBeds.push({ bed, room, property: prop });
      }
    }
  }

  /* decide bed allocation */
  let reservedCount = 0;
  allBeds.forEach(({ bed }, i) => {
    if (i === 8 || i === 40) bed.status = "maintenance";
    else if (reservedCount < 4 && rnd() < 0.06) {
      bed.status = "reserved";
      reservedCount++;
    } else if (rnd() < 0.78) bed.status = "occupied";
  });

  /* tenant factory */
  const code = () => `XXXX XXXX ${between(1000, 9999)}`;
  async function makeTenant(
    status: "active" | "reserved" | "moved_out",
    slot: { bed?: any; room?: any; property: any },
    joinMonthsAgo: number,
    leave?: string
  ) {
    const gender = pick(["male", "male", "female", "female"]) as string;
    const namePool = FIRST;
    const name = `${pick(namePool)} ${pick(LAST)}`;
    const isStudent = rnd() < 0.34;
    const joinDate = dayOf(monthsBack(joinMonthsAgo)[0], between(1, 26));
    const [t] = await db
      .insert(tenants)
      .values({
        propertyId: slot.property.id,
        roomId: slot.room?.id ?? null,
        bedId: slot.bed?.id ?? null,
        name,
        phone: phone(),
        email: `${name.toLowerCase().replace(/[^a-z]/g, ".").replace(/\.+/g, ".")}@gmail.com`,
        gender,
        dob: `19${between(94, 99)}-${pad(between(1, 12))}-${pad(between(1, 28))}`,
        occupation: isStudent ? "student" : "working",
        organization: isStudent ? pick(COLLEGE) : pick(COMPANY),
        permanentAddress: `${between(2, 480)}, ${pick(["MG Road", "Anna Nagar", "Banjara Hills", "Sector 62", "Thane West", "Salt Lake", "Velachery", "Kothrud"])}, ${pick(["Chennai", "Hyderabad", "Mumbai", "Kolkata", "Pune", "Kochi"])}`,
        idType: rnd() < 0.75 ? "aadhaar" : "pan",
        idNumber: rnd() < 0.75 ? code() : `${pick(["A", "B", "C", "D"])}QP${pick(["K", "M", "R", "S"])}${between(1000, 9999)}${pick(["F", "K", "L", "P"])}`,
        guardianName: `${pick(FIRST)} ${pick(LAST)}`,
        guardianPhone: phone(),
        joinDate,
        moveOutDate: leave ?? null,
        rent: slot.room?.rent ?? 0,
        deposit: (slot.room?.rent ?? 0) * 2,
        status,
        notes: rnd() < 0.25 ? pick([
          "Prefers upper floor, light sleeper.",
          "Night-shift schedule — quiet hours flexible.",
          "Vegetarian meals only.",
          "Parents visit on weekends occasionally.",
        ]) : null,
      })
      .returning();
    if (slot.bed) {
      await db.insert(stayHistory).values({
        tenantId: t.id,
        propertyId: slot.property.id,
        roomId: slot.room!.id,
        bedId: slot.bed!.id,
        fromDate: joinDate,
        toDate: leave ?? null,
        reason: "check-in",
      });
      await db.insert(payments).values({
        receiptNo: tmpNo(),
        tenantId: t.id,
        propertyId: t.propertyId,
        amount: t.deposit,
        method: pick(["upi", "upi", "cash", "bank"]),
        date: joinDate,
        note: "Security deposit",
      });
    }
    return t;
  }

  /* active + reserved tenants on beds */
  const activeTenants: any[] = [];
  for (const slot of allBeds) {
    if (slot.bed.status !== "available") {
      await db.update(beds).set({ status: slot.bed.status }).where(eqD(beds.id, slot.bed.id));
    }
    if (slot.bed.status === "occupied") {
      const t = await makeTenant("active", slot, between(1, 8));
      activeTenants.push(t);
    } else if (slot.bed.status === "reserved") {
      const t = await makeTenant("reserved", slot, 0);
      // future join date
      const d = new Date();
      d.setDate(d.getDate() + between(2, 9));
      await db
        .update(tenants)
        .set({ joinDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` })
        .where(eq2(t.id));
      t.status = "reserved";
      activeTenants.push(t);
    }
  }

  /* moved-out tenants (history + paid bills) */
  const movedMonths = monthsBack(7);
  for (let i = 0; i < 12; i++) {
    const slot = pick(allBeds);
    const joinedAgo = between(4, 9);
    const stayed = between(2, 5);
    const leaveKey = monthsBack(Math.max(0, joinedAgo - stayed))[0];
    const leaveDate = dayOf(leaveKey, between(2, 26));
    const t = await makeTenant(
      "moved_out",
      { property: slot.property, room: slot.room, bed: undefined },
      joinedAgo,
      leaveDate
    );
    // past rent: fully paid
    const span = monthsSlice(Math.max(0, joinedAgo - stayed + 1), joinedAgo);
    for (const mk of span) {
      const amount = t.rent || slot.room.rent;
      const [inv] = await db
        .insert(invoices)
        .values({
          invoiceNo: tmpNo(),
          tenantId: t.id,
          propertyId: t.propertyId,
          monthKey: mk,
          amount,
          paidAmount: amount,
          status: "paid",
          dueDate: nextMonth5(mk),
          method: "upi",
          paidAt: new Date(`${mk}-0${between(3, 8)}T11:00:00`),
          note: "Monthly rent",
        })
        .returning();
      await db.insert(payments).values({
        receiptNo: tmpNo(),
        tenantId: t.id,
        invoiceId: inv.id,
        propertyId: t.propertyId,
        amount,
        method: pick(["upi", "upi", "bank", "cash"]),
        date: dayOf(mk, between(3, 9)),
        note: "Monthly rent",
      });
    }
  }

  /* invoices for active tenants */
  const allMonths = monthsBack(7);
  for (const t of activeTenants) {
    if (t.status === "reserved") continue;
    const joinKey = t.joinDate.slice(0, 7);
    const startIdx = Math.max(0, allMonths.indexOf(joinKey));
    for (let mi = startIdx; mi < allMonths.length; mi++) {
      const mk = allMonths[mi];
      const isCurrent = mi === allMonths.length - 1;
      const r = rnd();
      let status = "pending";
      let paidAmount = 0;
      let lateFee = 0;
      if (!isCurrent) {
        if (r < 0.85) {
          status = "paid";
          paidAmount = t.rent;
        } else if (r < 0.92) {
          status = "partial";
          paidAmount = Math.round(t.rent * 0.5);
          lateFee = 300;
        } else {
          lateFee = 300;
        }
      } else if (r < 0.38) {
        status = "paid";
        paidAmount = t.rent;
      } else if (r < 0.5) {
        status = "partial";
        paidAmount = Math.round(t.rent * 0.4);
      }
      const [inv] = await db
        .insert(invoices)
        .values({
          invoiceNo: tmpNo(),
          tenantId: t.id,
          propertyId: t.propertyId,
          monthKey: mk,
          amount: t.rent,
          lateFee,
          paidAmount,
          status,
          dueDate: nextMonth5(mk),
          method: status !== "pending" ? pick(["upi", "upi", "cash", "bank"]) : null,
          paidAt: status === "paid" ? new Date(`${mk}-${pad(between(3, 9))}T10:30:00`) : null,
          note: "Monthly rent",
        })
        .returning();
      if (paidAmount > 0) {
        await db.insert(payments).values({
          receiptNo: tmpNo(),
          tenantId: t.id,
          invoiceId: inv.id,
          propertyId: t.propertyId,
          amount: paidAmount,
          method: inv.method ?? "upi",
          date: dayOf(mk, between(3, 9)),
          note: status === "partial" ? "Part payment — balance promised by 10th" : "Monthly rent",
        });
      }
    }
  }

  /* fix invoiceNo / receiptNo placeholders */
  await db.execute(sql2.raw(
    `update invoices set "invoice_no" = 'INV-' || lpad(id::text, 5, '0') where "invoice_no" like 'TMP-%'`
  ));
  await db.execute(sql2.raw(
    `update payments set "receipt_no" = 'RCPT-' || lpad(id::text, 5, '0') where "receipt_no" like 'TMP-%'`
  ));

  /* expenses (6 months, all properties) */
  const props = await db.select().from(properties);
  const VENDORS: Record<string, string[]> = {
    groceries: ["Metro Wholesale", "BigBasket Business", "Local Mandi"],
    utilities: ["BESCOM", "BWSSB", "ACT Fibernet", "JioFiber"],
    salary: ["Staff payroll"],
    maintenance: ["Urban Company", "Local Electrician", "Plumber Ramesh", "CoolTech Services"],
    supplies: ["Amazon Business", "Hygiene Depot"],
    marketing: ["MagicBricks", "NoBroker"],
  };
  for (const mk of monthsBack(5)) {
    for (const p of props) {
      const scale = mk === monthKeyNow() ? 0.5 : 1; // current month partial
      const rows: [string, number, number][] = [
        ["salary", 38000, 52000],
        ["groceries", 16000, 26000],
        ["utilities", 6000, 12000],
        ["maintenance", 2000, 9000],
        ["supplies", 1200, 4200],
      ];
      if (rnd() < 0.3) rows.push(["marketing", 1500, 4000]);
      for (const [cat, lo, hi] of rows) {
        const amt = Math.round(between(lo, hi) * scale);
        if (amt <= 0) continue;
        const n = cat === "groceries" ? 3 : cat === "utilities" ? 2 : 1;
        for (let k = 0; k < n; k++) {
          await db.insert(expenses).values({
            propertyId: p.id,
            category: cat,
            vendor: pick(VENDORS[cat]),
            amount: Math.max(400, Math.round(amt / n)),
            date: dayOf(mk, cat === "salary" ? 1 : between(2, 24)),
            note:
              cat === "groceries"
                ? pick(["Rice, atta & oil restock", "Vegetables weekly lot", "Dairy & eggs supply"])
                : cat === "utilities"
                ? pick(["Electricity bill", "Water bill", "Internet broadband"])
                : cat === "salary"
                ? "Monthly staff salaries"
                : cat === "maintenance"
                ? pick(["Geyser repair", "RO filter service", "Pest control", "Painting touch-up"])
                : cat === "supplies"
                ? pick(["Cleaning supplies", "Bathroom consumables"])
                : "Listing & ads",
          });
        }
      }
    }
  }

  /* staff */
  const STAFF_ROLES: [string, string, number, number, string][] = [
    ["manager", "Sunrise Residency", 26000, 32000, "day"],
    ["caretaker", "Sunrise Residency", 14000, 16000, "day"],
    ["cook", "Sunrise Residency", 15000, 17000, "day"],
    ["housekeeping", "Sunrise Residency", 12000, 13500, "day"],
    ["security", "Sunrise Residency", 13000, 14500, "night"],
    ["manager", "Maple Heights Hostel", 24000, 28000, "day"],
    ["cook", "Maple Heights Hostel", 14000, 16000, "day"],
    ["housekeeping", "Maple Heights Hostel", 11500, 13000, "rotational"],
    ["security", "Maple Heights Hostel", 13000, 14000, "night"],
    ["manager", "Orchid Stays", 28000, 34000, "day"],
    ["housekeeping", "Orchid Stays", 12500, 14000, "day"],
    ["security", "Orchid Stays", 13500, 15000, "rotational"],
  ];
  for (const [role, propName, lo, hi, shift] of STAFF_ROLES) {
    const p = props.find((x) => x.name === propName)!;
    await db.insert(staff).values({
      propertyId: p.id,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      role,
      phone: phone(),
      salary: between(lo, hi),
      shift,
      joinedOn: dayOf(monthsBack(between(3, 18))[0], between(1, 25)),
      status: rnd() < 0.1 ? "on_leave" : "active",
    });
  }

  /* complaints */
  const actives = activeTenants.filter((t) => t.status === "active");
  for (let i = 0; i < COMPLAINTS.length; i++) {
    const c = COMPLAINTS[i];
    const t = pick(actives);
    const createdDaysAgo = c.status === "resolved" ? between(4, 20) : between(0, 5);
    const created = new Date(Date.now() - createdDaysAgo * 86400000);
    await db.insert(complaints).values({
      propertyId: t.propertyId,
      tenantId: t.id,
      title: c.title,
      category: c.category,
      priority: c.priority,
      status: c.status,
      description: pick([
        "Reported at the front desk. Needs a quick look.",
        "Raised via the resident register.",
        "Spoke to the caretaker — recurring issue this month.",
        "Happening since last week, please prioritize.",
      ]),
      createdAt: created,
      resolvedAt: c.status === "resolved" ? new Date(created.getTime() + between(1, 3) * 86400000) : null,
    });
  }

  /* visitors */
  for (let i = 0; i < 11; i++) {
    const t = pick(actives);
    const recent = i < 4;
    const checkIn = recent
      ? new Date(Date.now() - between(1, 6) * 3600000)
      : new Date(Date.now() - between(1, 9) * 86400000 + between(0, 5) * 3600000);
    await db.insert(visitors).values({
      propertyId: t.propertyId,
      tenantId: t.id,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      relation: pick(RELATIONS),
      purpose: pick(["Weekend visit", "Dropping off luggage", "Family lunch", "Help with room setup", "Short stay pass"]),
      checkIn,
      checkOut: recent && i < 2 ? null : new Date(checkIn.getTime() + between(1, 5) * 3600000),
    });
  }

  /* notices */
  for (let i = 0; i < NOTICES.length; i++) {
    await db.insert(announcements).values({
      ...NOTICES[i],
      createdAt: new Date(Date.now() - i * between(20, 40) * 3600000),
    });
  }

  /* mess */
  for (let d = 0; d < 7; d++) {
    await db.insert(messMenus).values({
      dayOfWeek: d,
      breakfast: MESS[d][0],
      lunch: MESS[d][1],
      snacks: MESS[d][2],
      dinner: MESS[d][3],
    });
  }

  /* audit trail */
  const auditSeed: [string, string, string][] = [
    ["Aarav Mehta", "recorded", "payment ₹11,500 from Kavya Rao · RCPT"],
    ["Prakash Shetty", "created", "room 402 at Sunrise Residency"],
    ["Aarav Mehta", "resolved", "complaint 'Ceiling fan making rattling noise'"],
    ["Aarav Mehta", "checked out", "resident Tarun Yadav from Room 203"],
    ["Prakash Shetty", "created", "notice 'Rent dues — gentle reminder'"],
    ["Aarav Mehta", "generated", "rent invoices for this month"],
    ["Prakash Shetty", "created", "expense ₹9,200 · CoolTech Services"],
    ["Aarav Mehta", "transferred", "resident Harini Nair to Room B1 · bed B"],
  ];
  for (let i = 0; i < auditSeed.length; i++) {
    await db.insert(auditLogs).values({
      actor: auditSeed[i][0],
      action: auditSeed[i][1],
      entity: auditSeed[i][2].split(" ")[0],
      detail: auditSeed[i][2],
      createdAt: new Date(Date.now() - i * between(3, 9) * 3600000),
    });
  }

  return { owner: owner.email };
}

/* helpers used inside seed */
import { eq as eqD, sql as sql2 } from "drizzle-orm";
const eq2 = (id: number) => eqD(tenants.id, id);

function monthKeyNow() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function nextMonth5(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m, 5);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthsSlice(fromBack: number, toBack: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = toBack; i >= fromBack; i--)
    out.push(`${new Date(now.getFullYear(), now.getMonth() - i, 1).getFullYear()}-${pad(
      new Date(now.getFullYear(), now.getMonth() - i, 1).getMonth() + 1
    )}`);
  return out;
}

/* CLI entry: `npx tsx src/db/seed.ts` — skips if data already exists */
if (process.argv[1]?.endsWith("seed.ts")) {
  (async () => {
    const existing = await db.select().from(users).limit(1);
    if (existing.length > 0) {
      console.log("Database already seeded — skipping (use /api/seed?reset to reseed).");
      process.exit(0);
    }
    console.log("Seeding PG·OS demo data…");
    const res = await runSeed();
    console.log(`Done. Sign in as ${res.owner} / demo1234`);
    process.exit(0);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
