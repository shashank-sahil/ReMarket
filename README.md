# Re Market

A Next.js App Router landing page for an independent IIT Kharagpur student marketplace.

## Run locally

```powershell
cd "A:\KGP Market Place -\re-market"
npm install
npm run dev
```

Open http://localhost:3000. Edit `app/page.tsx`, `components/marketplace.tsx` and `app/globals.css`. This is now a Next.js application; the original `dist/index.html` prototype is obsolete.

## Checks

- `npm run build` — production build and TypeScript validation, exports to `out/`.
- `npm run typecheck` — TypeScript validation.
- With the development server running: `node scripts/verify.mjs` — desktop/mobile browser and interaction checks. Requires a locally installed Chrome; screenshots go in `artifacts/`.

## What works

Category filters, text search, saved finds, a mobile menu, an accessible sign-in dialog and FAQs, and reduced-motion support. Saved items persist in localStorage when available.

The product cards are illustrative offers. The Buy & sell buttons open a sign-in/sign-up UI preview with KGPian and non-KGPian paths. Google sign-in and phone verification are placeholders; no authentication or messages are sent. Accounts, chat, payments, image uploads and shared listings are outside this landing-page build.

## Design

Apple-inspired silver and white surfaces, restrained blue accents, sage details, expressive typography, a custom generated product still life, pointer-responsive CSS 3D perspective and Motion animations. Fonts and imagery are served locally. See ASSETS.md for image provenance and generation prompt.

Responsive styles are in app/responsive.css. Run node scripts/check-responsive.mjs against the local dev server to check 10 viewport sizes, touch target sizes, the sign-in flow and navigation behaviour.

