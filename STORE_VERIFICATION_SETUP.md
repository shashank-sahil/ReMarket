# Store verification setup

The store creation and deletion flow needs two providers and a trusted Supabase Edge Function. The frontend never receives the provider secrets. **Do not share API keys, auth tokens, verification codes, or service-role keys in chat.**

## Current demo setup

`supabase/functions/.env` is an ignored private file ready for your values. Enter `RESEND_API_KEY`, `STORE_OTP_FROM_EMAIL` (a sender verified by Resend), and `STORE_DEMO_USER_IDS` (your user UUID from Supabase Authentication → Users). A private HMAC secret has already been generated in that file. The example file contains no real secret.

With `STORE_DEMO_MODE=true`, only the user UUIDs in `STORE_DEMO_USER_IDS` can use the test phone PIN `0000` or switch demo plans. In Personal info, enter a phone number and verify it with `0000`. Store actions still require the real email code, plus `0000` for the phone. No SMS is sent in this mode, and the real Auth phone is not marked verified. Demo phone status and plan overrides expire after 24 hours and are stored separately from paid entitlements.

`STORE_DEMO_EMAIL_TO` optionally routes email codes to the developer's Resend inbox for allowlisted demo accounts only. This supports Resend's `onboarding@resend.dev` test sender, which can deliver only to the Resend account email. The UI displays the actual test recipient, and the user's registered email remains unchanged. This is a development override, not proof of control of the registered email. Clear this variable when switching to a verified sending domain for registered-email delivery.

Demo Pro permits five stores; Free permits one. The upgrade modal takes no payment. Switching to Free is blocked while more than one store exists.

Upload the ignored environment file using:

```powershell
npx supabase secrets set --env-file supabase/functions/.env --project-ref vuxwvgnuovghohfpjpxn
```

The function has been deployed, but the database migration must still be applied before this flow can run. Apply it after the environment values are ready. The migration can then be applied with:

```powershell
npx supabase db query --linked --project-ref vuxwvgnuovghohfpjpxn --file supabase/migrations/202610290003_store_action_verification.sql
```

To turn demo access off, set `STORE_DEMO_MODE=false`, clear `STORE_DEMO_USER_IDS`, upload the secrets again, and clear the temporary rows with `delete from public.store_demo_access;` in the SQL Editor. Real SMS verification is then required. Existing demo stores remain in the account.

## 1. Set up email with Resend

1. Create a Resend account and add a sending domain you control. Add the DNS records Resend provides and wait until the domain is verified.
2. Create a Resend API key with permission to send email from that domain. Pick a sender address such as `Re Market <no-reply@your-domain.com>`.
3. In Supabase Dashboard, open **Edge Functions → Secrets**, and add `RESEND_API_KEY` and `STORE_OTP_FROM_EMAIL`. The latter is the sender address from step 2. These are used by the store action function directly through Resend's API.

For Supabase Auth emails such as email sign-in, invitations, and password reset, also configure **Authentication → SMTP Settings** with Resend's SMTP details, or use the Supabase–Resend integration. This SMTP configuration is separate from the store action's Resend API key. Supabase's default mail service is restricted to project team addresses and is not intended for production.

## 2. Set up phone verification with Twilio

1. Create a Twilio account and a Twilio Verify service that can send SMS to your users. Trial accounts can send only to numbers verified in Twilio. Check Twilio's India SMS requirements and messaging charges before enabling production traffic.
2. In **Authentication → Sign In / Providers → Phone** in Supabase, enable Phone and configure the supported Twilio provider. This is required for a user to verify their account phone under **Me → Personal info**.
3. In **Edge Functions → Secrets**, add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` for the store action function. `TWILIO_VERIFY_SERVICE_SID` is the Verify service identifier beginning with `VA`.

## 3. Add the verification secret

In **Edge Functions → Secrets**, add `STORE_OTP_HMAC_SECRET`: a random secret of at least 32 characters. Generate a unique value locally, for example:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the generated value into the Supabase secret field. Do not add it to source files. Supabase automatically provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions; do not put the service-role key in the browser.

`STORE_ACTION_ALLOWED_ORIGINS` is optional. Its default allows `http://localhost:3000` and the existing private Re Market site. If you later use a different production domain, set this secret to a comma-separated list of the exact origins you intend to allow.

## 4. Deploy and activate

From a terminal in `re-market`, sign in to the Supabase CLI and deploy the function. Keep JWT verification enabled; do not use `--no-verify-jwt`.

```powershell
npx supabase login
npx supabase functions deploy store-action --project-ref vuxwvgnuovghohfpjpxn --use-api
```

After the function and provider secrets (or the restricted demo setup above) are configured, open the Supabase SQL Editor and run `supabase/migrations/202610290003_store_action_verification.sql` once. It removes direct store insert/delete privileges and grants the operation only to the trusted function. Do not run this migration before the function and providers or demo configuration are ready: store creation will stop working until they are configured. After applying it, update the frontend to this version.

The challenge binds the requested action and store details to the signed-in account. Codes expire after 10 minutes, attempts are limited, and successful challenges are single use. A user's email and phone must already be verified with Supabase before requesting codes. Deleting a store also deletes its listings. Uploaded image files are not removed automatically when a store is deleted.

## 5. Test with real accounts

Verify the account phone under **Me → Personal info**, then create a store. Check that neither an incorrect email code nor an incorrect phone code creates it. Verify both codes and confirm the store appears. Repeat with deletion, confirming its listing count first. Also verify from a second account that it cannot delete a store belonging to another user, and that an authenticated direct insert/delete request is denied. Tests against the real providers and database are necessary after setup; local tests use simulated provider and database responses.
