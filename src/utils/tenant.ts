import { getTenantFromCookie } from '@payloadcms/plugin-multi-tenant/utilities'
import type { PayloadRequest } from 'payload'
import { extractID } from 'payload/shared'

import type { User } from '@/payload-types'

export const getUserTenantIds = (user: null | User) => {
  if (!user || !Array.isArray(user.tenants)) return []

  return user.tenants
    .map((tenantRow) => extractID(tenantRow.tenant))
    .filter((tenantId): tenantId is string => Boolean(tenantId))
}

export const getTenantAccessConstraint = (tenantIds: string[]) => {
  if (tenantIds.length === 0) return false

  return {
    id: {
      in: tenantIds,
    },
  }
}

export const getSelectedTenantId = (req: PayloadRequest): string | undefined => {
  const fromHeader = req.headers.get('tenant')
  if (fromHeader) return fromHeader

  const fromCookie = getTenantFromCookie(req.headers, 'text')
  if (typeof fromCookie === 'string') return fromCookie
  return undefined
}
