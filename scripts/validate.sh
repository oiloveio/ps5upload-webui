#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="${ROOT}/package"

required_paths=(
  "${PKG}/manifest"
  "${PKG}/app"
  "${PKG}/app/bin/ps5upload-engine"
  "${PKG}/app/bin/ps5upload-engine-runner"
  "${PKG}/app/bin/ps5upload-companion"
  "${PKG}/app/web/index.html"
  "${PKG}/app/ui/config"
  "${PKG}/cmd"
  "${PKG}/cmd/main"
  "${PKG}/config/privilege"
  "${PKG}/config/resource"
  "${PKG}/ps5upload-webui.sc"
  "${PKG}/wizard"
  "${PKG}/ICON.PNG"
  "${PKG}/ICON_256.PNG"
)

for path in "${required_paths[@]}"; do
  if [ ! -e "${path}" ]; then
    echo "missing required path: ${path}" >&2
    exit 1
  fi
done

for key in appname version display_name source service_port desktop_uidir desktop_applaunchname; do
  if ! grep -q "^${key}=" "${PKG}/manifest"; then
    echo "manifest missing key: ${key}" >&2
    exit 1
  fi
done

if [ -f "${ROOT}/VERSION" ]; then
  expected_version="$(tr -d '[:space:]' < "${ROOT}/VERSION")"
  manifest_version="$(awk -F= '/^version=/{gsub(/[[:space:]]/, "", $2); print $2}' "${PKG}/manifest")"
  if [ "${expected_version}" != "${manifest_version}" ]; then
    echo "version mismatch: VERSION=${expected_version}, manifest=${manifest_version}" >&2
    exit 1
  fi
fi

json_files=(
  "${PKG}/config/privilege"
  "${PKG}/config/resource"
  "${PKG}/app/ui/config"
  "${PKG}/wizard/install"
  "${PKG}/wizard/config"
  "${PKG}/wizard/uninstall"
)

for file in "${json_files[@]}"; do
  if command -v jq >/dev/null 2>&1; then
    jq empty "${file}" >/dev/null
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m json.tool "${file}" >/dev/null
  else
    echo "warning: neither jq nor python3 found; skipping JSON validation for ${file}" >&2
  fi
done

if [ ! -x "${PKG}/cmd/main" ]; then
  echo "cmd/main is not executable" >&2
  exit 1
fi

if [ ! -x "${PKG}/app/bin/ps5upload-engine" ]; then
  echo "app/bin/ps5upload-engine is not executable" >&2
  exit 1
fi

if ! grep -Fq 'setsid "${RUNNER}"' "${PKG}/cmd/main"; then
  echo "cmd/main must start runner in a dedicated process group with setsid" >&2
  exit 1
fi

if ! grep -Fq 'kill -TERM -- "-${pid}"' "${PKG}/cmd/main"; then
  echo "cmd/main must stop the whole runner process group" >&2
  exit 1
fi

if ! grep -Fq 'cleanup_stale_companion' "${PKG}/cmd/main"; then
  echo "cmd/main must clean stale companion processes" >&2
  exit 1
fi

pick_path_count=0
pick_path_file=""
for file in "${PKG}"/app/web/assets/pickPath-*.js; do
  [ -e "${file}" ] || continue
  pick_path_count=$((pick_path_count + 1))
  pick_path_file="${file}"
done

if [ "${pick_path_count}" -ne 1 ]; then
  echo "expected exactly one app/web/assets/pickPath-*.js, found ${pick_path_count}" >&2
  exit 1
fi

if ! grep -Fq 'async function i(i){return n({mode:i.mode,title:i.title})}' "${pick_path_file}"; then
  echo "pickPath single-select must use LocalPathPicker in WebUI build" >&2
  exit 1
fi

if ! grep -Fq 'async function a(i={}){let e=await n({mode:`file`,title:i.title});return typeof e==`string`?[e]:[]}' "${pick_path_file}"; then
  echo "pickPath file-select must use LocalPathPicker in WebUI build" >&2
  exit 1
fi

if grep -Fq 'await r({directory:' "${pick_path_file}"; then
  echo "pickPath still calls the empty Tauri dialog open() branch" >&2
  exit 1
fi

dialog_count=0
dialog_file=""
for file in "${PKG}"/app/web/assets/tauri-dialog-*.js; do
  [ -e "${file}" ] || continue
  dialog_count=$((dialog_count + 1))
  dialog_file="${file}"
done

if [ "${dialog_count}" -ne 1 ]; then
  echo "expected exactly one app/web/assets/tauri-dialog-*.js, found ${dialog_count}" >&2
  exit 1
fi

if grep -Fq 'async function n(){return null}' "${dialog_file}" || grep -Fq 'async function r(){return null}' "${dialog_file}"; then
  echo "tauri-dialog open/save still return null in WebUI build" >&2
  exit 1
fi

if ! grep -Fq 'import{a as o}from"./index-' "${dialog_file}"; then
  echo "tauri-dialog must use LocalPathPicker fallback in WebUI build" >&2
  exit 1
fi

shim_count=0
shim_file=""
for file in "${PKG}"/app/web/assets/tauri-core-*.js; do
  [ -e "${file}" ] || continue
  shim_count=$((shim_count + 1))
  shim_file="${file}"
done

if [ "${shim_count}" -ne 1 ]; then
  echo "expected exactly one app/web/assets/tauri-core-*.js, found ${shim_count}" >&2
  exit 1
fi

if ! grep -Fq 'save_text_file:async(e)=>d(`/api/nas/write-text`,e)' "${shim_file}"; then
  echo "save_text_file must write through companion in WebUI build" >&2
  exit 1
fi

echo "package validation passed"
