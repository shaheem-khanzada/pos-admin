import type { Cart } from '@/payload-types'
import { APIError } from 'payload'
import type { PayloadRequest } from 'payload'
import { extractID } from 'payload/shared'

type InventoryDeltaMap = Record<string, number>

export type CartInventoryDeltas = {
  productDeltas: InventoryDeltaMap
  variantDeltas: InventoryDeltaMap
}

export const createCartInventoryDeltas = (): CartInventoryDeltas => ({
  productDeltas: {},
  variantDeltas: {},
})

export const processCartItemsForInventory = (
  items: Cart['items'],
  deltas: CartInventoryDeltas,
  multiplier: 1 | -1,
) => {
  if (!Array.isArray(items)) return

  for (const item of items) {
    const quantity = typeof item?.quantity === 'number' ? item.quantity : 0
    if (quantity <= 0) continue

    if (item?.variant) {
      const id = extractID(item.variant)
      if (!id) throw new APIError('Invalid variant relation in cart item.', 400)

      deltas.variantDeltas[id] = (deltas.variantDeltas[id] || 0) + quantity * multiplier
      continue
    }

    if (item?.product) {
      const id = extractID(item.product)
      if (!id) throw new APIError('Invalid product relation in cart item.', 400)

      deltas.productDeltas[id] = (deltas.productDeltas[id] || 0) + quantity * multiplier
    }
  }
}

export const applyCartInventoryDeltas = async (
  deltas: CartInventoryDeltas,
  req: PayloadRequest,
) => {
  for (const [id, delta] of Object.entries(deltas.variantDeltas)) {
    if (delta === 0) continue

    await req.payload.db.updateOne({
      id,
      collection: 'variants',
      data: {
        inventory: { $inc: delta },
      },
      req,
    })
  }

  for (const [id, delta] of Object.entries(deltas.productDeltas)) {
    if (delta === 0) continue

    await req.payload.db.updateOne({
      id,
      collection: 'products',
      data: {
        inventory: { $inc: delta },
      },
      req,
    })
  }
}
