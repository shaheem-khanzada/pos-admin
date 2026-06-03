import type { CollectionConfig } from 'payload'

import { isSuperAdminAccess } from '../utils/access'
import { superAdminFieldAccess } from '../utils/access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    create: isSuperAdminAccess,
    read: isSuperAdminAccess,
    update: isSuperAdminAccess,
  },
  auth: {
    useSessions: true,
    tokenExpiration: 5 * 30 * 24 * 60 * 60, // 5 months (~150 days)
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      saveToJWT: true,
      defaultValue: 'super-admin',
      options: [
        { label: 'Super admin', value: 'super-admin' },
        { label: 'User', value: 'user' },
      ],
      access: {
        update: superAdminFieldAccess,
      },
    },
  ],
}
