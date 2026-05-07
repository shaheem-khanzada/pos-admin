import { Cart } from '@/payload-types'
import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import { extractID } from 'payload/shared'

type UnitPricing = { cost: number; price: number }

type ProductPricingRow = UnitPricing & { enableVariants: boolean }

/**
 * Snapshot per-item unit price + unit cost on the cart at sale time.
 *
 * Why: prices and costs change over time; reading them live from products /
 * variants would corrupt historical Gross Profit reports the moment a value is
 * edited. We freeze the values per cart item, then aggregate at the cart level
 * so the analytics layer can read precomputed totals.
 *
 * Variant vs product line: when `enableVariants` is false on the product, we
 * always use product unit price/cost even if a variant id is present. When true
 * and a variant is set, we use variant pricing (with parent product fallback);
 * if true but no variant, we fall back to product pricing.
 *
 * Pricing is loaded via Payload Local API (`find` + `req`) so it stays adapter-agnostic.
 */
export const snapshotCartItemPricing: CollectionBeforeChangeHook<Cart> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const items = Array.isArray(data?.items) ? data.items : []

  if (items.length === 0) {
    data.cogsTotal = 0
    data.grossProfit = 0
    return data
  }

  const wasPurchased = operation === 'update' && originalDoc?.status === 'purchased'

  const productIds = new Set<string>()
  for (const item of items) {
    if (!item?.product) continue
    const id = extractID(item?.product)
    if (id) productIds.add(String(id))
  }

  const productRows = await loadProductPricingRows(req, Array.from(productIds))

  const variantIds = new Set<string>()
  for (const item of items) {
    if (!item?.product || !item?.variant) continue
    const productId = extractID(item?.product)
    if (!productId || !item?.variant) continue
    const row = productRows.get(String(productId))
    if (!row?.enableVariants) continue
    const variantId = extractID(item.variant)
    if (variantId) variantIds.add(String(variantId))
  }

  const variantPricing = await loadVariantPricingMap(req, Array.from(variantIds), productRows)

  let cogsTotal = 0
  let revenueTotal = 0

  for (const item of items) {
    if (!item?.product || !item?.variant) continue
    const quantity = typeof item?.quantity === 'number' ? item.quantity : 0

    const productId = extractID(item?.product)
    const productRow = productId ? productRows.get(String(productId)) : undefined

    const useVariant =
      Boolean(productRow?.enableVariants && item?.variant && extractID(item.variant))

    const resolved = useVariant
      ? variantPricing.get(String(extractID(item.variant)))
      : productRow

    const liveUnitPrice = resolved?.price ?? 0
    const liveUnitCost = resolved?.cost ?? 0

    const unitPrice =
      wasPurchased && typeof item.unitPriceInPKR === 'number'
        ? item.unitPriceInPKR
        : liveUnitPrice
    const unitCost =
      wasPurchased && typeof item.unitCostInPKR === 'number'
        ? item.unitCostInPKR
        : liveUnitCost

    item.unitPriceInPKR = unitPrice
    item.unitCostInPKR = unitCost

    cogsTotal += unitCost * quantity
    revenueTotal += unitPrice * quantity
  }

  data.cogsTotal = round2(cogsTotal)
  data.grossProfit = round2(revenueTotal - cogsTotal)

  return data
}

const pickPrice = (doc: {
  priceInPKREnabled?: boolean | null
  priceInPKR?: number | null
}): number =>
  doc.priceInPKREnabled && typeof doc.priceInPKR === 'number' ? doc.priceInPKR : 0

const pickCost = (doc: {
  costInPKREnabled?: boolean | null
  costInPKR?: number | null
}): number =>
  doc.costInPKREnabled && typeof doc.costInPKR === 'number' ? doc.costInPKR : 0

const loadProductPricingRows = async (
  req: PayloadRequest,
  ids: string[],
): Promise<Map<string, ProductPricingRow>> => {
  const map = new Map<string, ProductPricingRow>()
  if (ids.length === 0) return map

  const { docs } = await req.payload.find({
    collection: 'products',
    depth: 0,
    limit: ids.length,
    pagination: false,
    req,
    select: {
      costInPKR: true,
      costInPKREnabled: true,
      enableVariants: true,
      priceInPKR: true,
      priceInPKREnabled: true,
    },
    where: { id: { in: ids } },
  })

  for (const doc of docs) {
    map.set(String(doc.id), {
      cost: pickCost(doc),
      enableVariants: Boolean(doc.enableVariants),
      price: pickPrice(doc),
    })
  }

  return map
}

const loadVariantPricingMap = async (
  req: PayloadRequest,
  ids: string[],
  productRows: Map<string, ProductPricingRow>,
): Promise<Map<string, UnitPricing>> => {
  const map = new Map<string, UnitPricing>()
  if (ids.length === 0) return map

  const { docs } = await req.payload.find({
    collection: 'variants',
    depth: 0,
    limit: ids.length,
    pagination: false,
    req,
    select: {
      costInPKR: true,
      costInPKREnabled: true,
      priceInPKR: true,
      priceInPKREnabled: true,
      product: true,
    },
    where: { id: { in: ids } },
  })

  const missingParentIds: string[] = []
  for (const doc of docs) {
    const parentId = extractID(doc.product)
    if (parentId && !productRows.has(String(parentId))) {
      missingParentIds.push(String(parentId))
    }
  }

  const parentFallback = new Map<string, UnitPricing>()
  if (missingParentIds.length > 0) {
    const uniqueParents = [...new Set(missingParentIds)]
    const { docs: parents } = await req.payload.find({
      collection: 'products',
      depth: 0,
      limit: uniqueParents.length,
      pagination: false,
      req,
      select: {
        costInPKR: true,
        costInPKREnabled: true,
        priceInPKR: true,
        priceInPKREnabled: true,
      },
      where: { id: { in: uniqueParents } },
    })
    for (const p of parents) {
      parentFallback.set(String(p.id), { cost: pickCost(p), price: pickPrice(p) })
    }
  }

  for (const doc of docs) {
    const parentId = extractID(doc.product)
    const fromCartProduct = parentId ? productRows.get(String(parentId)) : undefined
    const fallback =
      fromCartProduct ?? (parentId ? parentFallback.get(String(parentId)) : undefined)

    map.set(String(doc.id), {
      cost:
        doc.costInPKREnabled && typeof doc.costInPKR === 'number'
          ? doc.costInPKR
          : (fallback?.cost ?? 0),
      price:
        doc.priceInPKREnabled && typeof doc.priceInPKR === 'number'
          ? doc.priceInPKR
          : (fallback?.price ?? 0),
    })
  }

  return map
}
/** Avoid floating-point drift on currency math without pulling a money lib. */
const round2 = (n: number) => Math.round(n * 100) / 100

