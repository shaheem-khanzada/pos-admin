import { amountField, createVariantsCollection } from '@payloadcms/plugin-ecommerce'
import type { CollectionConfig } from 'payload'

import { isAuthenticatedAccess } from '../utils/access'
import { assignTenantFromHeader } from '../hooks/assignTenantFromHeader'
import { currenciesConfig, PKR } from './shared'

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
  trash: true,
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
    {
      name: 'costInPKREnabled',
      type: 'checkbox',
      defaultValue: false,
      label: 'Track Cost (PKR)',
      admin: {
        description: 'Enable to record unit cost for Gross Profit reporting.',
        position: 'sidebar',
      },
    },
    amountField({
      currenciesConfig,
      currency: PKR,
      overrides: {
        name: 'costInPKR',
        label: 'Cost (PKR)',
        min: 0,
        admin: {
          condition: (_, siblingData) => Boolean(siblingData?.costInPKREnabled),
          position: 'sidebar',
        },
      },
    }),
  ],
}
