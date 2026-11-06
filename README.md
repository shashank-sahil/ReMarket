# Re Market

A marketplace for IIT Kharagpur students, built with Next.js, React and Supabase.
It includes KGPian/non-KGPian dashboards, store and listing management, image
uploads, and a store verification Edge Function. Backend features require a
configured Supabase project and authentication/verification providers.

## Run locally

Use Node.js 22 (see `.nvmrc`) and npm. Clone this repository, then run these commands
from the directory containing `package.json`:

```sh
npm ci
```

Copy `.env.example` to `.env.local`:

```powershell
# PowerShell
Copy-Item .env.example .env.local
```

```sh
# macOS / Linux
cp .env.example .env.local
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to your
project's public API values, then start the app:

```sh
npm run dev
```

Open http://localhost:3000. Restart the development server after changing environment
variables. Public values are embedded at build time; rebuild after changing them
for deployment. Never put a service-role key or email/SMS secrets in `NEXT_PUBLIC_*`.

## Backend setup

Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md) to create the database and configure
Google/phone authentication. Apply migrations in timestamp order on a new project.
For store creation/deletion, configure and deploy the Edge Function using
[STORE_VERIFICATION_SETUP.md](STORE_VERIFICATION_SETUP.md) **before applying migration
003**, which removes direct store insert/delete access.

Copy `supabase/functions/.env.example` to `supabase/functions/.env` and populate
provider secrets locally. This is separate from the frontend `.env.local`.
Use your own Supabase project reference wherever the setup guides show the original
project reference, and configure your production redirect URL and
`STORE_ACTION_ALLOWED_ORIGINS`.

The example disables demo access. Real store verification needs Resend and Twilio;
restricted demo access is described in the verification guide. Payment checkout
is not implemented. Authentication and marketplace data require backend setup.

## Checks and production preview

```sh
npm run typecheck
npm test
npm run build
npm start
```

`npm test` runs the existing Edge Function tests with simulated database/provider
responses and needs no real credentials. `npm run build` creates a static export
in `out/`. `npm start` and `npm run preview:local` serve that export on localhost:3000;
the preview also reserves ports 3101/3102 for legacy redirects. Deploy the contents
of `out/` to static hosting after building with the correct public configuration.

The optional scripts in `scripts/` and `tests/supabase-ui.spec.ts` are browser
checks. Several assume Windows Chrome and the original Supabase project; adapt
those settings before running them on another machine. They are separate from
`npm test`.

## Contributing and Git

Create a branch, make your changes, run the checks above, and open a pull request.
Commit `package.json` and `package-lock.json` together when changing dependencies;
use `npm ci` for reproducible installs.

The ignore rules exclude secrets, dependencies, generated exports, logs, browser
reports and local snapshots. Commit the `.env.example` templates so collaborators
know which variables to provide. Keep private values in local environment files
or deployment secret settings. Review `git diff --cached` before pushing. If this
folder is inside the original archive workspace, push from this folder: its parent
is a separate Git repository.

See [ASSETS.md](ASSETS.md) for image provenance. `.openai/hosting.json` describes
the existing Sites hosting project; it is not required to run locally.
