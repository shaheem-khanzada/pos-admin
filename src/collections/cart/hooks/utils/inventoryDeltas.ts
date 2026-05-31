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
    await applyInventoryDelta(req, 'variants', id, delta)
  }

  for (const [id, delta] of Object.entries(deltas.productDeltas)) {
    if (delta === 0) continue
    await applyInventoryDelta(req, 'products', id, delta)
  }
}

// TODO: Replace read-clamp-set with atomic MongoDB update (e.g. aggregation pipeline
// $max + $add) once we bypass Payload's db.updateOne — it only supports $inc today.
async function applyInventoryDelta(
  req: PayloadRequest,
  collection: 'products' | 'variants',
  id: string,
  delta: number,
) {
  const doc = await req.payload.findByID({
    collection,
    id,
    depth: 0,
    overrideAccess: true,
    req,
    select: { inventory: true },
  })

  const current = typeof doc.inventory === 'number' ? doc.inventory : 0
  const next = Math.max(0, current + delta)

  if (next === current) return

  await req.payload.db.updateOne({
    id,
    collection,
    data: { inventory: next },
    req,
  })
}
