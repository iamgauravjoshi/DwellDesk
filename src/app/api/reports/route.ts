import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { lastMonths, monthLabel } from "@/lib/utils";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const months = lastMonths(6);

  const [income, expense, byCategory, byProperty, methods] = await Promise.all([
    db.execute(sql`
      select to_char(date_trunc('month', date::date), 'YYYY-MM') as mk, coalesce(sum(amount),0)::int as total
      from payments group by 1`),
    db.execute(sql`
      select to_char(date_trunc('month', date::date), 'YYYY-MM') as mk, coalesce(sum(amount),0)::int as total
      from expenses group by 1`),
    db.execute(sql`
      select category, coalesce(sum(amount),0)::int as total from expenses
      where date::date >= (date_trunc('month', now()) - interval '5 months')
      group by category order by total desc`),
    db.execute(sql`
      select p.name, coalesce(sum(pay.amount),0)::int as total
      from payments pay join properties p on p.id = pay.property_id
      where pay.date::date >= (date_trunc('month', now()) - interval '5 months')
      group by p.name order by total desc`),
    db.execute(sql`
      select method, coalesce(sum(amount),0)::int as total, count(*)::int as count
      from payments group by method order by total desc`),
  ]);

  const inc = Object.fromEntries((income.rows as any[]).map((r) => [r.mk, r.total]));
  const exp = Object.fromEntries((expense.rows as any[]).map((r) => [r.mk, r.total]));

  const series = months.map((m) => {
    const incomeTotal = inc[m] ?? 0;
    const expenseTotal = exp[m] ?? 0;
    return {
      key: m,
      label: monthLabel(m),
      income: incomeTotal,
      expense: expenseTotal,
      net: incomeTotal - expenseTotal,
      margin: incomeTotal > 0 ? Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100) : 0,
    };
  });

  return NextResponse.json({
    months: series,
    totals: {
      income: series.reduce((a, r) => a + r.income, 0),
      expense: series.reduce((a, r) => a + r.expense, 0),
      net: series.reduce((a, r) => a + r.net, 0),
    },
    expenseByCategory: byCategory.rows,
    incomeByProperty: byProperty.rows,
    paymentMethods: methods.rows,
  });
}
