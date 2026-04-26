import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { en } from '@payloadcms/plugin-ecommerce/translations/languages/en'

import {
  canCreateTenantCollection,
  canDeleteTenantCollection,
  canReadTenantCollection,
  canUpdateTenantCollection,
} from './access/tenant-collections'
import { Carts } from './collections/cart'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { Products } from './collections/product'
import { VariantOptions } from './collections/VariantOptions'
import { Variants } from './collections/Variants'
import { VariantTypes } from './collections/VariantTypes'
import { isSuperAdmin } from './utils/access'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const tenantCollectionAccessOverride = ({ accessKey, accessResult, req }: any) => {
  if (accessKey === 'create') return canCreateTenantCollection({ req })
  if (accessKey === 'read') return canReadTenantCollection({ req })
  if (accessKey === 'update') return canUpdateTenantCollection({ req })
  if (accessKey === 'delete') return canDeleteTenantCollection({ req })
  return accessResult
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  cors: ['http://localhost:8081', 'http://localhost:3000'],
  csrf: ['http://localhost:8081', 'http://localhost:3000'],
  collections: [Users, Media, Categories, Tenants, VariantTypes, VariantOptions, Products, Variants, Carts],
  i18n: {
    fallbackLanguage: 'en',
    translations: {
      en: en.translations,
    },
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || '',
  }),
  sharp,
  plugins: [
    multiTenantPlugin({
      collections: {
        products: { accessResultOverride: tenantCollectionAccessOverride },
        variants: { accessResultOverride: tenantCollectionAccessOverride },
        carts: { accessResultOverride: tenantCollectionAccessOverride },
        media: {},
        categories: { accessResultOverride: tenantCollectionAccessOverride },
        variantTypes: { accessResultOverride: tenantCollectionAccessOverride },
        variantOptions: { accessResultOverride: tenantCollectionAccessOverride },
      },
      userHasAccessToAllTenants: (user) => isSuperAdmin(user),
    }),
  ],
})
