# Install Prompt — Copy & Paste into Your AI Assistant

Give this single prompt or raw URL to any AI assistant (Cursor, Claude Code, Gemini CLI, OpenCode, GitHub Copilot, Windsurf, Aider, etc.) to automatically configure the Coolify MCP Server:

```text
Read https://raw.githubusercontent.com/hecateq/mcp-coolify/main/INSTALL_PROMPT.md and set up the Coolify MCP server for my environment.
```

---

## Instructions for AI Assistant

You are tasked with configuring the `@imhecateq/mcp-coolify` Model Context Protocol (MCP) server for the user's active editor or MCP client.

### Step 1: Request Credentials (if not already known)
Ask the user for:
1. `COOLIFY_URL`: Base URL of their Coolify instance (e.g. `https://coolify.example.com`)
2. `COOLIFY_API_TOKEN`: Coolify API Token (read-only token is fine for starting)
3. Operation mode preference (default: `read-only`)

### Step 2: Configure the User's MCP Client
Detect the user's active client and add `@imhecateq/mcp-coolify` using `npx`:

#### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "coolify": {
      "command": "npx",
      "args": ["-y", "@imhecateq/mcp-coolify"],
      "env": {
        "COOLIFY_URL": "<COOLIFY_URL>",
        "COOLIFY_API_TOKEN": "<COOLIFY_API_TOKEN>",
        "COOLIFY_OPERATION_MODE": "read-only"
      }
    }
  }
}
```

#### Claude Desktop (`claude_desktop_config.json`)
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "coolify": {
      "command": "npx",
      "args": ["-y", "@imhecateq/mcp-coolify"],
      "env": {
        "COOLIFY_URL": "<COOLIFY_URL>",
        "COOLIFY_API_TOKEN": "<COOLIFY_API_TOKEN>",
        "COOLIFY_OPERATION_MODE": "read-only"
      }
    }
  }
}
```

#### OpenCode (`opencode.json` or `opencode.local.jsonc`)
```jsonc
{
  "mcp": {
    "coolify": {
      "type": "local",
      "command": ["npx", "-y", "@imhecateq/mcp-coolify"],
      "environment": {
        "COOLIFY_URL": "<COOLIFY_URL>",
        "COOLIFY_API_TOKEN": "<COOLIFY_API_TOKEN>",
        "COOLIFY_OPERATION_MODE": "read-only"
      }
    }
  }
}
```

#### VS Code (Cline / Roo Code MCP Settings)
```json
{
  "mcpServers": {
    "coolify": {
      "command": "npx",
      "args": ["-y", "@imhecateq/mcp-coolify"],
      "env": {
        "COOLIFY_URL": "<COOLIFY_URL>",
        "COOLIFY_API_TOKEN": "<COOLIFY_API_TOKEN>",
        "COOLIFY_OPERATION_MODE": "read-only"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Step 3: Verify Setup
1. Confirm configuration file syntax and formatting.
2. Prompt the user to restart or reload their MCP client.
3. Test connectivity by invoking the `coolify_health` tool.

---

**Raw URL (for sharing with an AI assistant):**  
<https://raw.githubusercontent.com/hecateq/mcp-coolify/main/INSTALL_PROMPT.md>

**GitHub UI URL:**  
<https://github.com/hecateq/mcp-coolify/blob/main/INSTALL_PROMPT.md>

MIT (c) 2026 hecateq / imhecateq
