# Public safe baseline manifest

- Public baseline date: 2026-10-20
- Source: the local mixed Mini-App project's PPT subsystem
- Intended tag: `public-baseline-2026-10-20`
- Engine reference: see `ENGINE_BASELINE.json`

## Verified baseline

- Engine commit: `b1a96ad0c335316c9bb46e07ba77f62483a57e85`
- Engine tag: `public-baseline-2026-10-20`
- Engine fast checks: 55 passed, 111 deselected
- Engine full portable suite: 166 passed
- Mini-App PPT integration suite: 44 passed
- Golden geometry suite: 12 pages passed
- Mini-App validation and production build on Node 22.22.0: passed
- `pnpm audit` and `pnpm audit --prod`: no known vulnerabilities

## Included

- PPT workspace and viewer pages
- PPT API routes, session control, rate limits and private storage adapter
- Controlled DeckOutline schema, renderer, motion, research and QA modules
- Minimal reusable UI components and cross-platform task runner
- Deterministic application and golden-geometry tests

## Deliberate exclusions

- AI training course pages, promotional images and personal contact content
- Local private keys and account-export CSV files
- Dependencies, Next.js/build output, backups and TypeScript build caches
- WorkBuddy distribution output and the packager coupled to a local temporary
  engine worktree
- Original mixed-directory history
- Private GitHub Issues, pull requests, Actions logs and deployment traces

## Public dependency remediation

- Next.js is pinned to `16.4.2`.
- The lockfile must resolve `sharp >=0.35.5` and `postcss >=8.5.31`.
- The standard TypeScript/React ESLint stack replaces `eslint-config-next`
  because its current dependency chain contains an unpatched `braces`
  advisory. No advisory is ignored or muted.
- `package.json` remains `private: true` only to prevent accidental npm publish.
