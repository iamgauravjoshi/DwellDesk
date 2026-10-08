"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Building2,
  CircleDollarSign,
  ClipboardList,
  HandCoins,
  Plus,
  Receipt,
  TrendingUp,
  UsersRound,
  Wrench,
} from "lucide-react";
import { AreaChart, Donut, HBars } from "@/components/charts";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { useList } from "@/lib/hooks";
import { cx, fmtDate, timeAgo, inr, isOverdue, monthLabel, currentMonthKey } from "@/lib/utils";

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-ink-100/70" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-2xl bg-ink-100/70 lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-2xl bg-ink-100/70" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useList<any>(["dashboard"], "/api/dashboard");

  if (isLoading || !data) return <Skeleton />;

  const { stats } = data;
  const empty = stats.totalBeds === 0;

  if (empty) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={Building2}
          title="Welcome to PG·OS"
          body="Your workspace is fresh. Add your first property or load the demo dataset to explore."
          action={
            <Link href="/properties">
              <Button>
                <Plus className="h-4 w-4" /> Add your first property
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle={`Portfolio overview for ${monthLabel(currentMonthKey())}`}
        actions={
          <>
            <Link href="/residents?add=1">
              <Button variant="outline" size="md">
                <Plus className="h-4 w-4" /> New resident
              </Button>
            </Link>
            <Link href="/billing">
              <Button size="md">
                <Receipt className="h-4 w-4" /> Billing
              </Button>
            </Link>
          </>
        }
      />

      {/* Stat row */}
      <div className="animate-rise grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active residents"
          value={stats.residents}
          icon={UsersRound}
          tone="iris"
          hint={
            <>
              <span className="font-semibold text-sky-600">+{stats.reservedResidents}</span> booked
              · <span className="font-semibold text-emerald-600">{stats.available}</span> beds open
            </>
          }
        />
        <StatCard
          label="Bed occupancy"
          value={`${stats.occupancyPct}%`}
          icon={BedDouble}
          tone="sky"
          hint={
            <>
              <span className="font-semibold text-ink-700">{stats.occupied}</span> of{" "}
              {stats.totalBeds} beds occupied
            </>
          }
        />
        <StatCard
          label="Collected this month"
          value={inr(stats.collectedThisMonth)}
          icon={CircleDollarSign}
          tone="emerald"
          hint={
            <>
              of {inr(stats.billedThisMonth)} billed ·{" "}
              <span className="font-semibold text-emerald-600">
                {stats.billedThisMonth
                  ? Math.round((stats.collectedThisMonth / stats.billedThisMonth) * 100)
                  : 0}
                %
              </span>
            </>
          }
        />
        <StatCard
          label="Outstanding dues"
          value={inr(stats.outstanding)}
          icon={HandCoins}
          tone={stats.overdueCount > 0 ? "rose" : "amber"}
          hint={
            <>
              <span className="font-semibold text-rose-600">{stats.overdueCount}</span> overdue
              invoice{stats.overdueCount === 1 ? "" : "s"} · {inr(stats.overdueAmount)}
            </>
          }
        />
      </div>

      {/* Revenue + donut */}
      <div className="animate-rise grid grid-cols-1 gap-5 lg:grid-cols-3" style={{ animationDelay: "60ms" }}>
        <Card
          className="lg:col-span-2"
          title="Cash flow"
          subtitle="Collections vs operating expenses — last 6 months"
          action={
            <Link href="/reports" className="flex items-center gap-1 text-xs font-semibold text-iris-600 hover:text-iris-700">
              Full report <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <AreaChart
            labels={data.revenueSeries.labels}
            series={[
              { name: "Collections", color: "#6e63d9", values: data.revenueSeries.income },
              { name: "Expenses", color: "#f59e0b", values: data.revenueSeries.expense },
            ]}
            format={(v) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
          />
        </Card>
        <Card title="Bed status" subtitle="Live occupancy across properties">
          <div className="flex h-full flex-col justify-center py-3">
            <Donut
              segments={data.bedStatus}
              centerValue={`${stats.occupancyPct}%`}
              centerLabel="occupied"
            />
          </div>
        </Card>
      </div>

      {/* Middle row */}
      <div className="animate-rise grid grid-cols-1 gap-5 lg:grid-cols-3" style={{ animationDelay: "120ms" }}>
        <Card title="Occupancy by property" subtitle="Beds filled right now">
          {data.occupancyByProperty.length === 0 ? (
            <EmptyState compact icon={Building2} title="No properties yet" />
          ) : (
            <HBars
              items={data.occupancyByProperty.map((p: any) => ({
                label: p.name,
                value: p.occupied,
                sub: `${p.total - p.occupied} free`,
              }))}
            />
          )}
          <Link href="/rooms" className="mt-4 flex items-center gap-1 text-xs font-semibold text-iris-600 hover:text-iris-700">
            Open allocation board <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        <Card
          title="Pending dues"
          subtitle="Unpaid invoices, earliest first"
          action={
            <Link href="/billing" className="flex items-center gap-1 text-xs font-semibold text-iris-600 hover:text-iris-700">
              Billing <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          pad={false}
        >
          {data.dues.length === 0 ? (
            <EmptyState compact icon={HandCoins} title="All caught up" body="No pending dues. Savor it." />
          ) : (
            <ul className="divide-y divide-ink-900/5">
              {data.dues.map((d: any) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={d.tenantName} className="h-8 w-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-800">{d.tenantName}</p>
                    <p className="text-[11.5px] text-ink-400">
                      {monthLabel(d.monthKey)} · due {fmtDate(d.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold tabular-nums text-ink-900">
                      {inr(d.amount + d.lateFee - d.paidAmount)}
                    </p>
                    <StatusBadge value={isOverdue(d) ? "overdue" : d.status} className="mt-0.5" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Open complaints"
          subtitle={`${stats.openComplaints} unresolved right now`}
          action={
            <Link href="/complaints" className="flex items-center gap-1 text-xs font-semibold text-iris-600 hover:text-iris-700">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          pad={false}
        >
          {data.openComplaints.length === 0 ? (
            <EmptyState compact icon={Wrench} title="Nothing broken" body="No open complaints across properties." />
          ) : (
            <ul className="divide-y divide-ink-900/5">
              {data.openComplaints.map((c: any) => (
                <li key={c.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-ink-800">{c.title}</p>
                    <StatusBadge value={c.priority} />
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-ink-400">
                    {c.tenantName ?? "—"} · {c.propertyName} · {timeAgo(c.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="animate-rise grid grid-cols-1 gap-5 lg:grid-cols-3" style={{ animationDelay: "180ms" }}>
        <Card
          className="lg:col-span-1"
          title="Recent collections"
          subtitle="Latest receipts recorded"
          pad={false}
        >
          {data.recentPayments.length === 0 ? (
            <EmptyState compact icon={Receipt} title="No payments yet" />
          ) : (
            <ul className="divide-y divide-ink-900/5">
              {data.recentPayments.map((p: any) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={p.tenantName} className="h-8 w-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-800">{p.tenantName}</p>
                    <p className="text-[11.5px] text-ink-400">
                      {p.receiptNo} · {fmtDate(p.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-emerald-600">+{inr(p.amount)}</p>
                    <Badge tone={p.method} className="mt-0.5">{p.method.toUpperCase()}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          className="lg:col-span-2"
          title="Activity"
          subtitle="Latest actions across the workspace"
          pad={false}
        >
          {data.activity.length === 0 ? (
            <EmptyState compact icon={ClipboardList} title="No activity yet" body="Actions like check-ins, payments and edits will appear here." />
          ) : (
            <ul className="px-2 py-2">
              {data.activity.map((a: any, i: number) => (
                <li key={a.id} className="flex gap-4 px-3 py-2.5">
                  <div className="flex flex-col items-center">
                    <span className={cx(
                      "mt-1 flex h-7 w-7 items-center justify-center rounded-full",
                      i === 0 ? "bg-iris-100 text-iris-600" : "bg-ink-100 text-ink-400"
                    )}>
                      <TrendingUp className="h-3.5 w-3.5" />
                    </span>
                    {i < data.activity.length - 1 && <span className="mt-1 w-px flex-1 bg-ink-100" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-2">
                    <p className="text-[13px] leading-snug text-ink-700">
                      <span className="font-semibold text-ink-900">{a.actor}</span> {a.action}{" "}
                      {a.detail && <span className="text-ink-500">{a.detail}</span>}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-400">{timeAgo(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {stats.overdueCount > 0 && (
        <div className="animate-rise flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4" style={{ animationDelay: "220ms" }}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <AlertTriangle className="h-4.5 w-4.5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-800">
              {stats.overdueCount} invoice{stats.overdueCount === 1 ? "" : "s"} past due — {inr(stats.overdueAmount)} uncollected
            </p>
            <p className="text-xs text-rose-600/80">Send reminders or record collections from the billing desk.</p>
          </div>
          <Link href="/billing?status=overdue">
            <Button variant="danger" size="sm">Review dues</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
