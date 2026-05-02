Promote user `3b6be6fe-4c64-4570-8b62-ae5362bc56af` to superadmin by inserting a row into `public.user_roles` with `role = 'superadmin'`.

## Current state

The user already has a `user` role row in `user_roles`. The `app_role` enum already has the `superadmin` value, and `is_superadmin()` checks `user_roles` — so adding the superadmin row immediately unlocks `/admin`.

## Change

Run a single idempotent SQL statement (via migration) on `public.user_roles`:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('3b6be6fe-4c64-4570-8b62-ae5362bc56af', 'superadmin')
ON CONFLICT (user_id, role) DO NOTHING;
```

The existing `user` role is kept (additive), so nothing else breaks.

## Verification

After approval, query `user_roles` to confirm the row exists, then the user can access `/admin` after refreshing.