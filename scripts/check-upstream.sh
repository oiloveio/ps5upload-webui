#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCK="${ROOT}/UPSTREAM.lock"

if [ ! -f "${LOCK}" ]; then
  echo "missing ${LOCK}" >&2
  exit 1
fi

# shellcheck disable=SC1090
. "${LOCK}"

latest_head="$(
  git ls-remote "${UPSTREAM_REPO}" "refs/heads/${UPSTREAM_BRANCH}" |
    awk '{print $1}'
)"

latest_tag="$(
  git ls-remote --tags --refs "${UPSTREAM_REPO}" 'refs/tags/v*' |
    awk '{sub("refs/tags/v", "", $2); print $2}' |
    sort -V |
    tail -1
)"

latest_tag_ref="v${latest_tag}"
latest_tag_commit="$(
  git ls-remote --tags "${UPSTREAM_REPO}" "refs/tags/${latest_tag_ref}^{}" |
    awk '{print $1}'
)"

if [ -z "${latest_tag_commit}" ]; then
  latest_tag_commit="$(
    git ls-remote --tags --refs "${UPSTREAM_REPO}" "refs/tags/${latest_tag_ref}" |
      awk '{print $1}'
  )"
fi

echo "upstream repo:      ${UPSTREAM_REPO}"
echo "tracked branch:     ${UPSTREAM_BRANCH}"
echo "locked tag:         ${UPSTREAM_TAG}"
echo "locked commit:      ${UPSTREAM_COMMIT}"
echo "binary source:      ${ENGINE_IMAGE}:${ENGINE_IMAGE_TAG}"
echo "binary arch:        ${ENGINE_BINARY_ARCH:-amd64}"
echo
echo "current branch head:${latest_head:+ ${latest_head}}"
echo "latest tag:         ${latest_tag_ref}"
echo "latest tag commit:  ${latest_tag_commit}"
echo

if [ "${latest_head}" != "${UPSTREAM_COMMIT}" ]; then
  echo "branch drift: yes"
else
  echo "branch drift: no"
fi

if [ "${latest_tag_ref}" != "${UPSTREAM_TAG}" ] || [ "${latest_tag_commit}" != "${UPSTREAM_COMMIT}" ]; then
  echo "tag drift: yes"
else
  echo "tag drift: no"
fi

if command -v docker >/dev/null 2>&1; then
  if docker manifest inspect "${ENGINE_IMAGE}:${ENGINE_IMAGE_TAG}" >/dev/null 2>&1; then
    echo "binary source exists: yes"
  else
    echo "binary source exists: no"
  fi
else
  echo "binary source exists: skipped; docker unavailable"
fi
