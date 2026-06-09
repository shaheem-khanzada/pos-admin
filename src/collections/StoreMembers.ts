import type { CollectionConfig, Field } from 'payload'

const permissionField = (name: string, label: string): Field => ({
  name,
  type: 'checkbox',
  defaultValue: false,
  label,
})

export const StoreMembers: CollectionConfig = {
  slug: 'store-members',
  admin: {
    defaultColumns: ['displayName', 'user', 'tenant', 'status', 'isOwner'],
    group: 'POS',
    useAsTitle: 'displayName',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'displayName',
      type: 'text',
      label: 'Display name',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      required: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isOwner',
      type: 'checkbox',
      defaultValue: false,
      label: 'Store owner',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'permissions',
      type: 'group',
      fields: [
        {
          name: 'products',
          type: 'group',
          fields: [
            permissionField('read', 'Read'),
            permissionField('create', 'Create'),
            permissionField('update', 'Update'),
            permissionField('delete', 'Delete'),
          ],
        },
        {
          name: 'orders',
          type: 'group',
          fields: [
            permissionField('read', 'Read'),
            permissionField('create', 'Create'),
            permissionField('update', 'Update'),
            permissionField('delete', 'Delete'),
            permissionField('discount', 'Apply discount'),
            permissionField('refund', 'Refund'),
          ],
        },
        {
          name: 'expenses',
          type: 'group',
          fields: [
            permissionField('read', 'Read'),
            permissionField('create', 'Create'),
            permissionField('update', 'Update'),
            permissionField('delete', 'Delete'),
          ],
        },
        {
          name: 'reports',
          type: 'group',
          fields: [permissionField('read', 'Read')],
        },
        {
          name: 'inventory',
          type: 'group',
          fields: [
            permissionField('read', 'Read'),
            permissionField('adjust', 'Adjust'),
          ],
        },
        {
          name: 'employees',
          type: 'group',
          fields: [
            permissionField('read', 'Read'),
            permissionField('updatePermissions', 'Update permissions'),
            permissionField('suspend', 'Suspend or activate'),
          ],
        },
        {
          name: 'settings',
          type: 'group',
          fields: [
            permissionField('read', 'Read'),
            permissionField('update', 'Update'),
          ],
        },
      ],
    },
  ],
  labels: {
    plural: 'Store Members',
    singular: 'Store Member',
  },
}
