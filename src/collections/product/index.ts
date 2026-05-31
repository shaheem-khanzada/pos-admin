import { amountField, createProductsCollection } from '@payloadcms/plugin-ecommerce'
import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { isAuthenticatedAccess } from '../../utils/access'
import { assignTenantFromHeader } from '../../hooks/assignTenantFromHeader'
import { currenciesConfig, PKR } from '../shared'

const productsBase = createProductsCollection({
  access: {
    adminOrPublishedStatus: isAuthenticatedAccess,
    isAdmin: isAuthenticatedAccess,
  },
  currenciesConfig,
  enableVariants: true,
  inventory: true,
})

export const Products: CollectionConfig = {
  ...productsBase,
  /** Plugin defaults to drafts/autosave; POS does not need versioning. */
  versions: false,
  trash: true,
  hooks: {
    ...productsBase.hooks,
    beforeChange: [...(productsBase.hooks?.beforeChange || []), assignTenantFromHeader],
  },
  admin: {
    ...productsBase.admin,
    defaultColumns: ['title', 'barcode', 'createdAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Name',
      index: true,
      required: true,
    },
    {
      name: 'barcode',
      type: 'text',
      label: 'Barcode',
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
    },
    {
      name: 'categories',
      type: 'relationship',
      required: true,
      admin: {
        position: 'sidebar',
        sortOptions: 'title',
      },
      hasMany: true,
      relationTo: 'categories',
    },
    {
      name: 'media',
      type: 'relationship',
      relationTo: 'media',
      hasMany: false,
      admin: {
        position: 'sidebar',
      },
    },
    ...productsBase.fields,
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
    slugField(),
  ],
}
