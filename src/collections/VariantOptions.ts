import { createVariantOptionsCollection } from '@payloadcms/plugin-ecommerce'
import type { CollectionConfig } from 'payload'

import { isAuthenticatedAccess } from '../utils/access'
import { assignTenantFromHeader } from '../hooks/assignTenantFromHeader'

const variantOptionsBase = createVariantOptionsCollection({
  access: {
    isAdmin: isAuthenticatedAccess,
    publicAccess: isAuthenticatedAccess,
  },
})

export const VariantOptions: CollectionConfig = {
  ...variantOptionsBase,
  trash: true,
  hooks: {
    ...variantOptionsBase.hooks,
    beforeChange: [...(variantOptionsBase.hooks?.beforeChange || []), assignTenantFromHeader],
  },
}
