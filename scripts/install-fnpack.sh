#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="${ROOT}/tools"
mkdir -p "${TOOLS}"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)
    URL="https://static2.fnnas.com/fnpack/fnpack-1.2.1-linux-amd64"
    ;;
  Linux-aarch64|Linux-arm64)
    URL="https://static2.fnnas.com/fnpack/fnpack-1.2.1-linux-arm64"
    ;;
  Darwin-x86_64)
    URL="https://static2.fnnas.com/fnpack/fnpack-1.2.1-darwin-amd64"
    ;;
  Darwin-arm64)
    URL="https://static2.fnnas.com/fnpack/fnpack-1.2.1-darwin-arm64"
    ;;
  *)
    echo "unsupported local platform for automatic fnpack download: $(uname -s)-$(uname -m)" >&2
    exit 1
    ;;
esac

curl -fL "${URL}" -o "${TOOLS}/fnpack"
chmod +x "${TOOLS}/fnpack"
"${TOOLS}/fnpack" --help >/dev/null
echo "installed ${TOOLS}/fnpack"
