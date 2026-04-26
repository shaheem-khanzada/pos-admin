import type { Access, FieldAccess } from 'payload'

import type { User } from '@/payload-types'

type Role = User['role']

export const hasRole = (user: User | null, role: Role) => {
  if (!user) return false
  return user.role === role
}

export const isSuperAdmin = (user: User) => hasRole(user, 'super-admin')

export const isSuperAdminAccess: Access = ({ req: { user } }) => hasRole(user, 'super-admin')

export const isUserAccess: Access = ({ req: { user } }) => hasRole(user, 'user')

export const isAuthenticatedAccess: Access = ({ req }) => {
  return Boolean(req.user)
}

export const superAdminFieldAccess: FieldAccess = ({ req: { user } }) => hasRole(user, 'super-admin')
