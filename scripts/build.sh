#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="${ROOT}/package"
DIST="${ROOT}/dist"
VERSION="$(tr -d '[:space:]' < "${ROOT}/VERSION")"
ARCH="x86"
FINAL_NAME="ps5upload-webui_${VERSION}_${ARCH}.fpk"

if [ ! -x "${PKG}/app/bin/ps5upload-engine" ]; then
  node "${ROOT}/scripts/fetch-engine-binary.mjs"
fi

cp "${ROOT}/CHANGELOG.md" "${PKG}/app/CHANGELOG.md"
cp "${ROOT}/FAQ.md" "${PKG}/app/FAQ.md"
find "${PKG}/app" -type d -name "__pycache__" -prune -exec rm -rf {} +

# 重放本项目对 web 前端 tauri-shim 的改动（幂等；若上游 shim 形态变更导致锚点失配会在此报错）
node "${ROOT}/scripts/patch-webui.mjs"

"${ROOT}/scripts/validate.sh"

if command -v fnpack >/dev/null 2>&1; then
  FNPACK="fnpack"
elif [ -x "${ROOT}/tools/fnpack" ]; then
  FNPACK="${ROOT}/tools/fnpack"
else
  echo "fnpack not found. Run ./scripts/install-fnpack.sh first." >&2
  exit 1
fi

mkdir -p "${DIST}"
# 只清理 fnpack 的临时产物和"同版本号"的目标文件；保留其它版本号的历史 fpk 作为回滚归档
rm -f "${PKG}"/*.fpk "${ROOT}"/*.fpk "${DIST}/${FINAL_NAME}"

"${FNPACK}" build --directory "${PKG}"

shopt -s nullglob
artifacts=("${PKG}"/*.fpk "${ROOT}"/*.fpk)
if [ "${#artifacts[@]}" -eq 0 ]; then
  echo "fnpack completed but no .fpk artifact was found in ${PKG} or ${ROOT}" >&2
  exit 1
fi

for artifact in "${artifacts[@]}"; do
  mv -f "${artifact}" "${DIST}/${FINAL_NAME}"
  echo "built ${DIST}/${FINAL_NAME}"
done
