# GitHub Copilot — Project Context

This file is auto-loaded by GitHub Copilot Code Review, Copilot Chat, and Copilot Workspace when working in this repository. It complements `AGENTS.md` (the project-wide AI recovery document).

## TL;DR

- **Package**: `@imhecateq/mcp-coolify` (npm scope MUST match authenticated npm account)
- **Type**: Model Context Protocol (MCP) server wrapping the Coolify self-hosted PaaS API
- **Build**: `tsup` → `dist/index.js` (NOT `.mjs`)
- **Test**: vitest, must stay at 221/221 passing
- **Lint**: ESLint, must pass clean
- **Pre-publish**: `prepublishOnly` runs lint+typecheck+test+build — do NOT skip with `--ignore-scripts`

## Mandatory constraints

1. **Package scope is `@imhecateq/*`**, NEVER `@hecateq/*`. The latter requires membership in the `hecateq` npm organization, which the maintainer does not have. If you see a code change suggesting `@hecateq/mcp-coolify`, reject it.
2. **All prose must be in English.** No Turkish in commit messages, PR titles, PR descriptions, code reviews, or `.md` files (except `docs/GLOSSARY.md` which is a translation reference). Code blocks may contain legacy Turkish comments — leave them alone.
3. **Don't add new runtime dependencies** without explicit user request. The 9-dep budget is `@fastify/cors`, `@fastify/static`, `@modelcontextprotocol/sdk`, `dotenv`, `express`, `fastify`, `pino`, `pino-pretty`, `uuid`, `zod`.
4. **`dist/` is git-ignored and build-generated.** Never edit files inside `dist/`. Edit `src/*.ts` and run `npm run build`.
5. **Build output filename is `dist/index.js`, not `dist/index.mjs`.** Despite ESM format, the file ends in `.js` because the CLI has a shebang. If you suggest an example or doc, use this exact filename.
6. **`bin` field is `mcp-coolify` (unscoped).** `npm install -g` registers the binary as `mcp-coolify`. Local installs reference `node_modules/@imhecateq/mcp-coolify/dist/index.js`.
7. **No bypasses:** no `as any`, no `@ts-ignore`, no `@ts-expect-error`, no empty catch, no deleted failing tests. Fix root causes.

## Domain concepts (must know before suggesting changes)

| Term | Meaning |
|------|---------|
| **Operation mode** | `read-only` (default) / `deploy-only` / `safe-write`. Top-level guard for mutations. |
| **Allowlist** | Comma-separated UUID filter on projects / environments / resources. Empty = no filter. |
| **Scoped token** | Per-operation Coolify token (`COOLIFY_READ_TOKEN`, `COOLIFY_SENSITIVE_TOKEN`, `COOLIFY_WRITE_TOKEN`, `COOLIFY_DEPLOY_TOKEN`). |
| **Production safeguard** | Blocks ALL mutations on environments named in `COOLIFY_PRODUCTION_ENV_NAMES` (default `production,prod`). |
| **Transport** | `stdio` (local) or `http` (remote, requires `MCP_SERVER_API_KEY`). |
| **Tool** | One MCP-exposed function per file in `src/tools/`. ~42 tools wired. |

## Validation sequence (must run before commit)

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm pack --dry-run
```

Expected: typecheck silent, lint silent, 221/221 tests, single 256KB ESM file in `dist/`, tarball with 5 files (LICENSE, README.md, dist/index.d.ts, dist/index.js, package.json).

## Common Copilot mistakes to flag in review

- Suggesting `@hecateq/mcp-coolify` instead of `@imhecateq/mcp-coolify` — REJECT
- Suggesting `dist/index.mjs` paths — REJECT
- Adding runtime dependencies that the existing 9 already cover — REJECT
- Turkish text in new docs/comments (outside code blocks) — REJECT
- Skipping `prepublishOnly` checks — REJECT
- Refactoring unrelated code in a bug-fix or feature PR — REJECT
- Editing files inside `dist/` directly — REJECT

## Project files to consult before reviewing a PR

- `AGENTS.md` — full AI recovery guide with hard rules
- `README.md` — public-facing English README
- `docs/GLOSSARY.md` — Turkish↔English term map
- `docs/COOLIFY-API-CAPABILITY-MATRIX.md` — what Coolify endpoints are exposed
- `docs/VALIDATION-SCHEMA.md` — input validation rules
- `.memory-manifest.json` — durable project state

## Build / test / publish cheat sheet

```bash
npm run dev              # Watch-mode dev (tsx watch)
npm run build            # Compile TS → dist/index.js + dist/index.d.ts
npm run build:all        # Build root + dashboard submodule
npm test                 # Vitest (must be 221/221)
npm run lint             # ESLint on src/ + tests/
npm run typecheck        # tsc --noEmit
npm publish --access public  # Full publish; runs prepublishOnly first
```

## What this project is NOT

- NOT a Coolify clone. This wraps Coolify's REST API; Coolify itself is the upstream.
- NOT a generic MCP framework. This is Coolify-specific.
- NOT a CLI tool in the traditional sense. The CLI binary is the stdio transport entrypoint for AI agents.
- NOT a replacement for Coolify's built-in MCP. It is an alternative with stronger guardrails.

## License

MIT (c) 2025 hecateq / imhecateq. See `LICENSE`.
