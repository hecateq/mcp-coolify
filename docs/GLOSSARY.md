# Translation Glossary — Turkish → English

This glossary is the **source of truth** for translating all project documentation from Turkish to English. All technical writers MUST use these exact English terms.

## Product / Project Names

| Turkish | English |
|---------|---------|
| Coolify MCP Sunucusu | Coolify MCP Server |
| Coolify MCP | Coolify MCP Server |
| proje | project |
| repo, repository | repository |

## Tools / Packages

| Turkish | English |
|---------|---------|
| araç | tool |
| araç kataloğu | tool catalog |
| taşıyıcı (transport) | transport |
| transport modu | transport mode |
| stdio taşıyıcısı | stdio transport |
| HTTP taşıyıcısı | HTTP transport |
| istemci (client) | client |
| sunucu (server) | server |
| dağıtım (deployment) | deployment |
| konuşlandırma (deploy) | deploy |

## Security / Operations

| Turkish | English |
|---------|---------|
| güvenlik modeli | security model |
| çalıştırma modu | operation mode |
| salt okunur | read-only |
| sadece dağıtım | deploy-only |
| güvenli yazma | safe-write |
| izin listesi | allowlist |
| üretim koruması | production safeguards |
| üretim ortamı | production environment |
| en az yetki | least privilege |
| ilke (policy) | policy |
| ilke reddi | policy denial |
| hız sınırı | rate limit |
| hata kodu | error code |
| sızıntı (leak) | leak |
| muhafız, muhafaza katmanı | guardrail |

## Coolify API Concepts

| Turkish | English |
|---------|---------|
| uygulama | application |
| veritabanı | database |
| servis | service |
| proje | project |
| ortam | environment |
| kaynak (resource) | resource |
| konuşlandırma | deployment |
| yedek (backup) | backup |
| etki alanı (domain) | domain |
| olay günlüğü (log) | log |
| sırlar (secrets) | secrets |
| ortam değişkenleri | environment variables |
| zamanlanmış görev | scheduled task |
| REST API | REST API |
| uç nokta (endpoint) | endpoint |

## Dev / Operations / CI

| Turkish | English |
|---------|---------|
| geliştirici | developer |
| geliştirme | development |
| derleme (build) | build |
| test | test |
| kapsama alanı (coverage) | coverage |
| statik analiz (lint) | lint |
| tür denetimi (typecheck) | typecheck |
| kütüphane (library) | library |
| bağımlılık (dependency) | dependency |
| ortak anahtar (SSH key) | SSH key |
| boru hattı (pipeline) | pipeline |
| yayınlama (publish) | publish |
| sürüm (version) | version |
| ana yapı (trunk) | trunk |

## Documentation / UX Terms

| Turkish | English |
|---------|---------|
| dokümantasyon | documentation |
| doküman | document |
| belgeleme | documentation |
| hızlı başlangıç | quick start |
| sorun giderme | troubleshooting |
| ortam değişkenleri | environment variables |
| bölüm (section) | section |
| tablo (table) | table |
| adım (step) | step |
| yönerge (instruction) | instruction |
| önemli | IMPORTANT / important |
| uyarı | WARNING / warning |
| dikkat | CAUTION |
| not | NOTE / note |
| ipucu | tip |

## Phrases

| Turkish | English |
|---------|---------|
| ortam değişkenleri | environment variables |
| yerel geliştirme | local development |
| uzak mod | remote mode |
| yerel mod | local mode |
| istemci yapılandırması | client configuration |
| örnek yapılandırma | example configuration |
| üretime hazırlık | production readiness |

## English Retention

These terms stay in English (no translation):

- MCP (Model Context Protocol)
- JSON, YAML, TOML, ESM, CJS
- npm, npx, ESLint, Prettier, TypeScript, vitest, tsup, tsx
- Fastify, Express, pino, zod, dotenv, uuid
- stdio, HTTP, HTTPS, TCP, SSH
- Coolify (proper noun — never translates)
- GitHub, GitHub Copilot
- Docker, Kubernetes
- CRUD, RBAC, OWASP, API, REST
- JSON-RPC, SDK, CLI, GUI
- UUID, UUIDv4
- deployment, deploy, rollback
- read-only, deploy-only, safe-write (mode names)
- safe-write (kebab case mode identifier)

## Style Conventions

1. **Tone:** Direct, technical, professional. Mirror existing English idioms in the file.
2. **Sentence structure:** Prefer active voice. "Configure the server" not "The server can be configured by".
3. **Code blocks:** Keep ALL code blocks exactly as-is. No translation of code, commands, file paths, config keys, JSON, or YAML.
4. **Markdown:** Preserve ALL markdown structure including anchors, headings, tables, badges, images. Don't drop or add sections.
5. **Anchors:** If TOC anchors contain translated terms (`#-security-model`), preserve exact same English anchor in both TOC and heading (`#-security-model`).
6. **Warning callouts:** Convert `> ⚠️ **ÖNEMLİ**: ...` → `> ⚠️ **IMPORTANT**: ...`. Same for `UYARI` → `WARNING`, `DİKKAT` → `CAUTION`.
7. **Tables:** Translate cell contents but preserve columns, alignment, header row.
8. **Code identifiers:** `COOLIFY_API_TOKEN`, `MCP_TRANSPORT`, `READ_ONLY`, etc. never translate.
9. **Error codes:** Keep `RESOURCE_NOT_FOUND` etc. unchanged.
10. **File paths:** `/path/to/mcp-coolify/dist/index.js` translate "mcp-coolify" only if it's a path to the GitHub repo (GitHub org is hecateq); paths under `node_modules/` use `@imhecateq/mcp-coolify`.

## Mandatory Pre-Flight

Before starting each file, the translator MUST:
1. Re-read the current file in full (no skim)
2. Note every code block, identifier, path, badge — these are untouchable
3. Translate prose in same paragraph order
4. Preserve anchors exactly
5. Verify with `git diff --stat <file>` that code blocks are byte-identical
