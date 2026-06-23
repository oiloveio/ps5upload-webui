#!/usr/bin/env node
import { createWriteStream, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const lock = Object.fromEntries(
  readFileSync(join(root, "UPSTREAM.lock"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const image = process.env.ENGINE_IMAGE || lock.ENGINE_IMAGE;
const tag = process.env.ENGINE_IMAGE_TAG || lock.ENGINE_IMAGE_TAG;
const arch = process.env.ENGINE_ARCH || "amd64";
const output = resolve(process.env.ENGINE_OUTPUT || join(root, "package/app/bin/ps5upload-engine"));

if (!image || !tag) {
  throw new Error("ENGINE_IMAGE and ENGINE_IMAGE_TAG must be set in UPSTREAM.lock");
}

const registry = "ghcr.io";
const repository = image.replace(`${registry}/`, "");
const tokenUrl = `https://${registry}/token?scope=repository:${repository}:pull`;

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${url} -> HTTP ${response.status}`);
  }
  return response.json();
}

async function download(url, dest, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok || !response.body) {
    throw new Error(`${url} -> HTTP ${response.status}`);
  }
  await pipeline(response.body, createWriteStream(dest));
}

const token = (await fetchJson(tokenUrl)).token;
const auth = { Authorization: `Bearer ${token}` };
const acceptIndex = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json",
].join(", ");

const index = await fetchJson(`https://${registry}/v2/${repository}/manifests/${tag}`, {
  ...auth,
  Accept: acceptIndex,
});

let manifest = index;
if (Array.isArray(index.manifests)) {
  const match = index.manifests.find(
    (item) => item.platform?.os === "linux" && item.platform?.architecture === arch,
  );
  if (!match) {
    throw new Error(`no linux/${arch} manifest found for ${image}:${tag}`);
  }
  manifest = await fetchJson(`https://${registry}/v2/${repository}/manifests/${match.digest}`, {
    ...auth,
    Accept: acceptIndex,
  });
}

const layer = manifest.layers?.find((item) => item.mediaType?.includes("tar+gzip"));
if (!layer) {
  throw new Error(`no gzip layer found for ${image}:${tag}`);
}

const work = mkdtempSync(join(tmpdir(), "ps5upload-engine-"));
const layerPath = join(work, "layer.tar.gz");
mkdirSync(dirname(output), { recursive: true });

console.log(`fetching ${image}:${tag} linux/${arch}`);
await download(`https://${registry}/v2/${repository}/blobs/${layer.digest}`, layerPath, auth);

const extract = spawnSync("tar", ["-xzf", layerPath, "-C", work, "ps5upload-engine"], {
  stdio: "inherit",
});
if (extract.status !== 0) {
  rmSync(work, { recursive: true, force: true });
  throw new Error("failed to extract ps5upload-engine from image layer");
}

const install = spawnSync("install", ["-m", "0755", join(work, "ps5upload-engine"), output], {
  stdio: "inherit",
});
rmSync(work, { recursive: true, force: true });
if (install.status !== 0) {
  throw new Error(`failed to install binary to ${output}`);
}

console.log(`installed ${output}`);
