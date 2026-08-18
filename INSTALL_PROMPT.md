# 🤖 Install Prompt — Copy & Paste into Your AI Assistant

> **Purpose:** A self-contained prompt you can paste into **any** AI assistant (Cursor, Claude Code, Gemini CLI, opencode, GitHub Copilot, Windsurf, Aider, Cody, Continue, JetBrains AI, etc.) to have it install and configure the `@imhecateq/mcp-coolify` MCP server on your machine.
>
> **How to use:**
> 1. Open your AI assistant of choice.
> 2. Start a new chat.
> 3. Paste the block below as your **first message**.
> 4. Have your Coolify URL and API token ready — the assistant will ask.
>
> **Source of truth:** This file lives at <https://github.com/hecateq/mcp-coolify/blob/main/INSTALL_PROMPT.md>. The README has the same block for convenience.

---

## The Prompt (copy everything below this line)

````markdown
Install the @imhecateq/mcp-coolify MCP server on this machine and wire it into the MCP client I am currently using. Use the README at https://github.com/hecateq/mcp-coolify and the package docs at https://www.npmjs.com/package/@imhecateq/mcp-coolify as authoritative.

Steps:
1. Ask me for:
   - COOLIFY_URL (e.g. https://coolify.example.com)
   - COOLIFY_API_TOKEN (a Coolify API token; least-privilege recommended)
   - Whether I want stdio (local) or http (remote) transport
2. Verify the package exists: `npm view @imhecateq/mcp-coolify version`
3. Install globally: `npm install -g @imhecateq/mcp-coolify`
4. Smoke-test the binary: `mcp-coolify --version` (or run `node -e "require.resolve('@imhecateq/mcp-coolify')"`)
5. Configure the MCP client (opencode.json / claude_desktop_config.json / .cursor/mcp.json / ~/.codex/config.toml / gemini extensions.json / etc.) with:
   - command: `node`
   - args: `["/home/<user>/.npm-global/lib/node_modules/@imhecateq/mcp-coolify/dist/index.js"]` (use `npm root -g` to find the actual path)
   - env: COOLIFY_URL, COOLIFY_API_TOKEN, MCP_TRANSPORT=stdio, optionally COOLIFY_OPERATION_MODE=read-only for safety on first run
6. Verify the connection end-to-end by calling the `coolify_health` tool.
7. Show me the diff of the MCP config file you changed and the env vars you set.
8. Do NOT enable `safe-write` or `deploy-only` modes unless I explicitly ask. Default to `read-only`.
9. Do NOT add any new runtime dependencies — the package already ships everything it needs.
10. If install fails or the binary errors, show me the exact stderr and stop before mutating anything.

Constraints:
- Package scope is `@imhecateq/*`. NEVER use `@hecateq/mcp-coolify` (that npm scope does not exist for this account).
- Build output filename is `dist/index.js` (NOT `.mjs`).
- Never bypass `prepublishOnly`, lint, typecheck, or tests.
- If a setting is ambiguous, ask me before writing.
````

---

## Why this works

The prompt is structured so the assistant:

1. **Asks for credentials first** — it cannot proceed without your Coolify URL and a token.
2. **Verifies the package on the public registry** — guards against typos like `@hecateq/mcp-coolify`.
3. **Resolves the install path dynamically** with `npm root -g` — works across macOS, Linux, Windows, nvm, Volta, fnm, etc.
4. **Targets `read-only` mode by default** — safest first run.
5. **Shows you the diff** before finalizing — you stay in control.
6. **Calls the `coolify_health` tool** to confirm end-to-end connectivity.
7. **Has explicit do-not-cross lines** — no silent enable of `safe-write`, no new deps, no build bypasses.

## Variations

### Cursor

Paste the prompt in the **Composer** chat (Cmd+I / Ctrl+I). Cursor can read your file system, install via terminal, and edit `.cursor/mcp.json` directly.

### Claude Code

Paste in the main REPL. Claude Code has Bash + Edit permissions by default; the assistant will ask if any operation needs confirmation.

### Gemini CLI

Run `gemini` and paste the prompt. Gemini CLI can shell out to npm and modify config files.

### opencode

Run `opencode` and paste. opencode reads `opencode.json` from your project root; the assistant will modify it.

### GitHub Copilot (chat / agents)

Paste in the chat panel or assign Copilot to an issue with the prompt body. Copilot can open a PR with the changes.

### Windsurf / Aider / Cody / Continue

All accept the same prompt. They differ in how they apply file edits (PR vs. local edit) but the install steps are identical.

### JetBrains AI Assistant / Junie

Paste into the chat. They have terminal access; the assistant will run the commands and edit your IDE-level MCP config.

---

## License

MIT (c) 2025 hecateq / imhecateq. See `LICENSE`.
