import { APIError } from 'payload'
import type { CollectionAfterChangeHook } from 'payload'

import { extractID } from 'payload/shared'

export const decrementInventoryAfterCartChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (!Array.isArray(doc?.items) || doc.items.length === 0) return doc

  for (const item of doc.items) {
    const quantity = typeof item?.quantity === 'number' ? item.quantity : 0
    if (quantity <= 0) continue

    if (item?.variant) {
      const id = extractID(item.variant)
      if (!id) {
        throw new APIError('Invalid variant relation in cart item.', 400)
      }

      await req.payload.db.updateOne({
        id,
        collection: 'variants',
        data: {
          inventory: { $inc: quantity * -1 },
        },
      })
      continue
    }

    if (item?.product) {
      const id = extractID(item.product)
      if (!id) {
        throw new APIError('Invalid product relation in cart item.', 400)
      }

      await req.payload.db.updateOne({
        id,
        collection: 'products',
        data: {
          inventory: { $inc: quantity * -1 },
        },
      })
    }
  }

  return doc
}
