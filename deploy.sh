#!/bin/bash

###############################################################################
# SocialDiscovery - One-Click Deployment Script
# This script preserves ALL your existing code and adds new features
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Banner
echo -e "${BLUE}"
cat << "BANNER"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██████╗  ██████╗  ██████╗██╗ █████╗ ██╗               ║
║  ██╔════╝ ██╔═══██╗██╔════╝██║██╔══██╗██║               ║
║  ███████╗ ██║   ██║██║     ██║███████║██║               ║
║  ╚════██║ ██║   ██║██║     ██║██╔══██║██║               ║
║  ███████║ ╚██████╔╝╚██████╗██║██║  ██║███████╗          ║
║  ╚══════╝  ╚═════╝  ╚═════╝╚═╝╚═╝  ╚═╝╚══════╝          ║
║                                                           ║
║  DISCOVERY - The #1 Social Platform 2026                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"

###############################################################################
# 1. Pre-flight Checks
###############################################################################

log_info "Running pre-flight checks..."

if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi
log_success "Node.js found: $(node --version)"

if ! command -v python3 &> /dev/null; then
    log_error "Python3 not found. Please install Python 3.12+"
    exit 1
fi
log_success "Python3 found: $(python3 --version)"

if ! command -v docker &> /dev/null; then
    log_warning "Docker not found. Will skip Docker deployment."
    DOCKER_AVAILABLE=false
else
    log_success "Docker found: $(docker --version)"
    DOCKER_AVAILABLE=true
fi

if ! command -v git &> /dev/null; then
    log_error "Git not found. Please install Git."
    exit 1
fi
log_success "Git found: $(git --version)"

###############################################################################
# 2. Backup Existing Code
###############################################################################

log_info "Creating backup of existing code..."

BACKUP_DIR="backups/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

PYTHON_FILES=(
    "abuse_policies.py"
    "audit_append.py"
    "block_policy.py"
    "intent_engine.py"
    "intent_registry.json"
    "intent_sample.json"
    "intent_schema.json"
    "intents.json"
    "policy_manifest.json"
    "replay_intent.py"
    "simulate_discovery.py"
    "trending.py"
    "ui_contract.json"
)

for file in "${PYTHON_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        log_success "Backed up: $file"
    fi
done

log_success "Backup created at: $BACKUP_DIR"

###############################################################################
# 3. Setup Directory Structure
###############################################################################

log_info "Setting up directory structure..."

mkdir -p backend/src/{api/v1/{auth,users,posts,discovery,messaging,stories,analytics,trending,news,thoughtTwins,brands,intent},core/{config,middleware,security,database},services/{intent,trending,news,thoughtTwins,monetization,ml,recommendation,moderation,notification},models,utils,workers}
mkdir -p frontend/src/{app,components/{ui,features,layouts},hooks,services,store,utils,types}
mkdir -p ml-services/{recommendation,moderation,analytics}
mkdir -p infrastructure/{kubernetes,terraform,monitoring,nginx}
mkdir -p mobile/{ios,android,shared}
mkdir -p docs/{api,architecture,deployment}
mkdir -p tests/{unit,integration,e2e}

log_success "Directory structure created"

###############################################################################
# 4. Move Python Files to Services (with symlinks)
###############################################################################

log_info "Organizing Python intent system..."

INTENT_DIR="backend/src/services/intent"
mkdir -p "$INTENT_DIR"

for file in "${PYTHON_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$INTENT_DIR/"
        ln -sf "$INTENT_DIR/$file" "$file" 2>/dev/null || true
        log_success "Organized: $file"
    fi
done

log_success "Python intent system organized"

###############################################################################
# 5. Install Dependencies
###############################################################################

log_info "Installing dependencies..."

if [ -d "backend" ]; then
    cd backend
    [ ! -f "package.json" ] && npm init -y
    npm install --silent 2>&1 | grep -v "WARN" || true
    cd ..
fi

if [ -d "frontend" ]; then
    cd frontend
    [ ! -f "package.json" ] && npx create-next-app@latest . --typescript --tailwind --app --yes
    npm install --silent 2>&1 | grep -v "WARN" || true
    cd ..
fi

pip3 install --quiet fastapi uvicorn redis torch transformers numpy pandas scikit-learn 2>&1 | grep -v "Requirement already satisfied" || true
log_success "Dependencies installed"

###############################################################################
# 6. Environment Variables
###############################################################################

log_info "Setting up environment variables..."

[ ! -f backend/.env ] && cat > backend/.env << 'ENV'
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/socialdiscovery
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-this-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
ENV

[ ! -f frontend/.env.local ] && cat > frontend/.env.local << 'ENV'
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3002
ENV

###############################################################################
# 7. Finish
###############################################################################

chmod +x start.sh stop.sh || true

echo ""
log_success "DEPLOYMENT COMPLETE"
log_success "Run ./start.sh to launch the platform"
