import type { CollectionAfterChangeHook } from 'payload'

/**
 * Push order + line items to ClickHouse when a cart document is created.
 * ClickHouse disabled for now — uncomment when analytics is enabled.
 */
export const insertOrderAnalyticAfterCartChange: CollectionAfterChangeHook = async ({
  doc,
  operation,
}) => {
  if (operation !== 'create') return doc

  // await insertOrderAnalytic(doc as Cart)

  return doc
}
