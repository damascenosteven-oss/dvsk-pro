# Repository instructions

- This repository is the public PPT product application, not the former AI
  training course site.
- Use pnpm only. Preserve Next.js 16, React 19, TypeScript strictness and the
  controlled DeckOutline boundary.
- The HTML engine is a sibling checkout selected by `PPT_ENGINE_ROOT`; do not
  copy engine runtime source into this repository.
- Never commit `.env` files, keys, account exports, customer content or
  generated build output.
- Run `pnpm validate`, `pnpm test:portable`, the cross-repository 43-test suite,
  golden geometry and a production build before a baseline or release change.
- Work from an approved Issue on `issue/<number>-<slug>` and merge only through
  an owner-approved pull request. Never push directly to `main`.
