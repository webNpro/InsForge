# InsForge Claude Plugin

Official Claude Code plugin for building with InsForge.

## What's Included

**Skill: `insforge-schema-patterns`**
- Social graph patterns (follows, likes)
- Nested comments (self-referential)
- Multi-tenant patterns
- Best practices for foreign keys, indexes, and RLS

This skill automatically activates when you're designing database schemas with Claude.

## Installation

### From Repository

```bash
# Clone to your Claude plugins directory
cd ~/.claude-plugins
git clone https://github.com/InsForge/InsForge.git
ln -s InsForge/claude-plugin insforge
```

Or install directly from the plugin path:

```bash
claude-code plugins install /path/to/InsForge/claude-plugin
```

## Usage

Once installed, the skill automatically activates when you ask Claude about database design:

```
You: "I need to build a social media app with follows and likes"

Claude: [Automatically loads insforge-schema-patterns skill]
"I'll use the Social Graph pattern from InsForge best practices..."
```

No special commands needed - Claude knows when to use it!

## What's a Skill?

Skills are folders with instructions that Claude automatically loads when relevant. They're like giving Claude domain expertise.

## Contributing

Want to add more skills? Check the [main InsForge repository](https://github.com/InsForge/InsForge).

## License

MIT
