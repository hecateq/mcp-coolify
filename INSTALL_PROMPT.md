# Install Prompt — Copy & Paste into Your AI Assistant

Copy everything below this line into **any** AI assistant (Cursor, Claude Code, Gemini CLI, opencode, Copilot, Windsurf, Aider, etc.) to have it install and configure the Coolify MCP Server.

````markdown
Install the @imhecateq/mcp-coolify MCP server on this machine.

Ask me first for:
- COOLIFY_URL
- COOLIFY_API_TOKEN (read-only token is fine)
- Whether I want stdio or http transport

Then:
1. Run: npm install -g @imhecateq/mcp-coolify
2. Find the install path with: npm root -g
3. Add an MCP entry to whatever client config I'm using (opencode.json, .cursor/mcp.json, claude_desktop_config.json, etc.):
   - command: node
   - args: ["<npm root -g path>/@imhecateq/mcp-coolify/dist/index.js"]
   - env: { COOLIFY_URL, COOLIFY_API_TOKEN, MCP_TRANSPORT: "stdio", COOLIFY_OPERATION_MODE: "read-only" }
4. Restart the MCP client
5. Confirm it works by calling coolify_health

Show me what changed when done.
````

---

**Raw URL (for sharing with an AI assistant):**
<https://raw.githubusercontent.com/hecateq/mcp-coolify/main/INSTALL_PROMPT.md>

**GitHub UI URL:**
<https://github.com/hecateq/mcp-coolify/blob/main/INSTALL_PROMPT.md>

MIT (c) 2025 hecateq / imhecateq
