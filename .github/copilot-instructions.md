# Copilot Instructions for Kaz-Blog

## Project Overview

- This repo is a writing-first personal blog built with Next.js App Router, React 19, TypeScript, and Tailwind CSS.
- Content should prefer Notion as the primary source and fall back to local Markdown in `posts/` for development or demos.
- Admin actions are handled by EdgeOne Cloud Functions under `cloud-functions/cfapi/` rather than by colocated Next.js API routes.

## Read Before Changing Things

- Start with `README.md` for environment variables, runtime expectations, and deployment notes.
- Check `package.json` before suggesting commands; there is no test suite defined right now.
- Review `app/site-config.ts` before changing site copy, navigation, comments, footer content, or other site-wide settings.
- Review `lib/posts.ts` before changing how posts are loaded.
- Review `lib/admin-api.ts` before changing admin fetch calls.

## Common Commands

- `npm run dev`: normal local development.
- `npm run clean`: clear `.next/` when stale hashed assets cause local 404s.
- `npm run dev:stable`: preferred on Windows PowerShell if `npm run dev` exits or becomes unstable.
- `npm run lint`: primary validation command for code changes.
- `npm run build`: run when touching routing, metadata, rendering, styles, content loading, or environment-dependent behavior.
- `npm run notion:check`: only for Notion integration work when the required environment variables are configured.

## Architecture Boundaries

- `app/`: App Router pages, layouts, metadata routes, and site-level config.
- `components/`: reusable UI and post rendering pieces.
- `lib/`: content pipeline, Notion integration, Markdown conversion, date formatting, tag helpers, and admin URL helpers.
- `cloud-functions/cfapi/`: EdgeOne admin/session/post APIs.
- `content/` and `posts/`: local Markdown content used for fallback content and static pages.

## Project Conventions

- Keep the existing product direction: reading-first, quiet UI, minimal admin surface, and deliberate information hierarchy.
- Prefer changing structure and content hierarchy before adding decorative UI complexity.
- Keep content-source selection inside `lib/posts.ts`; page components should not directly decide between Notion and filesystem sources.
- Use `adminApiUrl()` and `adminCredentials()` from `lib/admin-api.ts` instead of hardcoding `/cfapi` or fetch credential behavior.
- Treat `posts/` as fallback content, not the primary production source.

## Known Pitfalls

- Do not reintroduce build-time logic that disables Notion just because one network call fails. If Notion config exists, try Notion first and fall back gracefully.
- Serverless packaging may omit `posts/`; filesystem reads must handle missing directories without crashing the app.
- If local CSS or JS files under `/_next/static/` 404 after a restart, suspect stale browser assets or a rebuilt `.next/` directory before changing code.
- EdgeOne `545` responses usually mean the cloud function crashed. Investigate the deployed `cloud-functions/cfapi/` code and runtime logs instead of assuming a frontend bug.

## Validation Guidance

- Run `npm run lint` after most TS/JS/React changes.
- Run `npm run build` for changes that can affect static generation, route metadata, post loading, or production-only behavior.
- If you change Notion loading or fallback behavior, verify both configured and unconfigured env scenarios when practical.
- If you change admin auth or post management flows, inspect both the frontend caller and the corresponding handler in `cloud-functions/cfapi/`.

## Useful File Map

- `app/site-config.ts`: site metadata, navigation, comments, write/login labels, footer data.
- `app/layout.tsx`: root layout and global providers.
- `lib/posts.ts`: primary post loading decision point.
- `lib/posts-local.ts`: local Markdown fallback loader.
- `lib/posts-notion.ts` and `lib/notion.ts`: Notion-backed loading.
- `lib/admin-api.ts`: frontend admin endpoint base/credentials handling.
- `cloud-functions/cfapi/admin/` and `cloud-functions/cfapi/api/admin/`: EdgeOne admin logic and public handler exports.

## Documentation Links

- Use `README.md` as the source of truth for environment variables, startup commands, admin API endpoints, and deployment troubleshooting.
- Use `CONTRIBUTING.md` for contribution flow and PR expectations.