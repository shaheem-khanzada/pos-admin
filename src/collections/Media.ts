import type { CollectionConfig } from 'payload'

import { assignTenantFromHeader } from '../hooks/assignTenantFromHeader'

export const Media: CollectionConfig = {
  slug: 'media',
  trash: true,
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [assignTenantFromHeader],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
