# Super Admin

The Super Admin is the highest privilege tier. A user with `User.isSuperAdmin = true`
bypasses all module, role, and permission checks.

## Setting the flag (database only)

`isSuperAdmin` is **never** settable from the UI. Set it one of two ways:

1. **Setup script (recommended):**
   ```
   npx tsx scripts/create-super-admin.ts
   ```
   Prompts for an email. Grants Super Admin to an existing user, or creates a new
   user with a random temporary password (printed once — change it immediately).
   Writes a `system.superadmin.create` audit entry.

2. **Direct DB update:**
   ```sql
   UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'person@example.com';
   ```

## Rules

- No more than **2** Super Admin accounts should exist at any time.
- To revoke: `UPDATE "User" SET "isSuperAdmin" = false WHERE email = '...';`
- Super Admin actions are recorded in the audit log under `system.*` actions and are
  not editable by Administrators.
- Administrators cannot grant or remove Super Admin status.

## How enforcement works

`requireCapability()` and `hasPermission()` short-circuit to allow when
`session.isSuperAdmin` is true. The flag travels in the signed session cookie, so it
takes effect on next login after a DB change.
