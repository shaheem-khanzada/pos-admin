import { createVariantTypesCollection } from '@payloadcms/plugin-ecommerce'
import type { CollectionConfig } from 'payload'

import { isAuthenticatedAccess } from '../utils/access'
import { assignTenantFromHeader } from '../hooks/assignTenantFromHeader'

const variantTypesBase = createVariantTypesCollection({
  access: {
    isAdmin: isAuthenticatedAccess,
    publicAccess: isAuthenticatedAccess,
  },
})

export const VariantTypes: CollectionConfig = {
  ...variantTypesBase,
  trash: true,
  hooks: {
    ...variantTypesBase.hooks,
    beforeChange: [...(variantTypesBase.hooks?.beforeChange || []), assignTenantFromHeader],
  },
}
