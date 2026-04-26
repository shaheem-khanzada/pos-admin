import type { CollectionConfig } from 'payload'

import { isSuperAdminAccess } from '../utils/access'

/**
 * Required by `@payloadcms/plugin-multi-tenant` (default slug `tenants`).
 * Each store or branch can be a tenant; POS data is scoped per tenant.
 */
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    group: 'POS',
    useAsTitle: 'name',
  },
  access: {
    create: isSuperAdminAccess,
    delete: isSuperAdminAccess,
    read: isSuperAdminAccess,
    update: isSuperAdminAccess,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Store / branch name',
    },
  ],
  labels: {
    singular: 'Tenant',
    plural: 'Tenants',
  },
}
