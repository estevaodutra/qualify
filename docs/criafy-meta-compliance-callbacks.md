# Criafy — Meta compliance callbacks

Branch: `feat/criafy-meta-compliance-callbacks`.

## URLs after successful Supabase deployment

- Deauthorization callback: `https://qualify-supabase.d2x.site/functions/v1/criafy-deauthorize`
- Data deletion request callback: `https://qualify-supabase.d2x.site/functions/v1/criafy-data-deletion`

These routes are source-code definitions only until deployed and verified. Meta POST requests use form field `signed_request` with an HMAC-SHA256 signature. Do **not** use the webhook verification token for this purpose.

## Deployment prerequisites

1. Configure `INSTAGRAM_APP_SECRET` in the Supabase Edge Functions environment using the **Instagram app secret** from Meta Developers. Do not commit the secret.
2. Apply `20261014235900_criafy_meta_deletion_requests.sql` migration.
3. Deploy `criafy-deauthorize` and `criafy-data-deletion` with JWT verification disabled (configured in `supabase/config.toml`).
4. Confirm HTTPS POST signed-request tests with valid and invalid signatures. Confirm GET status URL after a valid deletion.
5. Confirm that the users' Instagram IDs in `criafy_instagram_accounts.instagram_user_id` or `instagram_account_id` match the user ID delivered in Meta signed requests.
6. Only then save the endpoints in Meta business login settings.

## Scope of deletion

Deleting a matched Instagram account cascades to its account briefings, account-content links, queue rules, scheduled/published publication metadata and publication attempts through existing foreign keys. Shared company-owned media objects and any other independently held CRM data are **not** deleted, and require a separate retention/legal review. Do not claim complete data erasure until that review has been completed.

## Open issues before production launch

- Audit actual account-ID mapping with Instagram Login.
- Ensure no publication jobs are running concurrently during deletion.
- The existing `criafy-meta-webhook` POST handler still needs `X-Hub-Signature-256` validation.
- Complete the new Instagram Login OAuth integration and securely store tokens server-side.
- Add automated integration tests for valid/invalid signed requests and deletion.
