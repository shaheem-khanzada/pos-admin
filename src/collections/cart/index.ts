import { amountField, createCartsCollection } from '@payloadcms/plugin-ecommerce'
import type { ArrayField, CollectionConfig, Field } from 'payload'

import { isAuthenticatedAccess, superAdminFieldAccess } from '../../utils/access'
import { assignTenantFromHeader } from '../../hooks/assignTenantFromHeader'
import { currenciesConfig, PKR } from '../shared'
import { insertOrderAnalyticAfterCartChange } from './hooks/insertOrderAnalyticAfterCartChange'
import { restoreInventoryAfterCartDelete } from './hooks/restoreInventoryAfterCartDelete'
import { snapshotCartItemPricing } from './hooks/snapshotCartItemPricing'
import { updateInventoryAfterCartChange } from './hooks/updateInventoryAfterCartChange'

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
          amountField({
            currenciesConfig,
            currency: PKR,
            overrides: {
              name: 'unitPriceInPKR',
              label: 'Unit Price (PKR)',
              defaultValue: 0,
              min: 0,
              admin: {
                readOnly: true,
              },
            },
          }),
          amountField({
            currenciesConfig,
            currency: PKR,
            overrides: {
              name: 'unitCostInPKR',
              label: 'Unit Cost (PKR)',
              defaultValue: 0,
              min: 0,
              admin: {
                readOnly: true,
              },
            },
          }),
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
      updateInventoryAfterCartChange,
      insertOrderAnalyticAfterCartChange,
    ],
    afterDelete: [...(cartsBase.hooks?.afterDelete || []), restoreInventoryAfterCartDelete],
  },
  fields: [
    ...extendedFields,
    amountField({
      currenciesConfig,
      currency: PKR,
      overrides: {
        name: 'cogsTotal',
        label: 'COGS Total (PKR)',
        defaultValue: 0,
        min: 0,
        admin: {
          position: 'sidebar',
          readOnly: true,
        },
      },
    }),
    amountField({
      currenciesConfig,
      currency: PKR,
      overrides: {
        name: 'grossProfit',
        label: 'Gross Profit (PKR)',
        defaultValue: 0,
        admin: {
          position: 'sidebar',
          readOnly: true,
        },
      },
    }),
    {
      name: 'customerName',
      type: 'text',
      defaultValue: 'Walk-in Customer',
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
    amountField({
      currenciesConfig,
      currency: PKR,
      overrides: {
        name: 'discount',
        label: 'Discount (PKR)',
        defaultValue: 0,
        min: 0,
        admin: {
          position: 'sidebar',
        },
      },
    }),
    amountField({
      currenciesConfig,
      currency: PKR,
      overrides: {
        name: 'total',
        label: 'Total (PKR)',
        defaultValue: 0,
        min: 0,
        admin: {
          position: 'sidebar',
          readOnly: true,
        },
      },
    }),
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
        { label: 'Card', value: 'card' },
      ],
    },
  ],
}
