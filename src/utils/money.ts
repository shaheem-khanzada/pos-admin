import { PKR } from '@/collections/shared'

const factor = 10 ** PKR.decimals

/** Mongo + ClickHouse store money in paisa. Use toRupees only for display (API, UI). */

// 49.80 -> 4980
export const toPaisa = (rupees: number): number => Math.round(rupees * factor)

// 4980 -> 49.80
export const toRupees = (paisa: number): number => paisa / factor
