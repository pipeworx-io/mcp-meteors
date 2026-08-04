# mcp-meteors

Meteors MCP — NASA fireball, near-Earth asteroid, and close approach data

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `get_fireballs` | Track recent meteor impacts and atmospheric explosions detected by US government sensors. Returns impact energy, radiated energy, velocity, altitude, and geographic location. |
| `get_close_approaches` | Find near-Earth asteroids making close approaches within 0.05 AU. Returns object name, approach date, miss distance, velocity, and diameter to identify potentially hazardous objects. |
| `get_neo_feed` | Get near-Earth objects passing Earth during a date range (e.g., "2024-01-01" to "2024-12-31"). Returns asteroid names, sizes, velocities, miss distances, and hazard status. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "meteors": {
      "url": "https://gateway.pipeworx.io/meteors/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Meteors data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
