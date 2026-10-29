# Supabase setup

The frontend is connected to the project in `.env.local`. The publishable key is safe to use in the browser; never add a service-role key to the frontend.

## 1. Create the database

In the Supabase project, open **SQL Editor → New query** and run the entire file:

`supabase/migrations/202610290001_marketplace.sql`

Run this migration once. It uses a transaction, so a failed run rolls back. If tables with these names already exist, stop and reconcile the schema before running it. It creates profiles, entitlements, stores, listings, the marketplace image bucket, and ownership policies. Existing Auth users are backfilled.

Account type comes from the verified Auth email: `@iitkgp.ac.in` becomes `kgpians`; everyone else becomes `nonkgpians`. The button selected on the landing page does not grant permissions. Only KGPians can create stores. Non-KGPians can browse stores and listings and manage their profiles.

## 2. Configure Google

Enable **Authentication → Sign In / Providers → Google** with your Google OAuth client ID and secret. In Google Cloud, add the Supabase callback:

`https://vuxwvgnuovghohfpjpxn.supabase.co/auth/v1/callback`

Add these allowed redirect URLs under Supabase **Authentication → URL Configuration**:

- `http://localhost:3000/auth/callback`
- `http://localhost:3101/auth/callback`
- `http://localhost:3102/auth/callback`
- `https://re-market-kgp.saud182184.chatgpt.site/auth/callback`

Set the Site URL to the production origin. Local sign-in stays on the originating port. The current local preview root serves the landing page; dashboards are at `/kgpians` and `/nonkgpians`.

## 3. Configure SMS

Enable the Phone provider and configure a supported SMS provider. Phone sign-in uses SMS OTP; updating the account phone uses `phone_change` verification. Listings require a verified phone. Google and SMS were disabled when this integration was checked on 29 October 2026.

## 4. Start the app

`npm run build` then `npm run preview:local`, or `npm run dev` on port 3000. Keep both public Supabase environment variables available when building. They are baked into the exported browser JavaScript.

The site is a static Next.js export. Browser auth maintains and refreshes the session; database RLS enforces authorization. `utils/supabase/server.ts` and `middleware.ts` are provided for a future server deployment. Next.js proxy middleware cannot execute on static hosting and is intentionally not registered here. If moving to a Next.js server, remove `output: 'export'` and call `updateSession` from `proxy.ts`.

## Paid stores

Every account starts with one store. The app reads the server-controlled `entitlements.store_limit` (maximum five). The previous paid-tier toggle is removed. Payment checkout requires a payment provider and verified webhook; it is not implemented. Only an administrator or trusted payment webhook should update entitlements after confirming payment. Browser users cannot change their own plan.

## Verification before launch

Sign in with a verified KGP Google account and a non-KGP Google/phone account. Confirm correct routing and sign-out. Verify a phone, create a store, upload a banner, add/edit/remove an item, and check search from a second account. Check that the second account cannot modify the first account's profile, stores, listings, uploads, or entitlements. Attempt a second free store to confirm the database limit. These authenticated checks require the migration and providers to be configured.

Old browser-only drafts are not automatically imported, since their ownership was never verified. New data is read from Supabase and appears only after a successful database write.
