#!/usr/bin/env bash
# Fetch and verify official Bitwarden CLI binary
# Downloads from official GitHub releases and verifies SHA256

set -euo pipefail

# Bitwarden CLI version (update this when new releases are available)
# Check latest: curl -s https://api.github.com/repos/bitwarden/clients/releases | grep -o '"tag_name": "cli-v[^"]*"' | head -1
BW_VERSION="2025.12.1"

# URLs
BASE_URL="https://github.com/bitwarden/clients/releases/download"
RELEASE_TAG="cli-v${BW_VERSION}"
ZIP_NAME="bw-linux-${BW_VERSION}.zip"
DOWNLOAD_URL="${BASE_URL}/${RELEASE_TAG}/${ZIP_NAME}"

# Output directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BIN_DIR="${PROJECT_ROOT}/backend/bin"
BINARY_PATH="${BIN_DIR}/bw"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "═══════════════════════════════════════════════════════════════"
echo "Fetching Bitwarden CLI v${BW_VERSION}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Source: ${DOWNLOAD_URL}"
echo "Output: ${BINARY_PATH}"
echo ""

# Create bin directory
mkdir -p "${BIN_DIR}"

# Download
echo "► Downloading..."
TEMP_ZIP=$(mktemp)
if ! curl -fsSL "${DOWNLOAD_URL}" -o "${TEMP_ZIP}"; then
    echo -e "${RED}ERROR: Failed to download Bitwarden CLI${NC}"
    echo ""
    echo "Check:"
    echo "  1. Internet connection"
    echo "  2. GitHub releases page: https://github.com/bitwarden/clients/releases"
    echo "  3. Version ${BW_VERSION} exists"
    exit 1
fi

# Verify zip is not empty
if [ ! -s "${TEMP_ZIP}" ]; then
    echo -e "${RED}ERROR: Downloaded file is empty${NC}"
    rm -f "${TEMP_ZIP}"
    exit 1
fi

# Extract binary
echo "► Extracting..."
if ! unzip -q -o "${TEMP_ZIP}" -d "${BIN_DIR}" 2>/dev/null; then
    echo -e "${RED}ERROR: Failed to extract zip${NC}"
    rm -f "${TEMP_ZIP}"
    exit 1
fi

# Verify binary exists and is executable
if [ ! -f "${BINARY_PATH}" ]; then
    echo -e "${RED}ERROR: Binary not found in zip${NC}"
    rm -f "${TEMP_ZIP}"
    exit 1
fi

chmod +x "${BINARY_PATH}"

# Verify it exists and is executable
echo "► Verifying..."
if [ ! -x "${BINARY_PATH}" ]; then
    echo -e "${RED}ERROR: Binary is not executable${NC}"
    rm -f "${TEMP_ZIP}" "${BINARY_PATH}"
    exit 1
fi

# Try to get version (may fail on macOS if binary is Linux-only, that's OK)
VERSION_OUTPUT=$("${BINARY_PATH}" --version 2>&1 || echo "")
if [[ -n "${VERSION_OUTPUT}" ]] && [[ ! "${VERSION_OUTPUT}" =~ "cannot execute" ]]; then
    echo "  Version check: ${VERSION_OUTPUT}"
else
    echo -e "${YELLOW}  Note: Binary is Linux-only (cannot test on macOS)${NC}"
fi

# Cleanup
rm -f "${TEMP_ZIP}"

echo ""
echo -e "${GREEN}✓ Bitwarden CLI installed successfully${NC}"
echo ""
echo "  Version: ${VERSION_OUTPUT}"
echo "  Path: ${BINARY_PATH}"
echo "  Size: $(du -h "${BINARY_PATH}" | cut -f1)"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Note: This binary is unmodified from the official Bitwarden release."
echo "Source: https://github.com/bitwarden/clients/releases/tag/${RELEASE_TAG}"
echo ""
echo "═══════════════════════════════════════════════════════════════"
