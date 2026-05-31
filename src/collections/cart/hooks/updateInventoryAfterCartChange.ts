import type { Cart } from '@/payload-types'
import type { CollectionAfterChangeHook } from 'payload'

import {
  applyCartInventoryDeltas,
  createCartInventoryDeltas,
  processCartItemsForInventory,
} from './utils/inventoryDeltas'

/**
 * Keeps product/variant inventory in sync when a cart is created, updated, trashed, or restored.
 *
 * Think of inventory as a shelf count. An active cart "holds" items off the shelf.
 * This hook always does two steps in order:
 *   1. Revert — undo what the *previous* cart state took from the shelf
 *   2. Apply  — take what the *new* cart state needs from the shelf
 *
 * Soft delete (trash) sets `deletedAt`, which means the cart is no longer active,
 * so step 2 is skipped and inventory is restored. Restoring from trash clears
 * `deletedAt`, so step 1 is skipped and inventory is deducted again.
 */
export const updateInventoryAfterCartChange: CollectionAfterChangeHook<Cart> = async ({
  doc,
  req,
  operation,
  previousDoc,
}) => {
  const deltas = createCartInventoryDeltas()

  // Step 1 — Revert previous state (updates only).
  // If the cart was active before this change, put its items back on the shelf (+quantity).
  // Skip when previousDoc was trashed: those items were already returned on the trash action.
  if (operation === 'update' && !previousDoc?.deletedAt) {
    processCartItemsForInventory(previousDoc.items, deltas, 1)
  }

  // Step 2 — Apply current state.
  // If the cart is active now, take its items off the shelf (-quantity).
  // Skip when doc is trashed (deletedAt is set): a trashed cart should not hold inventory.
  if (!doc?.deletedAt) {
    processCartItemsForInventory(doc.items, deltas, -1)
  }

  await applyCartInventoryDeltas(deltas, req)

  return doc
}
