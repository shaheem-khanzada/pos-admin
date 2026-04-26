import { createProductsCollection } from '@payloadcms/plugin-ecommerce'
import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { isAuthenticatedAccess } from '../../utils/access'
import { assignTenantFromHeader } from '../../hooks/assignTenantFromHeader'
import { currenciesConfig } from '../shared'

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
  hooks: {
    ...productsBase.hooks,
    beforeChange: [...(productsBase.hooks?.beforeChange || []), assignTenantFromHeader],
  },
  admin: {
    ...productsBase.admin,
    group: 'POS',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Name',
      required: true,
    },
    {
      name: 'barcode',
      type: 'text',
      label: 'Barcode',
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
      required: true,
      relationTo: 'media',
      hasMany: false,
      admin: {
        position: 'sidebar',
      },
    },
    ...productsBase.fields,
    slugField(),
  ],
}
