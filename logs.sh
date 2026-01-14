#!/bin/bash
# View Decky plugin logs from Steam Deck
# Usage: ./logs.sh [option]
#   (no args) - tail Bitwarden logs only (filtered)
#   -a        - tail all Decky logs
#   -p        - cat plugin log file

DECK_IP="steamdeck.local"
DECK_USER="deck"
PLUGIN_NAME="decky-bitwarden-unofficial"
LOG_TAG="Bitwarden"

case "${1:-}" in
    -a|--all)
        echo "► All Decky logs (Ctrl+C to exit):"
        ssh "${DECK_USER}@${DECK_IP}" "journalctl -u plugin_loader -f"
        ;;
    -p|--plugin)
        echo "► Plugin log file:"
        ssh "${DECK_USER}@${DECK_IP}" "cat ~/homebrew/logs/${PLUGIN_NAME}/plugin.log 2>/dev/null || echo 'No plugin log found'"
        ;;
    *)
        echo "► Bitwarden plugin logs (Ctrl+C to exit):"
        echo "  (filtering for [${LOG_TAG}])"
        echo ""
        ssh "${DECK_USER}@${DECK_IP}" "journalctl -u plugin_loader -f | grep --line-buffered '\[${LOG_TAG}\]'"
        ;;
esac
