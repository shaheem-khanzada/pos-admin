import type { CollectionBeforeChangeHook } from 'payload'

export const assignTenantFromHeader: CollectionBeforeChangeHook = ({ data, req }) => {
  const tenant = req.headers.get('tenant')
  if (!tenant) {
    return data
  }

  data.tenant = tenant

  return data
}
