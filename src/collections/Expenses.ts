import { amountField } from '@payloadcms/plugin-ecommerce'
import type { CollectionConfig } from 'payload'

import { assignTenantFromHeader } from '../hooks/assignTenantFromHeader'
import { currenciesConfig, PKR } from './shared'

export const Expenses: CollectionConfig = {
  slug: 'expenses',
  trash: true,
  admin: {
    useAsTitle: 'title',
    group: 'POS',
    defaultColumns: ['title', 'amountInPKR', 'category', 'expenseAt', 'paymentMethod'],
  },
  hooks: {
    beforeChange: [assignTenantFromHeader],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Description',
    },
    amountField({
      currenciesConfig,
      currency: PKR,
      overrides: {
        name: 'amountInPKR',
        label: 'Amount (PKR)',
        required: true,
        min: 0,
      },
    }),
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'misc',
      options: [
        { label: 'Rent', value: 'rent' },
        { label: 'Utilities', value: 'utilities' },
        { label: 'Supplies', value: 'supplies' },
        { label: 'Salaries', value: 'salaries' },
        { label: 'Marketing', value: 'marketing' },
        { label: 'Maintenance', value: 'maintenance' },
        { label: 'Miscellaneous', value: 'misc' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'expenseAt',
      type: 'date',
      required: true,
      label: 'Date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      defaultValue: 'cash',
      options: [
        { label: 'Cash', value: 'cash' },
        { label: 'Online', value: 'online' },
        { label: 'Card', value: 'card' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
  labels: {
    singular: 'Expense',
    plural: 'Expenses',
  },
}
