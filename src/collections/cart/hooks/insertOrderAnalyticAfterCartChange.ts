import type { CollectionAfterChangeHook } from 'payload'

import type { Cart } from '@/payload-types'
import { insertOrderAnalytic } from '@/services/clickhouse'

/**
 * Push order + line items to ClickHouse when a cart document is created.
 */
export const insertOrderAnalyticAfterCartChange: CollectionAfterChangeHook = async ({
  doc,
  operation,
}) => {
  if (operation !== 'create') return doc

  await insertOrderAnalytic(doc as Cart)
  return doc
}
