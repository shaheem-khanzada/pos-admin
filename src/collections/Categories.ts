import type { CollectionConfig } from 'payload'

import { assignTenantFromHeader } from '../hooks/assignTenantFromHeader'

export const Categories: CollectionConfig = {
  slug: 'categories',
  trash: true,
  admin: {
    useAsTitle: 'title',
    group: 'Content',
  },
  hooks: {
    beforeChange: [assignTenantFromHeader],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    }
  ],
}
