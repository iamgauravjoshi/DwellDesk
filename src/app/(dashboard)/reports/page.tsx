"use client";

import { AreaChart, BarColumns, Donut, HBars } from "@/components/charts";
import {
  Badge,
  Card,
  PageHeader,
  Spinner,
  StatCard,
  Table,
  pretty,
  type Column,
} from "@/components/ui";
import { useList } from "@/lib/hooks";
import { cx, inr } from "@/lib/utils";
import { BarChart3, Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";

const METHOD_LABEL: Record<string, string> = { upi: "UPI", cash: "Cash", bank: "Bank transfer", card: "Card" };

export default function ReportsPage() {
  const { data, isLoading } = useList<any>(["reports"], "/api/reports");

  if (isLoading || !data) return <Spinner />;

  const { months, totals } = data;
  const avgMargin = totals.income > 0 ? Math.round((totals.net / totals.income) * 100) : 0;
  const best = (months as any[]).reduce<any | null>(
    (acc, m) => (acc === null || m.net > acc.net ? m : acc),
    null
  );

  const plCols: Column<any>[] = [
    { header: "Month", render: (m) => <span className="font-medium text-ink-800">{m.label}</span> },
    { header: "Collections", align: "right", render: (m) => <span className="tabular-nums text-emerald-600">{inr(m.income)}</span> },
    { header: "Expenses", align: "right", render: (m) => <span className="tabular-nums text-amber-600">{inr(m.expense)}</span> },
    {
      header: "Net", align: "right",
      render: (m) => (
        <span className={cx("font-semibold tabular-nums", m.net >= 0 ? "text-ink-900" : "text-rose-600")}>
          {m.net >= 0 ? "+" : "−"}{inr(Math.abs(m.net))}
        </span>
      ),
    },
    {
      header: "Margin", align: "right",
      render: (m) => <Badge tone={m.net >= 0 ? "emerald" : "rose"}>{m.net >= 0 ? "+" : ""}{m.margin}%</Badge>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Reports & P&L" subtitle="Financial health across the portfolio — trailing 6 months" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total collections" value={inr(totals.income)} icon={TrendingUp} tone="emerald" hint="rent, deposits & extras" />
        <StatCard label="Total expenses" value={inr(totals.expense)} icon={TrendingDown} tone="amber" hint="operations & payroll" />
        <StatCard
          label="Net profit"
          value={inr(totals.net)}
          icon={Scale}
          tone={totals.net >= 0 ? "iris" : "rose"}
          hint={`${avgMargin}% average margin`}
        />
        <StatCard label="Best month" value={best?.label ?? "—"} icon={BarChart3} tone="sky" hint="by net profit" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Income vs expenses" subtitle="Monthly collections against spend">
          <AreaChart
            labels={months.map((m: any) => m.label)}
            series={[
              { name: "Income", color: "#10b981", values: months.map((m: any) => m.income) },
              { name: "Expenses", color: "#f59e0b", values: months.map((m: any) => m.expense) },
            ]}
            format={(v) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
          />
        </Card>
        <Card title="Net profit by month" subtitle="Green months pay the EMIs">
          <BarColumns
            points={months.map((m: any) => ({ label: m.label.split(" ")[0], value: Math.max(0, m.net) }))}
            format={(v) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${Math.round(v / 1000)}k`)}
          />
          {months.some((m: any) => m.net < 0) && (
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
              Negative months are floored to zero here — check the table below for the full picture.
            </p>
          )}
        </Card>
      </div>

      <Card title="Profit & loss statement" subtitle="Month-wise breakup" pad={false}>
        <Table columns={plCols} rows={months} />
        <div className="flex items-center justify-end gap-8 border-t border-ink-900/8 bg-ink-50/50 px-5 py-3.5 text-sm">
          <span className="text-ink-400">6-month totals</span>
          <span className="font-semibold tabular-nums text-emerald-600">{inr(totals.income)}</span>
          <span className="font-semibold tabular-nums text-amber-600">{inr(totals.expense)}</span>
          <span className={cx("font-display font-semibold tabular-nums", totals.net >= 0 ? "text-ink-900" : "text-rose-600")}>
            {totals.net >= 0 ? "+" : "−"}{inr(Math.abs(totals.net))}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Expense breakdown" subtitle="Where it went lately">
          <Donut
            segments={(data.expenseByCategory as any[]).map((c) => ({ label: pretty(c.category), value: c.total }))}
            centerValue={inr((data.expenseByCategory as any[]).reduce((a: number, c: any) => a + c.total, 0)).replace("₹", "₹")}
            centerLabel="6m spend"
          />
        </Card>
        <Card title="Income by property" subtitle="Which building performs">
          <HBars
            items={(data.incomeByProperty as any[]).map((p) => ({ label: p.name, value: p.total }))}
            format={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${Math.round(v / 1000)}k`}
          />
        </Card>
        <Card title="Collection methods" subtitle="How residents prefer to pay">
          <Donut
            segments={(data.paymentMethods as any[]).map((m) => ({ label: METHOD_LABEL[m.method] ?? pretty(m.method), value: m.total }))}
            centerLabel="collected"
          />
        </Card>
      </div>
    </div>
  );
}
