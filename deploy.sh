#!/bin/bash
# Deploy script for Bitwarden Decky Plugin
# Usage: ./deploy.sh

set -e

# Using default hostname (change this if needed)
DECK_IP="steamdeck.local"
DECK_USER="deck"
PLUGIN_NAME="decky-bitwarden-unofficial"
PLUGIN_PATH="~/homebrew/plugins/${PLUGIN_NAME}"

# SSH options: timeout after 5 seconds for connection, 10 seconds for commands
SSH_OPTS="-o ConnectTimeout=5 -o BatchMode=yes"
SCP_OPTS="-o ConnectTimeout=5"

echo "═══════════════════════════════════════════════════════════════"
echo "Deploying ${PLUGIN_NAME} to Steam Deck at ${DECK_IP}"
echo "═══════════════════════════════════════════════════════════════"

# Check connectivity first
echo ""
echo "► Checking connectivity..."
if ! ssh ${SSH_OPTS} "${DECK_USER}@${DECK_IP}" "echo ok" &>/dev/null; then
    echo "ERROR: Cannot connect to ${DECK_IP}"
    echo ""
    echo "Make sure:"
    echo "  1. Steam Deck is powered on and connected to network"
    echo "  2. SSH is enabled: sudo systemctl enable --now sshd"
    echo "  3. You can reach it: ping ${DECK_IP}"
    exit 1
fi
echo "  Connected to ${DECK_IP}"

# No pre-flight bw check needed – plugin uses bundled backend/bin/bw

# Build frontend
echo ""
echo "► Building frontend..."
pnpm run build

# Clean and create plugin directory (requires sudo, needs TTY)
echo ""
echo "► Preparing plugin directory on Deck..."
ssh -t -o ConnectTimeout=5 "${DECK_USER}@${DECK_IP}" "sudo rm -rf ${PLUGIN_PATH} && sudo mkdir -p ${PLUGIN_PATH} && sudo chown deck:deck ${PLUGIN_PATH}"

# Deploy files using scp
echo ""
echo "► Copying files to Deck..."

# Copy directories
scp ${SCP_OPTS} -r dist/ "${DECK_USER}@${DECK_IP}:${PLUGIN_PATH}/"
scp ${SCP_OPTS} -r py_modules/ "${DECK_USER}@${DECK_IP}:${PLUGIN_PATH}/"
scp ${SCP_OPTS} -r assets/ "${DECK_USER}@${DECK_IP}:${PLUGIN_PATH}/"
scp ${SCP_OPTS} -r backend/ "${DECK_USER}@${DECK_IP}:${PLUGIN_PATH}/"

# Copy individual files
scp ${SCP_OPTS} main.py "${DECK_USER}@${DECK_IP}:${PLUGIN_PATH}/"
scp ${SCP_OPTS} plugin.json "${DECK_USER}@${DECK_IP}:${PLUGIN_PATH}/"
scp ${SCP_OPTS} package.json "${DECK_USER}@${DECK_IP}:${PLUGIN_PATH}/"
scp ${SCP_OPTS} LICENSE "${DECK_USER}@${DECK_IP}:${PLUGIN_PATH}/"

# Reload just our plugin via Decky's API (falls back to full restart if needed)
echo ""
echo "► Reloading plugin..."

# Try to reload just our plugin via Decky's local API
RELOAD_RESULT=$(ssh ${SSH_OPTS} "${DECK_USER}@${DECK_IP}" "curl -s -X POST 'http://localhost:1337/plugins/${PLUGIN_NAME}/reload' 2>/dev/null") || RELOAD_RESULT=""

if [[ "$RELOAD_RESULT" == *"true"* ]] || [[ "$RELOAD_RESULT" == *"success"* ]]; then
    echo "  Plugin reloaded via Decky API"
else
    echo "  API reload failed, restarting plugin_loader..."
    ssh -t -o ConnectTimeout=5 "${DECK_USER}@${DECK_IP}" "sudo systemctl restart plugin_loader"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✓ Deployment complete!"
echo ""
echo "Open the Quick Access menu (...) on your Deck to use Bitwarden."
echo "═══════════════════════════════════════════════════════════════"
