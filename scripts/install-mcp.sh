#!/bin/bash

# Insforge MCP Setup Script
# Usage: ./install-mcp.sh <assistant> <api-key> [api-url]

set -e

# Detect OS
OS="unknown"
NPX_CMD="npx"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="windows"
    NPX_CMD="npx.cmd"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Usage: $0 <assistant> <api-key> [api-url]${NC}"
    echo -e "  assistant: cursor, windsurf, or claude"
    echo -e "  api-key: Your Insforge API key"
    echo -e "  api-url: API base URL (optional, defaults to http://localhost:7130)"
    exit 1
fi

ASSISTANT=$1
API_KEY=$2
API_URL=${3:-"http://localhost:7130"}

# Validate assistant type
if [[ ! "$ASSISTANT" =~ ^(cursor|windsurf|claude)$ ]]; then
    echo -e "${RED}❌ Invalid assistant type. Must be one of: cursor, windsurf, or claude${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Setting up Insforge MCP for $ASSISTANT...${NC}"
echo -e "${BLUE}📍 Detected OS: $OS (npx command: $NPX_CMD)${NC}\n"

# Windows warning
if [ "$OS" == "windows" ]; then
    echo -e "${BLUE}ℹ️  Windows detected. Make sure you're running this in Git Bash, WSL, or Cygwin.${NC}\n"
fi

# Install MCP package
echo -e "${BLUE}📦 Installing @insforge/insforge-mcp...${NC}"
if command -v yarn &> /dev/null; then
    yarn add @insforge/insforge-mcp
elif command -v npm &> /dev/null; then
    npm install @insforge/insforge-mcp
else
    echo -e "${RED}❌ Neither npm nor yarn found. Please install Node.js first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ MCP server installed successfully${NC}\n"

# Setup configuration based on assistant type
case $ASSISTANT in
    cursor)
        CONFIG_DIR="$HOME/.cursor"
        CONFIG_FILE="$CONFIG_DIR/mcp.json"
        mkdir -p "$CONFIG_DIR"
        
        # Create or update config
        if [ -f "$CONFIG_FILE" ]; then
            # Backup existing config
            cp "$CONFIG_FILE" "$CONFIG_FILE.bak"
        fi
        
        cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "insforge": {
      "command": "$NPX_CMD",
      "args": ["-y", "@insforge/insforge-mcp"],
      "env": {
        "API_KEY": "$API_KEY",
        "API_BASE_URL": "$API_URL"
      }
    }
  }
}
EOF
        echo -e "${GREEN}✅ Cursor configured at: $CONFIG_FILE${NC}"
        ;;
        
    windsurf)
        CONFIG_DIR="$HOME/.codeium/windsurf"
        CONFIG_FILE="$CONFIG_DIR/mcp_config.json"
        mkdir -p "$CONFIG_DIR"
        
        # Create or update config
        if [ -f "$CONFIG_FILE" ]; then
            # Backup existing config
            cp "$CONFIG_FILE" "$CONFIG_FILE.bak"
        fi
        
        cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "insforge": {
      "command": "$NPX_CMD",
      "args": ["-y", "@insforge/insforge-mcp"],
      "env": {
        "API_KEY": "$API_KEY",
        "API_BASE_URL": "$API_URL"
      }
    }
  }
}
EOF
        echo -e "${GREEN}✅ Windsurf configured at: $CONFIG_FILE${NC}"
        ;;
        
    claude)
        echo -e "${BLUE}🔧 Auto-configuring Claude Code...${NC}\n"
        
        # Check if claude CLI is available
        if ! command -v claude &> /dev/null; then
            echo -e "${RED}❌ Claude CLI not found. Please install Claude Code first.${NC}"
            echo -e "${BLUE}ℹ️  Visit https://claude.ai/code to install Claude Code${NC}"
            exit 1
        fi
        
        # Run claude mcp add command
        echo -e "${BLUE}➤ Adding Insforge MCP server...${NC}"
        if [ "$OS" == "windows" ]; then
            # Windows: Use cmd.exe to run claude commands
            cmd.exe /c "claude mcp add insforge $NPX_CMD -- -y @insforge/insforge-mcp --api_key $API_KEY"
        else
            # macOS/Linux: Run directly
            claude mcp add insforge "$NPX_CMD" -- -y @insforge/insforge-mcp --api_key "$API_KEY"
        fi
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ MCP server added successfully${NC}"
        else
            echo -e "${RED}❌ Failed to add MCP server${NC}"
            exit 1
        fi
        
        # Set API_BASE_URL if not default
        if [ "$API_URL" != "http://localhost:7130" ]; then
            echo -e "${BLUE}➤ Setting API_BASE_URL...${NC}"
            if [ "$OS" == "windows" ]; then
                cmd.exe /c "claude mcp set-env insforge API_BASE_URL $API_URL"
            else
                claude mcp set-env insforge API_BASE_URL "$API_URL"
            fi
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ API_BASE_URL configured${NC}"
            else
                echo -e "${RED}⚠️  Warning: Failed to set API_BASE_URL${NC}"
            fi
        fi
        
        echo -e "${GREEN}✅ Claude Code configured successfully${NC}"
        ;;
esac

echo -e "\n${GREEN}🎉 Setup complete! Restart your AI assistant to use Insforge MCP.${NC}"
echo -e "${BLUE}📚 Quick test: Ask your AI assistant to use the 'get-instructions' tool.${NC}"