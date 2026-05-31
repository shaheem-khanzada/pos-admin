import { createClient } from '@clickhouse/client'
import type { ClickHouseClient } from '@clickhouse/client'

import type { Cart } from '@/payload-types'

import { builderAnalyticOrder } from './builder'

export const ORDERS_TABLE = 'easy_pos_analytics_orders'
export const ITEMS_TABLE = 'easy_pos_analytics_items'

export const DAILY_ORDERS_TABLE = 'easy_pos_daily_orders'
export const DAILY_ITEMS_TABLE = 'easy_pos_daily_items'
export const DAILY_PRODUCTS_TABLE = 'easy_pos_daily_product_analytics'

const clickhouseDatabase = process.env.CLICKHOUSE_DATABASE ?? 'easy_pos_analytics'

let clickhouseClient: ClickHouseClient | null = null

function resolveClickHouseUrl(): string {
  if (process.env.CLICKHOUSE_URL) return process.env.CLICKHOUSE_URL
  const host = process.env.CLICKHOUSE_HOST ?? '127.0.0.1'
  const port = process.env.CLICKHOUSE_PORT ?? '8123'
  return `http://${host}:${port}`
}

/**
 * Get or create ClickHouse client (uses `CLICKHOUSE_DATABASE` / URL / credentials from env).
 */
export function getClickHouseClient(): ClickHouseClient {
  if (clickhouseClient) {
    return clickhouseClient
  }

  const clickhouseUrl = resolveClickHouseUrl()
  const clickhouseUser = process.env.CLICKHOUSE_USER ?? 'default'
  const clickhousePassword = process.env.CLICKHOUSE_PASSWORD ?? ''

  clickhouseClient = createClient({
    url: clickhouseUrl,
    database: clickhouseDatabase,
    username: clickhouseUser,
    password: clickhousePassword,
  })

  return clickhouseClient
}

/**
 * Insert one row into `easy_pos_analytics_orders` and one row per line into
 * `easy_pos_analytics_items`, derived from a Payload cart (IDs + snapshot pricing).
 */
export async function insertOrderAnalytic(cart: Cart): Promise<void> {
  try {
    const built = builderAnalyticOrder(cart)
    if (!built) {
      console.warn('⚠️  Skipping ClickHouse insert: cart has no tenant', cart.id)
      return
    }

    const client = getClickHouseClient()

    await client.insert({
      format: 'JSONEachRow',
      table: ORDERS_TABLE,
      values: [built.orderRow],
    })

    if (built.itemRows.length > 0) {
      await client.insert({
        format: 'JSONEachRow',
        table: ITEMS_TABLE,
        values: built.itemRows,
      })
    }
  } catch (error) {
    console.error('⚠️  Failed to insert order analytic into ClickHouse:', error)
  }
}

/**
 * Create database and `easy_pos_analytics_orders` / `easy_pos_analytics_items` if missing.
 * Uses a client without `database` set for first-time bootstrap.
 */
export async function initializeClickHouse(): Promise<void> {
  try {
    const client = createClient({
      url: resolveClickHouseUrl(),
      username: process.env.CLICKHOUSE_USER ?? 'default',
      password: process.env.CLICKHOUSE_PASSWORD ?? '',
      keep_alive: { enabled: false },
    })

    const db = process.env.CLICKHOUSE_DATABASE ?? 'easy_pos_analytics'

    // 🟢 DB
    await client.exec({
      query: `CREATE DATABASE IF NOT EXISTS ${db}`,
    })

    // =========================================================
    // 🟡 RAW TABLES
    // =========================================================

    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS ${db}.${ORDERS_TABLE} (
          tenant LowCardinality(String),

          orderId String,

          paymentMethod LowCardinality(String),

          currency LowCardinality(String) DEFAULT 'PKR',

          subtotal Int64,

          discount Int64 DEFAULT 0,

          total Int64,

          status LowCardinality(String),

          createdAt DateTime64(3, 'UTC')
        )
        ENGINE = MergeTree
        PARTITION BY toYYYYMM(createdAt)
        ORDER BY (tenant, createdAt, orderId)
      `,
    })

    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS ${db}.${ITEMS_TABLE} (
          tenant LowCardinality(String),

          orderId String,

          productId String,

          variantId Nullable(String),

          quantity UInt32,

          itemPrice Int64,

          itemRevenue Int64,

          itemCogs Int64,

          itemProfit Int64,

          createdAt DateTime64(3, 'UTC')
        )
        ENGINE = MergeTree
        PARTITION BY toYYYYMM(createdAt)
        ORDER BY (tenant, createdAt, productId, orderId)
      `,
    })

    // =========================================================
    // 🟢 ANALYTICS TABLES
    // =========================================================

    // 🟡 Daily Orders (orders + discount + paymentMethod)
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS ${db}.${DAILY_ORDERS_TABLE} (
          tenant LowCardinality(String),

          createdAt DateTime64(3, 'UTC'),

          paymentMethod LowCardinality(String),

          orders UInt32,
          discount Int64
        )
        ENGINE = SummingMergeTree
        PARTITION BY toYYYYMM(createdAt)
        ORDER BY (tenant, createdAt, paymentMethod)
      `,
    })

    // 🟡 Daily Items (revenue + profit + paymentMethod)
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS ${db}.${DAILY_ITEMS_TABLE} (
          tenant LowCardinality(String),

          createdAt DateTime64(3, 'UTC'),

          paymentMethod LowCardinality(String),

          revenue Int64,
          profit Int64
        )
        ENGINE = SummingMergeTree
        PARTITION BY toYYYYMM(createdAt)
        ORDER BY (tenant, createdAt, paymentMethod)
      `,
    })

    // 🟡 Daily Product Analytics
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS ${db}.${DAILY_PRODUCTS_TABLE} (
          tenant LowCardinality(String),

          createdAt DateTime64(3, 'UTC'),

          productId String,

          quantity UInt32,
          revenue Int64,
          profit Int64
        )
        ENGINE = SummingMergeTree
        PARTITION BY toYYYYMM(createdAt)
        ORDER BY (tenant, createdAt, productId)
      `,
    })

    // =========================================================
    // 🟢 MATERIALIZED VIEWS
    // =========================================================

    // 🟡 Orders MV
    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS ${db}.mv_daily_orders
        TO ${db}.${DAILY_ORDERS_TABLE}
        AS
        SELECT
          tenant,
          createdAt,
          paymentMethod,

          1 AS orders,
          discount
        FROM ${db}.${ORDERS_TABLE}
        WHERE status IN ('purchased', 'completed')
      `,
    })

    // 🟡 Items MV (join to get paymentMethod)
    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS ${db}.mv_daily_items
        TO ${db}.${DAILY_ITEMS_TABLE}
        AS
        SELECT
          i.tenant,
          i.createdAt,
          o.paymentMethod,

          i.itemRevenue AS revenue,
          i.itemProfit AS profit
        FROM ${db}.${ITEMS_TABLE} i
        INNER JOIN ${db}.${ORDERS_TABLE} o
          ON i.orderId = o.orderId AND i.tenant = o.tenant
      `,
    })

    // 🟡 Product MV
    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS ${db}.mv_daily_products
        TO ${db}.${DAILY_PRODUCTS_TABLE}
        AS
        SELECT
          tenant,
          createdAt,

          productId,
          quantity,
          itemRevenue AS revenue,
          itemProfit AS profit
        FROM ${db}.${ITEMS_TABLE}
      `,
    })

    await client.close()

    console.log('✅ ClickHouse initialized with analytics MVs')
  } catch (error) {
    console.error('⚠️ ClickHouse initialization failed:', error)
  }
}

export async function closeClickHouseClient(): Promise<void> {
  if (clickhouseClient) {
    await clickhouseClient.close()
    clickhouseClient = null
  }
}

export { clickhouseDatabase }
