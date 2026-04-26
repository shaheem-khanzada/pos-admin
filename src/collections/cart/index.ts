import { createCartsCollection } from '@payloadcms/plugin-ecommerce'
import type { CollectionConfig } from 'payload'

import { isAuthenticatedAccess } from '../../utils/access'
import { assignTenantFromHeader } from '../../hooks/assignTenantFromHeader'
import { currenciesConfig } from '../shared'
import { decrementInventoryAfterCartChange } from './hooks/decrementInventoryAfterCartChange'

const cartsBase = createCartsCollection({
  access: {
    isAdmin: isAuthenticatedAccess,
    isAuthenticated: isAuthenticatedAccess,
    // No `customer` relationship on POS carts — access is controlled by auth checks above.
    isDocumentOwner: () => false,
  },
  allowGuestCarts: false,
  currenciesConfig,
  customersSlug: 'users',
  enableVariants: true,
})

export const Carts: CollectionConfig = {
  ...cartsBase,
  hooks: {
    ...cartsBase.hooks,
    beforeChange: [...(cartsBase.hooks?.beforeChange || []), assignTenantFromHeader],
    afterChange: [...(cartsBase.hooks?.afterChange || []), decrementInventoryAfterCartChange],
  },
  fields: [
    ...cartsBase.fields.filter((field) => {
      if (!field || typeof field !== 'object') return true
      if (!('name' in field)) return true
      return field.name !== 'customer'
    }),
    {
      name: 'customerName',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'customerPhone',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      defaultValue: 'cash',
      admin: {
        position: 'sidebar',
      },
      options: [
        { label: 'Cash', value: 'cash' },
        { label: 'Online', value: 'online' },
      ],
    },
  ],
}
