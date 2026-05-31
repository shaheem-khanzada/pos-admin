import { Cart } from '@/payload-types'
import type { CollectionBeforeChangeHook } from 'payload'
import { extractID } from 'payload/shared'

// Helper to check if a value is strictly a number (and tells TypeScript it's safe)
const isNumber = (value: unknown): value is number => typeof value === 'number' && value > 0

// Helper to safely grab the number, defaulting to 0 if missing or invalid
const getAmount = (value: unknown): number => (isNumber(value) ? value : 0)

export const snapshotCartItemPricing: CollectionBeforeChangeHook<Cart> = async ({
  data,
  req,
}) => {
  const items = Array.isArray(data?.items) ? data.items : []
  const discount = data.discount ?? 0

  const productIds = new Set<string>()
  const variantIds = new Set<string>()

  for (const item of items) {
    if (isNumber(item.unitPriceInPKR) && isNumber(item.unitCostInPKR)) {
      continue
    }

    const productId = item.product ? extractID(item.product) : null
    if (productId) productIds.add(productId)

    const variantId = item.variant ? extractID(item.variant) : null
    if (variantId) variantIds.add(variantId)
  }

  const [productsRes, variantsRes] = await Promise.all([
    productIds.size > 0
      ? req.payload.find({
        collection: 'products',
        depth: 0,
        pagination: false,
        req,
        where: { id: { in: Array.from(productIds) } },
      })
      : { docs: [] },
    variantIds.size > 0
      ? req.payload.find({
        collection: 'variants',
        depth: 0,
        pagination: false,
        req,
        where: { id: { in: Array.from(variantIds) } },
      })
      : { docs: [] },
  ])

  // Lookups using the raw ID
  const products = new Map(productsRes.docs.map((p) => [p.id as string, p]))
  const variants = new Map(variantsRes.docs.map((v) => [v.id as string, v]))

  let cogsTotal = 0
  let revenueTotal = 0

  for (const item of items) {
    const quantity = getAmount(item?.quantity)

    if (isNumber(item.unitPriceInPKR) && isNumber(item.unitCostInPKR)) {
      cogsTotal += item.unitCostInPKR * quantity
      revenueTotal += item.unitPriceInPKR * quantity
      continue
    }

    let unitPrice = 0
    let unitCost = 0

    const productId = item.product ? extractID(item.product) : null
    const variantId = item.variant ? extractID(item.variant) : null

    const product = productId ? products.get(productId) : null

    if (product) {
      if (product.enableVariants && variantId && variants.has(variantId)) {
        const variant = variants.get(variantId)
        unitPrice = getAmount(variant?.priceInPKR)
        unitCost = getAmount(variant?.costInPKR)
      } else {
        unitPrice = getAmount(product?.priceInPKR)
        unitCost = getAmount(product?.costInPKR)
      }
    }

    item.unitPriceInPKR = unitPrice
    item.unitCostInPKR = unitCost

    cogsTotal += unitCost * quantity
    revenueTotal += unitPrice * quantity
  }

  const subtotal = data.subtotal ?? revenueTotal

  data.cogsTotal = cogsTotal
  data.grossProfit = revenueTotal - cogsTotal - discount
  data.total = subtotal - discount

  return data
}