import 'dotenv/config'

import { getPayload } from 'payload'

import config from '@payload-config'

type MenuVariant = {
  barcodeSuffix: string
  inventory: number
  optionIds: string[]
  priceInPKR: number
}

type MenuProduct = {
  barcode: string
  categories: string[]
  mediaAlt: string
  title: string
  variantTypeIds: string[]
  variants: MenuVariant[]
}

const tenantName = 'KFC'
const adminOpOptions = {
  disableTransaction: true,
  overrideAccess: true,
} as const

const productImageSources: Record<string, string> = {
  'KFC Zinger Burger':
    'https://images.ctfassets.net/crbk84xktnsl/5VLTVxAdES3m9k8sAYQQLw/a327b60ee76ec89f26fb67970e26a8bd/Zinger_Crunch_Burger.png',
  'KFC Mighty Zinger':
    'https://zingoast.com/wp-content/uploads/2025/07/Zinger-Burger-Final.png',
  'KFC Hot Wings 8 Pieces':
    'https://thumbs.dreamstime.com/b/crispy-fried-chicken-wings-wooden-table-kentucky-88919528.jpg',
  'KFC Chicken Bucket 6 Pieces':
    'https://images.rawpixel.com/image_png_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDI0LTA5L3Jhd3BpeGVsb2ZmaWNlOF9hX2dvbGRlbl9zaG90X2dyYXBoaWNfZWxlbWVudF9vZl9hX3NpbmdsZV9idWNrZV84NjJjZGU5OC05YzlkLTRkYjItODNhZi1lNGZjNjA4ZWY3NzEucG5n.png',
  'KFC Fries': 'https://assets3.thrillist.com/v1/image/2878607/1200x600/scale;;webp=auto;jpeg_quality=85.jpg',
  'KFC Pepsi':
    'https://thumbs.dreamstime.com/b/bangkok-thailand-july-cold-drink-pepsi-cup-desk-front-kfc-s-restaurant-bangkok-thailand-july-cold-drink-pepsi-cup-124388989.jpg',
}

const createPlaceholderImage = (label: string) => {
  const safe = label.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#111"/><text x="50%" y="50%" fill="#fff" font-family="Arial" font-size="64" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  const data = Buffer.from(svg, 'utf8')
  return {
    name: `${safe}.svg`,
    data,
    mimetype: 'image/svg+xml',
    size: data.length,
  }
}

const fetchImageAsUploadFile = async (label: string) => {
  const source = productImageSources[label]
  if (!source) return createPlaceholderImage(label)

  try {
    const response = await fetch(source)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const data = Buffer.from(arrayBuffer)
    const extension = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : contentType.includes('gif')
          ? 'gif'
          : 'jpg'

    return {
      name: `${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${extension}`,
      data,
      mimetype: contentType,
      size: data.length,
    }
  } catch (error) {
    console.warn(`Image download failed for "${label}", using placeholder.`, error)
    return createPlaceholderImage(label)
  }
}

const ensureTenant = async (payload: Awaited<ReturnType<typeof getPayload>>): Promise<any> => {
  const existing = await payload.find({
    ...adminOpOptions,
    collection: 'tenants',
    depth: 0,
    limit: 1,
    pagination: false,
    where: { name: { equals: tenantName } },
  })

  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    ...adminOpOptions,
    collection: 'tenants',
    data: { name: tenantName },
  } as any)
}

const ensureCategory = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: string,
  title: string,
): Promise<any> => {
  const existing = await payload.find({
    ...adminOpOptions,
    collection: 'categories',
    depth: 0,
    limit: 1,
    pagination: false,
    where: {
      and: [{ tenant: { equals: tenantId } }, { title: { equals: title } }],
    },
  })

  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    ...adminOpOptions,
    collection: 'categories',
    data: { tenant: tenantId, title },
  } as any)
}

const ensureVariantType = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: string,
  name: string,
  label: string,
): Promise<any> => {
  const existing = await payload.find({
    ...adminOpOptions,
    collection: 'variantTypes',
    depth: 0,
    limit: 1,
    pagination: false,
    where: {
      and: [{ tenant: { equals: tenantId } }, { name: { equals: name } }],
    },
  })

  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    ...adminOpOptions,
    collection: 'variantTypes',
    data: { tenant: tenantId, name, label },
  } as any)
}

const ensureVariantOption = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: string,
  variantTypeId: string,
  label: string,
  value: string,
): Promise<any> => {
  const existing = await payload.find({
    ...adminOpOptions,
    collection: 'variantOptions',
    depth: 0,
    limit: 1,
    pagination: false,
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { variantType: { equals: variantTypeId } },
        { value: { equals: value } },
      ],
    },
  })

  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    ...adminOpOptions,
    collection: 'variantOptions',
    data: { tenant: tenantId, variantType: variantTypeId, label, value },
  } as any)
}

const ensureMedia = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: string,
  alt: string,
): Promise<any> => {
  const existing = await payload.find({
    ...adminOpOptions,
    collection: 'media',
    depth: 0,
    limit: 1,
    pagination: false,
    where: {
      and: [{ tenant: { equals: tenantId } }, { alt: { equals: alt } }],
    },
  })

  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    ...adminOpOptions,
    collection: 'media',
    data: { tenant: tenantId, alt },
    file: await fetchImageAsUploadFile(alt),
  } as any)
}

const ensureProduct = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: string,
  product: MenuProduct,
  categoryMap: Record<string, string>,
): Promise<any> => {
  const media = await ensureMedia(payload, tenantId, product.mediaAlt)
  const categoryIds = product.categories.map((category) => categoryMap[category]).filter(Boolean)

  const existing = await payload.find({
    ...adminOpOptions,
    collection: 'products',
    depth: 0,
    limit: 1,
    pagination: false,
    where: {
      and: [{ tenant: { equals: tenantId } }, { title: { equals: product.title } }],
    },
  })

  if (existing.docs[0]) {
    return payload.update({
      ...adminOpOptions,
      collection: 'products',
      id: existing.docs[0].id,
      data: {
        barcode: product.barcode,
        categories: categoryIds,
        enableVariants: true,
        inventory: 250,
        media: media.id,
        priceInPKR: product.variants[0]?.priceInPKR || 0,
        priceInPKREnabled: true,
        tenant: tenantId,
        variantTypes: product.variantTypeIds,
      },
    } as any)
  }

  return payload.create({
    ...adminOpOptions,
    collection: 'products',
    data: {
      title: product.title,
      barcode: product.barcode,
      categories: categoryIds,
      enableVariants: true,
      inventory: 250,
      media: media.id,
      priceInPKR: product.variants[0]?.priceInPKR || 0,
      priceInPKREnabled: true,
      tenant: tenantId,
      variantTypes: product.variantTypeIds,
    },
  } as any)
}

const recreateVariants = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: string,
  productId: string,
  variants: MenuVariant[],
  productBarcode: string,
) => {
  await payload.delete({
    ...adminOpOptions,
    collection: 'variants',
    where: {
      and: [{ tenant: { equals: tenantId } }, { product: { equals: productId } }],
    },
  } as any)

  for (const variant of variants) {
    await payload.create({
      ...adminOpOptions,
      collection: 'variants',
      data: {
        barcode: `${productBarcode}-${variant.barcodeSuffix}`,
        inventory: variant.inventory,
        options: variant.optionIds,
        priceInPKR: variant.priceInPKR,
        priceInPKREnabled: true,
        product: productId,
        tenant: tenantId,
      },
    } as any)
  }
}

const run = async () => {
  const payload = await getPayload({ config })

  const tenant = await ensureTenant(payload)
  const tenantId = tenant.id

  const categories = ['Burgers', 'Chicken', 'Buckets', 'Sides', 'Drinks']
  const categoryMap: Record<string, string> = {}
  for (const categoryName of categories) {
    const category = await ensureCategory(payload, tenantId, categoryName)
    categoryMap[categoryName] = category.id
  }

  const sizeType = await ensureVariantType(payload, tenantId, 'size', 'Size')
  const spiceType = await ensureVariantType(payload, tenantId, 'spice-level', 'Spice Level')

  const sizeSmall = await ensureVariantOption(payload, tenantId, sizeType.id, 'Small', 'small')
  const sizeRegular = await ensureVariantOption(payload, tenantId, sizeType.id, 'Regular', 'regular')
  const sizeLarge = await ensureVariantOption(payload, tenantId, sizeType.id, 'Large', 'large')
  const spiceMild = await ensureVariantOption(payload, tenantId, spiceType.id, 'Mild', 'mild')
  const spiceHot = await ensureVariantOption(payload, tenantId, spiceType.id, 'Hot', 'hot')

  const menu: MenuProduct[] = [
    {
      title: 'Zinger Burger',
      barcode: 'KFC-ZINGER',
      mediaAlt: 'KFC Zinger Burger',
      categories: ['Burgers'],
      variantTypeIds: [spiceType.id],
      variants: [
        { barcodeSuffix: 'MILD', inventory: 80, optionIds: [spiceMild.id], priceInPKR: 690 },
        { barcodeSuffix: 'HOT', inventory: 80, optionIds: [spiceHot.id], priceInPKR: 690 },
      ],
    },
    {
      title: 'Mighty Zinger',
      barcode: 'KFC-MIGHTY',
      mediaAlt: 'KFC Mighty Zinger',
      categories: ['Burgers'],
      variantTypeIds: [spiceType.id],
      variants: [
        { barcodeSuffix: 'MILD', inventory: 60, optionIds: [spiceMild.id], priceInPKR: 890 },
        { barcodeSuffix: 'HOT', inventory: 60, optionIds: [spiceHot.id], priceInPKR: 890 },
      ],
    },
    {
      title: 'Hot Wings (8 Pcs)',
      barcode: 'KFC-WINGS-8',
      mediaAlt: 'KFC Hot Wings 8 Pieces',
      categories: ['Chicken'],
      variantTypeIds: [spiceType.id],
      variants: [
        { barcodeSuffix: 'MILD', inventory: 50, optionIds: [spiceMild.id], priceInPKR: 720 },
        { barcodeSuffix: 'HOT', inventory: 50, optionIds: [spiceHot.id], priceInPKR: 720 },
      ],
    },
    {
      title: 'Chicken Bucket (6 Pcs)',
      barcode: 'KFC-BUCKET-6',
      mediaAlt: 'KFC Chicken Bucket 6 Pieces',
      categories: ['Buckets'],
      variantTypeIds: [spiceType.id],
      variants: [
        { barcodeSuffix: 'MILD', inventory: 40, optionIds: [spiceMild.id], priceInPKR: 1790 },
        { barcodeSuffix: 'HOT', inventory: 40, optionIds: [spiceHot.id], priceInPKR: 1790 },
      ],
    },
    {
      title: 'Fries',
      barcode: 'KFC-FRIES',
      mediaAlt: 'KFC Fries',
      categories: ['Sides'],
      variantTypeIds: [sizeType.id],
      variants: [
        { barcodeSuffix: 'REG', inventory: 120, optionIds: [sizeRegular.id], priceInPKR: 320 },
        { barcodeSuffix: 'LRG', inventory: 120, optionIds: [sizeLarge.id], priceInPKR: 420 },
      ],
    },
    {
      title: 'Pepsi',
      barcode: 'KFC-PEPSI',
      mediaAlt: 'KFC Pepsi',
      categories: ['Drinks'],
      variantTypeIds: [sizeType.id],
      variants: [
        { barcodeSuffix: 'SML', inventory: 150, optionIds: [sizeSmall.id], priceInPKR: 150 },
        { barcodeSuffix: 'REG', inventory: 150, optionIds: [sizeRegular.id], priceInPKR: 220 },
        { barcodeSuffix: 'LRG', inventory: 150, optionIds: [sizeLarge.id], priceInPKR: 280 },
      ],
    },
  ]

  for (const productInput of menu) {
    const product = await ensureProduct(payload, tenantId, productInput, categoryMap)
    await recreateVariants(payload, tenantId, product.id, productInput.variants, productInput.barcode)
  }

  payload.logger.info(`KFC seed complete. Tenant: ${tenantId}, products: ${menu.length}`)
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('KFC seed failed', error)
    process.exit(1)
  })
