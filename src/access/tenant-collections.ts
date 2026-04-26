import type { Access } from 'payload'

import { isSuperAdminAccess } from '@/utils/access'
import { getSelectedTenantId, getUserTenantIds } from '@/utils/tenant'

export const canCreateTenantCollection: Access = ({ req }) => {
  if (isSuperAdminAccess({ req })) return true

  const tenantId = getSelectedTenantId(req)
  if (!tenantId) return false

  const userTenantIds = getUserTenantIds(req.user as any)
  return userTenantIds.includes(tenantId)
}

export const canUpdateTenantCollection: Access = ({ req }) => {
  if (isSuperAdminAccess({ req })) return true

  const tenantId = getSelectedTenantId(req)
  if (!tenantId) return false

  const userTenantIds = getUserTenantIds(req.user as any)
  if (!userTenantIds.includes(tenantId)) return false

  return {
    tenant: {
      equals: tenantId,
    },
  }
}

export const canDeleteTenantCollection: Access = ({ req }) => {
  if (isSuperAdminAccess({ req })) return true

  const tenantId = getSelectedTenantId(req)
  if (!tenantId) return false

  const userTenantIds = getUserTenantIds(req.user as any)
  if (!userTenantIds.includes(tenantId)) return false

  return {
    tenant: {
      equals: tenantId,
    },
  }
}

export const canReadTenantCollection: Access = ({ req }) => {
  if (isSuperAdminAccess({ req })) return true

  const tenantId = getSelectedTenantId(req)
  console.log('tenantId??', tenantId)
  console.log('isSuperAdminAccess({ req })', isSuperAdminAccess({ req }))
  console.log('req.user', req.user)
  const userTenantIds = getUserTenantIds(req.user as any)

  if (!tenantId) {
    if (userTenantIds.length === 0) return false
    return {
      tenant: {
        in: userTenantIds,
      },
    }
  }

  if (!userTenantIds.includes(tenantId)) return false

  return {
    tenant: {
      equals: tenantId,
    },
  }
}
