import type { Cart } from '@/payload-types'
import { extractID } from 'payload/shared'

function toClickHouseDateTime(iso: string): string {
  return iso.replace('T', ' ').replace('Z', '')
}

export type AnalyticOrderRow = {
  createdAt: string
  currency: string
  discount: number
  orderId: string
  paymentMethod: string
  status: Cart['status']
  subtotal: number
  tenant: string
  total: number
}

export type AnalyticItemRow = {
  createdAt: string
  itemCogs: number
  itemPrice: number
  itemProfit: number
  itemRevenue: number
  orderId: string
  productId: string
  quantity: number
  tenant: string
  variantId: string | null
}

export type AnalyticOrderBuild = {
  orderRow: AnalyticOrderRow
  itemRows: AnalyticItemRow[]
}

/**
 * Map a Payload cart to ClickHouse JSONEachRow shapes for orders + items.
 * Returns `null` when the cart has no tenant (nothing to attribute).
 */
export function builderAnalyticOrder(cart: Cart): AnalyticOrderBuild | null {
  if (!cart.tenant) return null

  const tenant = extractID(cart.tenant)
  const orderId = cart.id
  const createdAt = toClickHouseDateTime(new Date(cart.createdAt).toISOString())
  const subtotal = Number(cart.subtotal ?? 0)
  const discount = Number(cart.discount ?? 0)

  const orderRow: AnalyticOrderRow = {
    createdAt,
    currency: cart.currency ?? 'PKR',
    discount,
    orderId,
    paymentMethod: cart.paymentMethod,
    status: cart.status,
    subtotal,
    tenant,
    total: subtotal - discount,
  }

  const lines = cart.items ?? []
  const itemRows: AnalyticItemRow[] = lines.map((line) => {
    const productId = extractID(line.product ?? '')
    const variantId =
      line.variant == null || line.variant === '' ? null : extractID(line.variant)
    const quantity = Math.max(0, Math.floor(Number(line.quantity ?? 0)))
    const unitPrice = Number(line.unitPriceInPKR ?? 0)
    const unitCost = Number(line.unitCostInPKR ?? 0)
    const itemRevenue = unitPrice * quantity
    const itemCogs = unitCost * quantity
    const itemProfit = itemRevenue - itemCogs

    return {
      createdAt,
      itemCogs,
      itemPrice: unitPrice,
      itemProfit,
      itemRevenue,
      orderId,
      productId,
      quantity,
      tenant,
      variantId,
    }
  })

  return { itemRows, orderRow }
}
