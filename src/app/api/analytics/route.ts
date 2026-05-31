import { NextResponse } from 'next/server'
import { clickhouse } from '@/lib/clickhouse'

const ORDERS = 'easy_pos_daily_orders'
const ITEMS = 'easy_pos_daily_items'
const PRODUCTS = 'easy_pos_daily_product_analytics'

function num(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function lift(current: number, prev: number) {
  if (prev === 0) return current === 0 ? 0 : null
  return ((current - prev) / prev) * 100
}

function parseAnalyticsTz(raw: string | null): string {
  const fallback = 'Asia/Karachi'
  if (!raw || raw.length > 64) return fallback
  if (raw.includes(`'`)) return fallback
  return raw
}

function startOfLocalDayUtc(localCalendarDateExpr: string, safeTz: string): string {
  return `toDateTime64(concat(toString(${localCalendarDateExpr}), ' 00:00:00'), 3, '${safeTz}')`
}

export async function GET(req: Request) {
  const url = new URL(req.url)

  const tenant = req.headers.get('tenant')
  const tz = parseAnalyticsTz(url.searchParams.get('tz'))

  const today = `toDate(toTimeZone(now64(3), '${tz}'))`

  const utcKpiFrom = startOfLocalDayUtc(`(${today}) - 59`, tz)
  const utcKpiTo = startOfLocalDayUtc(`(${today}) + 1`, tz)

  /** Last 30 local days inclusive: same upper bound as KPIs (“through end of today” in tz). */
  const utcDailyFrom = startOfLocalDayUtc(`(${today}) - 29`, tz)
  const utcDailyToExclusive = utcKpiTo

  if (!tenant) {
    return NextResponse.json(
      { message: 'tenant header is required', success: false },
      { status: 400 }
    )
  }

  try {
    const params = { tenant }

    // =========================================================
    // 🟢 1. KPI QUERY
    // =========================================================

    const kpiQuery = clickhouse.query({
      query: `
      SELECT
        sumIf(orders, d = ${today}) AS t_orders,
        sumIf(revenue, d = ${today}) AS t_revenue,
        sumIf(profit, d = ${today}) AS t_profit,
        sumIf(discount, d = ${today}) AS t_discount,

        sumIf(orders, d = ${today} - 1) AS y_orders,
        sumIf(revenue, d = ${today} - 1) AS y_revenue,
        sumIf(profit, d = ${today} - 1) AS y_profit,

        sumIf(orders, d >= ${today} - 6 AND d <= ${today}) AS l7_orders,
        sumIf(revenue, d >= ${today} - 6 AND d <= ${today}) AS l7_revenue,
        sumIf(profit, d >= ${today} - 6 AND d <= ${today}) AS l7_profit,
        sumIf(discount, d >= ${today} - 6 AND d <= ${today}) AS l7_discount,

        sumIf(orders, d >= ${today} - 13 AND d < ${today} - 6) AS p7_orders,
        sumIf(revenue, d >= ${today} - 13 AND d < ${today} - 6) AS p7_revenue,
        sumIf(profit, d >= ${today} - 13 AND d < ${today} - 6) AS p7_profit,

        sumIf(orders, d >= ${today} - 29 AND d <= ${today}) AS l30_orders,
        sumIf(revenue, d >= ${today} - 29 AND d <= ${today}) AS l30_revenue,
        sumIf(profit, d >= ${today} - 29 AND d <= ${today}) AS l30_profit,
        sumIf(discount, d >= ${today} - 29 AND d <= ${today}) AS l30_discount,

        sumIf(orders, d >= ${today} - 59 AND d < ${today} - 29) AS p30_orders,
        sumIf(revenue, d >= ${today} - 59 AND d < ${today} - 29) AS p30_revenue,
        sumIf(profit, d >= ${today} - 59 AND d < ${today} - 29) AS p30_profit
      FROM (
        SELECT
          toDate(toTimeZone(createdAt, '${tz}')) AS d,
          orders,
          discount,
          revenue,
          profit
        FROM (
          SELECT createdAt, orders, discount, 0 AS revenue, 0 AS profit
          FROM ${ORDERS}
          WHERE tenant = {tenant:String}
            AND createdAt >= ${utcKpiFrom}
            AND createdAt < ${utcKpiTo}

          UNION ALL

          SELECT createdAt, 0, 0, revenue, profit
          FROM ${ITEMS}
          WHERE tenant = {tenant:String}
            AND createdAt >= ${utcKpiFrom}
            AND createdAt < ${utcKpiTo}
        ) AS merged
      )
      `,
      query_params: params,
    })

    // =========================================================
    // 🟢 2. DAILY
    // =========================================================

    const dailyQuery = clickhouse.query({
      query: `
      SELECT
        d AS date,
        sum(orders) AS orders,
        sum(revenue) AS revenue,
        sum(profit) AS profit,
        sum(discount) AS discount
      FROM (
        SELECT
          toDate(toTimeZone(createdAt, '${tz}')) AS d,
          orders,
          discount,
          revenue,
          profit
        FROM (
          SELECT createdAt, orders, discount, 0 AS revenue, 0 AS profit
          FROM ${ORDERS}
          WHERE tenant = {tenant:String}
            AND createdAt >= ${utcDailyFrom}
            AND createdAt < ${utcDailyToExclusive}

          UNION ALL

          SELECT createdAt, 0, 0, revenue, profit
          FROM ${ITEMS}
          WHERE tenant = {tenant:String}
            AND createdAt >= ${utcDailyFrom}
            AND createdAt < ${utcDailyToExclusive}
        ) AS merged
      )
      GROUP BY d
      ORDER BY d
      `,
      query_params: params,
    })

    // =========================================================
    // 🟢 3. TOP PRODUCTS
    // =========================================================

    const topQuery = clickhouse.query({
      query: `
      SELECT
        productId,
        sum(quantity) AS quantity,
        sum(revenue) AS revenue,
        sum(profit) AS profit
      FROM ${PRODUCTS}
      WHERE tenant = {tenant:String}
        AND createdAt >= ${utcDailyFrom}
        AND createdAt < ${utcDailyToExclusive}
      GROUP BY productId
      ORDER BY revenue DESC
      LIMIT 10
      `,
      query_params: params,
    })

    const [kpiRes, dailyRes, topRes] = await Promise.all([
      kpiQuery,
      dailyQuery,
      topQuery,
    ])

    const row = (await kpiRes.json()).data[0] || {}

    const format = (c: Record<string, unknown>, p: Record<string, unknown>) => ({
      orders: num(c.orders),
      revenue: num(c.revenue),
      profit: num(c.profit),
      discount: num(c.discount),
      lift: {
        orders: lift(num(c.orders), num(p.orders)),
        revenue: lift(num(c.revenue), num(p.revenue)),
        profit: lift(num(c.profit), num(p.profit)),
      },
    })

    return NextResponse.json({
      success: true,
      meta: { timezone: tz, moneyUnit: 'paisa' },
      data: {
        today: format(
          { orders: row.t_orders, revenue: row.t_revenue, profit: row.t_profit, discount: row.t_discount },
          { orders: row.y_orders, revenue: row.y_revenue, profit: row.y_profit }
        ),
        last7Days: format(
          { orders: row.l7_orders, revenue: row.l7_revenue, profit: row.l7_profit, discount: row.l7_discount },
          { orders: row.p7_orders, revenue: row.p7_revenue, profit: row.p7_profit }
        ),
        last30Days: format(
          { orders: row.l30_orders, revenue: row.l30_revenue, profit: row.l30_profit, discount: row.l30_discount },
          { orders: row.p30_orders, revenue: row.p30_revenue, profit: row.p30_profit }
        ),
        daily: (await dailyRes.json()).data,
        topProducts30d: (await topRes.json()).data,
      },
    })
  } catch (error) {
    console.error('Analytics API failed:', error)

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'ClickHouse query failed',
      },
      { status: 500 }
    )
  }
}