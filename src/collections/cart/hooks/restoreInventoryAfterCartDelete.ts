import type { Cart } from '@/payload-types'
import type { CollectionAfterDeleteHook } from 'payload'

import {
  applyCartInventoryDeltas,
  createCartInventoryDeltas,
  processCartItemsForInventory,
} from './utils/inventoryDeltas'

export const restoreInventoryAfterCartDelete: CollectionAfterDeleteHook<Cart> = async ({
  doc,
  req,
}) => {
  // Soft-deleted carts already had inventory restored in afterChange
  if (doc.deletedAt) return doc

  const deltas = createCartInventoryDeltas()

  processCartItemsForInventory(doc.items, deltas, 1)
  await applyCartInventoryDeltas(deltas, req)

  return doc
}
