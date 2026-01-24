#!/bin/bash
# =============================================================================
# Test Runner Script
# =============================================================================
# This script runs the test suite for stack-submit.sh
#
# Usage:
#   ./tests/run-tests.sh           # Run all tests
#   ./tests/run-tests.sh --verbose # Run with verbose output
# =============================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo " stack-submit.sh Test Suite"
echo "=========================================="
echo ""

# Check if bats is installed
if ! command -v bats &> /dev/null; then
    echo -e "${YELLOW}BATS (Bash Automated Testing System) is not installed.${NC}"
    echo ""
    echo "To install BATS:"
    echo ""
    echo "  macOS:   brew install bats-core"
    echo "  Ubuntu:  sudo apt-get install bats"
    echo "  Manual:  git clone https://github.com/bats-core/bats-core.git"
    echo "           cd bats-core && ./install.sh /usr/local"
    echo ""
    echo "Running basic syntax check instead..."
    echo ""
    
    # Fallback: Run basic bash syntax check
    echo "Checking bash syntax..."
    if bash -n "$PROJECT_DIR/stack-submit.sh"; then
        echo -e "${GREEN}✓ Syntax check passed${NC}"
    else
        echo -e "${RED}✗ Syntax check failed${NC}"
        exit 1
    fi
    
    # Run shellcheck if available
    if command -v shellcheck &> /dev/null; then
        echo ""
        echo "Running shellcheck..."
        if shellcheck "$PROJECT_DIR/stack-submit.sh"; then
            echo -e "${GREEN}✓ Shellcheck passed${NC}"
        else
            echo -e "${YELLOW}⚠ Shellcheck found issues${NC}"
        fi
    fi
    
    exit 0
fi

# Parse arguments
BATS_ARGS=""
if [ "$1" = "--verbose" ] || [ "$1" = "-v" ]; then
    BATS_ARGS="--verbose-run"
fi

# Run BATS tests
echo "Running BATS tests..."
echo ""

cd "$SCRIPT_DIR"

if bats $BATS_ARGS stack-submit.bats; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo " All tests passed!"
    echo "==========================================${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}=========================================="
    echo " Some tests failed"
    echo "==========================================${NC}"
    exit 1
fi
