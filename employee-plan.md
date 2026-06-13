# EasyPos Employee Login & Permission Kit Plan

## Goal

Add employee login and store-level permission management without building full HR features yet.

Current scope:

* Admin creates users.
* Admin assigns users to stores.
* Store owner can view employees of their own store.
* Store owner can update employee permissions from the mobile app.
* Employees log in using the existing `users` collection.
* Permissions are stored in a separate `storeMembers` collection.

Not included right now:

* Attendance
* Salary
* Leaves
* Payroll
* GPS check-in
* Employee creation from mobile app

---

## Final Architecture

### `users`

Used for authentication only.

Purpose:

* Login
* Password
* Email
* Basic profile
* Payload multi-tenant plugin tenant access

The `users` collection can keep the plugin-managed `tenants[]` array. This array is only for basic tenant access/plugin compatibility.

### `storeMembers`

Used for real store-level access.

Purpose:

* Link user to store
* Define owner/staff status
* Store permission kit
* Control what employee can see/do inside one store

Final idea:

```txt
users
  = who is this person?

users.tenants[]
  = which stores can this user access?

storeMembers
  = what can this user do inside this store?
```

Your generated Payload types already show that `users` has auth fields and a `tenants` array, while tenant collections like products, carts, and expenses have tenant-based fields.

---

## Collections Needed Now

### 1. `Users`

Keep existing `users` collection.

Recommended fields:

```ts
role: 'super-admin' | 'user'
fullName?: string
phone?: string
tenants[]
email
password
```

Do not put the permission kit inside `users`.

---

### 2. `StoreMembers`

Create new collection:

```txt
store-members
```

Fields:

```ts
tenant
user
status
isOwner
permissions
displayName
```

Recommended statuses:

```txt
active
suspended
```

Recommended permissions:

```txt
products
orders
expenses
reports
inventory
employees
settings
```

---

## Permission Kit

Recommended permission object:

```ts
permissions: {
  products: {
    read: boolean
    create: boolean
    update: boolean
    delete: boolean
  }

  orders: {
    read: boolean
    create: boolean
    update: boolean
    delete: boolean
    discount: boolean
    refund: boolean
  }

  expenses: {
    read: boolean
    create: boolean
    update: boolean
    delete: boolean
  }

  reports: {
    read: boolean
  }

  inventory: {
    read: boolean
    adjust: boolean
  }

  employees: {
    read: boolean
    updatePermissions: boolean
    suspend: boolean
  }

  settings: {
    read: boolean
    update: boolean
  }
}
```

Important meaning:

```txt
employees permission does not mean separate employees collection.
It means permission to manage staff access inside the store.
```

---

## Owner Rules

For now, store owner can:

* View employees of their own store.
* Update permission kit of employees.
* Suspend or activate employees if allowed.

Store owner cannot:

* Create new users.
* Delete users.
* Change `tenant`.
* Change `user`.
* Change `isOwner`.
* Edit another owner.
* Manage employees from another store.

Admin can:

* Create users.
* Add user to `users.tenants[]`.
* Create `storeMembers` records.
* Mark someone as owner.
* Fully manage all store members.

---

## Mobile Flow

After login:

```txt
1. User logs in using users collection.
2. Mobile fetches storeMembers for logged-in user.
3. User selects active store.
4. Mobile finds active storeMember for that store.
5. App uses activeStoreMember.permissions to show/hide UI.
```

Example fetch:

```ts
GET /api/store-members?where[user][equals]=USER_ID&depth=1
```

Mobile state:

```ts
{
  user,
  storeMembers,
  activeTenantId,
  activeStoreMember
}
```

Permission helper:

```ts
function can(resource, action) {
  if (!activeStoreMember) return false
  if (activeStoreMember.status !== 'active') return false
  if (activeStoreMember.isOwner) return true

  return Boolean(activeStoreMember.permissions?.[resource]?.[action])
}
```

---

## Backend Access Rule

Mobile permissions are only for UI:

```txt
hide tabs
hide buttons
disable actions
```

Backend must still check permissions from `storeMembers`.

For now, the safest update flow for owner permission management is:

```txt
PATCH /api/store-members/:id/permissions
```

This endpoint should only allow updating:

```txt
permissions
status
```

It should block:

```txt
tenant
user
isOwner
createdAt
updatedAt
```

---

## Payload Config Changes

Add collection:

```ts
import { StoreMembers } from './collections/StoreMembers'
```

Add to collections:

```ts
collections: [
  Users,
  Media,
  Categories,
  Tenants,
  StoreMembers,
  VariantTypes,
  VariantOptions,
  Products,
  Variants,
  Carts,
  Expenses,
]
```

Add to multi-tenant plugin:

```ts
multiTenantPlugin({
  collections: {
    products: { accessResultOverride: tenantCollectionAccessOverride },
    variants: { accessResultOverride: tenantCollectionAccessOverride },
    carts: { accessResultOverride: tenantCollectionAccessOverride },
    expenses: { accessResultOverride: tenantCollectionAccessOverride },
    media: {},
    categories: { accessResultOverride: tenantCollectionAccessOverride },
    variantTypes: { accessResultOverride: tenantCollectionAccessOverride },
    variantOptions: { accessResultOverride: tenantCollectionAccessOverride },
    'store-members': {},
  },
  userHasAccessToAllTenants: (user) => isSuperAdmin(user),
  useUsersTenantFilter: false,
})
```

---

## Current Implementation Order

### Step 1

Create `StoreMembers` collection.

### Step 2

Add permission kit fields.

### Step 3

Add `StoreMembers` to Payload config.

### Step 4

Generate Payload types.

```bash
pnpm payload generate:types
```

### Step 5

Admin manually creates:

```txt
user
users.tenants[]
storeMember
```

### Step 6

Mobile fetches store members after login.

### Step 7

Add mobile employee screen:

```txt
Employees
  - list store employees
  - open employee
  - update permissions
  - save
```

### Step 8

Add backend-safe permission update endpoint.

---

## Future-Proofing

Later, HR can be added without rebuilding current auth/permissions.

Future collections:

```txt
employeeProfiles
attendanceLogs
salaryPeriods
leaveRequests
```

They will link to:

```txt
storeMembers
```

Not directly replace users or permissions.

Future structure:

```txt
users
  login

storeMembers
  access + permissions

employeeProfiles
  salary + HR profile

attendanceLogs
  attendance

salaryPeriods
  payroll
```

This keeps current work simple but avoids future migration pain.

---

## Final Decision

Use this architecture:

```txt
users.tenants[]
  = Payload plugin tenant access

storeMembers
  = real permission kit and store employee access
```

This is the correct current foundation for EasyPos.
