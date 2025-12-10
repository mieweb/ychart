#!/bin/bash

# YChart Documentation Deployment Script
# Deploys documentation to orgchart.opensource.mieweb.org/docs/

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SSH_HOST="pralambomanarivo@orgchart.opensource.mieweb.org"
SSH_PORT="2298"
REMOTE_DIR="/var/www/html/docs"
BUILD_DIR="./build"

echo -e "${BLUE}🚀 YChart Documentation Deployment${NC}"
echo "=================================="
echo ""

# Step 1: Build
echo -e "${BLUE}📦 Building documentation...${NC}"
pnpm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Step 2: Create remote directory if needed
echo -e "${BLUE}📁 Ensuring remote directory exists...${NC}"
ssh -p $SSH_PORT $SSH_HOST "sudo mkdir -p $REMOTE_DIR && sudo chown -R \$USER:\$USER $REMOTE_DIR"
echo -e "${GREEN}✅ Remote directory ready${NC}"
echo ""

# Step 3: Backup existing files on remote server
echo -e "${BLUE}💾 Creating backup on remote server...${NC}"
BACKUP_NAME="docs.backup.$(date +%Y%m%d_%H%M%S)"
ssh -p $SSH_PORT $SSH_HOST "if [ -d $REMOTE_DIR ] && [ \"\$(ls -A $REMOTE_DIR 2>/dev/null)\" ]; then sudo cp -r $REMOTE_DIR /tmp/$BACKUP_NAME && echo 'Backup created at /tmp/$BACKUP_NAME'; else echo 'No existing files to backup'; fi"
echo ""

# Step 4: Deploy files via rsync
echo -e "${BLUE}🚀 Deploying files to server...${NC}"
rsync -avz --delete -e "ssh -p $SSH_PORT" $BUILD_DIR/ $SSH_HOST:$REMOTE_DIR/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Files deployed${NC}"
echo ""

# Step 5: Set permissions on remote server
echo -e "${BLUE}🔐 Setting permissions...${NC}"
ssh -p $SSH_PORT $SSH_HOST "sudo chown -R www-data:www-data $REMOTE_DIR && sudo chmod -R 755 $REMOTE_DIR"
echo -e "${GREEN}✅ Permissions set${NC}"
echo ""

# Step 6: Test Nginx configuration
echo -e "${BLUE}🔍 Testing Nginx configuration...${NC}"
ssh -p $SSH_PORT $SSH_HOST "sudo nginx -t"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx configuration valid${NC}"
    echo ""
    
    # Step 7: Reload Nginx
    echo -e "${BLUE}🔄 Reloading Nginx...${NC}"
    ssh -p $SSH_PORT $SSH_HOST "sudo systemctl reload nginx"
    echo -e "${GREEN}✅ Nginx reloaded${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    echo -e "${YELLOW}⚠️  Files were deployed but Nginx was not reloaded${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Documentation deployed to: $SSH_HOST:$REMOTE_DIR"
echo "URL: https://orgchart.opensource.mieweb.org/docs/"
echo ""
echo "To verify deployment:"
echo "  curl -I https://orgchart.opensource.mieweb.org/docs/"
echo ""
echo "To rollback (if needed):"
echo "  ssh -p $SSH_PORT $SSH_HOST \"sudo rm -rf $REMOTE_DIR && sudo mv /tmp/$BACKUP_NAME $REMOTE_DIR\""
echo ""
