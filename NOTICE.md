# NOTICE

`ps5upload-webui` is an unofficial fnOS packaging project for PS5Upload.

## Upstream

- `phantomptr/ps5upload`: upstream PS5Upload project, engine, and WebUI assets.
  - Repository: https://github.com/phantomptr/ps5upload
  - This package currently locks upstream version `3.3.22`; see `UPSTREAM.lock`.
  - This repository is a downstream fnOS packaging project for PS5Upload. It is not an official upstream release.

## Local changes in this package

- fnOS `.fpk` package structure, manifest, lifecycle scripts, wizard, and resource declarations.
- `ps5upload-companion`, a small local HTTP server that serves the WebUI, exposes NAS file APIs, and reverse-proxies the loopback engine.
- Browser WebUI shim patches maintained in `scripts/patch-webui.mjs`.

Thanks to PhantomPtr and the broader PS5 homebrew and research community.
