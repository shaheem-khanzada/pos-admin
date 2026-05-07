import { createCartsCollection } from '@payloadcms/plugin-ecommerce'
import type { ArrayField, CollectionConfig, Field } from 'payload'

import { isAuthenticatedAccess, superAdminFieldAccess } from '../../utils/access'
import { assignTenantFromHeader } from '../../hooks/assignTenantFromHeader'
import { currenciesConfig } from '../shared'
import { decrementInventoryAfterCartChange } from './hooks/decrementInventoryAfterCartChange'
import { insertOrderAnalyticAfterCartChange } from './hooks/insertOrderAnalyticAfterCartChange'
import { snapshotCartItemPricing } from './hooks/snapshotCartItemPricing'

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

const extendedFields: Field[] = cartsBase.fields
  .filter((field) => {
    if (!field || typeof field !== 'object') return true
    if (!('name' in field)) return true
    return field.name !== 'customer'
  })
  .map((field): Field => {
    if (
      field &&
      typeof field === 'object' &&
      'name' in field &&
      field.name === 'items' &&
      field.type === 'array'
    ) {
      const itemsField = field as ArrayField
      return {
        ...itemsField,
        fields: [
          ...itemsField.fields,
          {
            name: 'unitPriceInPKR',
            type: 'number',
            label: 'Unit Price (PKR)',
            defaultValue: 0,
            min: 0,
            admin: {
              readOnly: true,
              step: 0.01,
            },
          },
          {
            name: 'unitCostInPKR',
            type: 'number',
            label: 'Unit Cost (PKR)',
            defaultValue: 0,
            min: 0,
            admin: {
              readOnly: true,
              step: 0.01,
            },
          },
        ],
      }
    }
    return field
  })

export const Carts: CollectionConfig = {
  ...cartsBase,
  trash: true,
  hooks: {
    ...cartsBase.hooks,
    beforeChange: [
      ...(cartsBase.hooks?.beforeChange || []),
      assignTenantFromHeader,
      snapshotCartItemPricing,
    ],
    afterChange: [
      ...(cartsBase.hooks?.afterChange || []),
      decrementInventoryAfterCartChange,
      insertOrderAnalyticAfterCartChange,
    ],
  },
  fields: [
    ...extendedFields,
    {
      name: 'cogsTotal',
      type: 'number',
      label: 'COGS Total (PKR)',
      defaultValue: 0,
      min: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        step: 0.01,
      },
    },
    {
      name: 'grossProfit',
      type: 'number',
      label: 'Gross Profit (PKR)',
      defaultValue: 0,
      min: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        step: 0.01,
      },
    },
    {
      name: 'customerName',
      type: 'text',
      defaultValue: 'Guest',
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
      name: 'discount',
      type: 'number',
      label: 'Discount (PKR)',
      defaultValue: 0,
      min: 0,
      admin: {
        position: 'sidebar',
        step: 0.01,
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
