import { createVariantsCollection } from '@payloadcms/plugin-ecommerce'
import type { CollectionConfig } from 'payload'

import { isAuthenticatedAccess } from '../utils/access'
import { assignTenantFromHeader } from '../hooks/assignTenantFromHeader'
import { currenciesConfig } from './shared'

const variantsBase = createVariantsCollection({
  access: {
    adminOrPublishedStatus: isAuthenticatedAccess,
    isAdmin: isAuthenticatedAccess,
  },
  currenciesConfig,
  inventory: true,
})

export const Variants: CollectionConfig = {
  ...variantsBase,
  versions: false,
  hooks: {
    ...variantsBase.hooks,
    beforeChange: [...(variantsBase.hooks?.beforeChange || []), assignTenantFromHeader],
  },
  fields: [
    {
      name: 'barcode',
      type: 'text',
      label: 'Barcode',
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    ...variantsBase.fields,
  ],
}
