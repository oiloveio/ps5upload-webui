#!/usr/bin/env node
/**
 * patch-webui.mjs — 把本项目对上游 web 前端 tauri-shim 的改动以可重放方式应用。
 *
 * 背景：package/app/web/ 是上游预构建产物，每次跟进上游重新拉取后会被覆盖，
 * 因此我们对 shim / picker 等构建产物的所有修改都集中登记在这里，升级流程为：
 *   重新拉取 web/  →  node scripts/patch-webui.mjs  →  ./scripts/build.sh
 *
 * 特性：
 *  - 幂等：已应用的改动会跳过，可反复运行。
 *  - 失配即报错：锚点字符串找不到且未应用时退出码非 0，提示上游 shim 形态已变，
 *    需人工复核（这正是用来在升级时第一时间发现命令漂移的机制）。
 *
 * 每条改动用 {name, applied, anchor, apply} 描述：
 *  - applied(s): 是否已应用（返回 true 则跳过）
 *  - anchor:     用于定位的唯一字符串（必须存在且唯一）
 *  - apply(s):   返回替换后的完整内容
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const assetsDir = join(root, "package/app/web/assets");

function findAsset(pattern, label) {
  let files;
  try {
    files = readdirSync(assetsDir);
  } catch {
    fail(`web 资源目录不存在：${assetsDir}\n请先拉取/放置上游 web/ 前端再运行本脚本。`);
  }
  const hits = files.filter((f) => pattern.test(f));
  if (hits.length !== 1) {
    fail(`期望唯一的 ${label}，实际找到 ${hits.length} 个：${hits.join(", ") || "(无)"}`);
  }
  return join(assetsDir, hits[0]);
}

function findShim() {
  return findAsset(/^tauri-core-.*\.js$/, "tauri-core-*.js");
}

function findPickPath() {
  return findAsset(/^pickPath-.*\.js$/, "pickPath-*.js");
}

function findDialog() {
  return findAsset(/^tauri-dialog-.*\.js$/, "tauri-dialog-*.js");
}

function findIndex() {
  return findAsset(/^index-.*\.js$/, "index-*.js");
}

function fail(msg) {
  console.error(`\n[patch-webui] 失败：${msg}\n`);
  process.exit(1);
}

// ── 改动清单 ────────────────────────────────────────────────────────────────
const SHIM_PATCHES = [
  {
    name: "新增 text helper（CHANGELOG/FAQ 读取 Markdown 文本）",
    applied: (s) => s.includes("async function g(e){let t=await fetch(`${l()}${e}`);if(!t.ok)throw Error(await t.text());return t.text()}"),
    anchor:
      "async function d(e,t){let n=await fetch(`${l()}${e}`,{method:`POST`,headers:{\"Content-Type\":`application/json`},body:JSON.stringify(t)});if(!n.ok)throw Error(await n.text());return n.json()}function f(e){",
    apply: (s, a) =>
      s.replace(
        a,
        "async function d(e,t){let n=await fetch(`${l()}${e}`,{method:`POST`,headers:{\"Content-Type\":`application/json`},body:JSON.stringify(t)});if(!n.ok)throw Error(await n.text());return n.json()}async function g(e){let t=await fetch(`${l()}${e}`);if(!t.ok)throw Error(await t.text());return t.text()}function f(e){",
      ),
  },
  {
    name: "changelog_load / faq_load → companion bundled Markdown",
    applied: (s) => s.includes("changelog_load:async()=>g(`/api/app/changelog`)"),
    anchor: "engine_logs_tail:async({since:e})=>u(`/api/engine-logs${e==null?``:`?since=${e}`}`),",
    apply: (s, a) =>
      s.replace(
        a,
        a + "changelog_load:async()=>g(`/api/app/changelog`),faq_load:async()=>g(`/api/app/faq`),",
      ),
  },
  {
    name: "engine_logs_tail → /api/engine-logs（前端命令名与 shim 不一致）",
    applied: (s) => s.includes("engine_logs_tail:"),
    anchor: "engine_logs:async({since:e})=>u(`/api/engine-logs${e==null?``:`?since=${e}`}`),",
    apply: (s, a) =>
      s.replace(a, a + "engine_logs_tail:async({since:e})=>u(`/api/engine-logs${e==null?``:`?since=${e}`}`),"),
  },
  {
    name: "process_list_get / smp_status → engine 进程与 SMP 接口",
    applied: (s) => s.includes("process_list_get:"),
    anchor: "ps5_processes:async({addr:e})=>u(`/api/ps5/proc/list${f(e)}`),",
    apply: (s, a) =>
      s.replace(
        a,
        a +
          "process_list_get:async({addr:e})=>u(`/api/ps5/proc/list${f(e)}`),smp_status:async({addr:e})=>u(`/api/ps5/smp-meta/stats${f(e)}`),",
      ),
  },
  {
    name: "未注册命令兜底改为 reject（避免返回 undefined 被迭代导致整页崩溃）",
    applied: (s) => s.includes("command not supported in web mode"),
    anchor: "console.warn(`[tauri-shim] unhandled invoke:`,e,t);return}",
    apply: (s, a) =>
      s.replace(a, "console.warn(`[tauri-shim] unhandled invoke:`,e,t);throw Error(`command not supported in web mode: `+e)}"),
  },
  {
    name: "diag_log_append → 落盘到 companion（logs/ps5upload.log）",
    applied: (s) => s.includes("diag_log_append:async(e)=>d(`/api/client-log`,e)"),
    anchor: "diag_log_append:async()=>void 0,",
    apply: (s, a) => s.replace(a, "diag_log_append:async(e)=>d(`/api/client-log`,e),"),
  },
  {
    name: "crash_report_save → 落盘到 companion（logs/crash.log）",
    applied: (s) => s.includes("crash_report_save:async(e)=>d(`/api/client-log/crash`,e)"),
    anchor: "crash_report_save:async()=>void 0,",
    apply: (s, a) => s.replace(a, "crash_report_save:async(e)=>d(`/api/client-log/crash`,e),"),
  },
  {
    name: "get_log_path → 返回 companion 上报的客户端日志路径",
    applied: (s) => s.includes("get_log_path:async()=>{try{return(await u(`/api/client-log/path`)"),
    anchor: "get_log_path:async()=>null}",
    apply: (s, a) =>
      s.replace(a, "get_log_path:async()=>{try{return(await u(`/api/client-log/path`)).path}catch{return null}}}"),
  },
  {
    name: "save_text_file → 保存到 NAS 授权路径",
    applied: (s) => s.includes("save_text_file:async(e)=>d(`/api/nas/write-text`,e)"),
    anchor: "save_text_file:async()=>void 0,",
    apply: (s, a) => s.replace(a, "save_text_file:async(e)=>d(`/api/nas/write-text`,e),"),
  },
];

const PICK_PATH_PATCHES = [
  {
    name: "WebUI 选择文件/目录时始终使用 NAS LocalPathPicker（避免空的 Tauri dialog 分支）",
    applied: (s) => s.includes("async function i(i){return n({mode:i.mode,title:i.title})}"),
    anchor:
      "async function i(i){if(t()||!e())return n({mode:i.mode,title:i.title});let a=await r({directory:i.mode===`folder`,multiple:!1,title:i.title,filters:i.filters});return typeof a==`string`?a:null}",
    apply: (s, a) => s.replace(a, "async function i(i){return n({mode:i.mode,title:i.title})}"),
  },
  {
    name: "WebUI 多文件入口降级为 LocalPathPicker 单选（避免 open() 返回 null 后无反馈）",
    applied: (s) =>
      s.includes("async function a(i={}){let e=await n({mode:`file`,title:i.title});return typeof e==`string`?[e]:[]}"),
    anchor:
      "async function a(i={}){if(t()||!e()){let e=await n({mode:`file`,title:i.title});return typeof e==`string`?[e]:[]}let a=await r({directory:!1,multiple:!0,title:i.title,filters:i.filters});return Array.isArray(a)?a.filter(e=>typeof e==`string`):typeof a==`string`?[a]:[]}",
    apply: (s, a) =>
      s.replace(a, "async function a(i={}){let e=await n({mode:`file`,title:i.title});return typeof e==`string`?[e]:[]}"),
  },
];

const indexAssetName = basename(findIndex());

const DIALOG_PATCHES = [
  {
    name: "tauri-dialog open/save → NAS LocalPathPicker fallback",
    applied: (s) => s.includes('import{a as o}from"./index-') && !s.includes("async function n(){return null}"),
    anchor:
      'import{n as e}from"./rolldown-runtime-QTnfLwEv.js";var t=e({confirm:()=>i,open:()=>n,save:()=>r});async function n(){return null}async function r(){return null}async function i(e){return window.confirm(e)}export{t as i,n,r,i as t};',
    apply: () =>
      'import{n as e}from"./rolldown-runtime-QTnfLwEv.js";import{a as o}from"./' +
      indexAssetName +
      '";var t=e({confirm:()=>i,open:()=>n,save:()=>r});function a(e){let o=String(e||`download`).split(/[\\\\/]/).filter(Boolean).pop();return o||`download`}async function n(e={}){let t=await o({mode:e.directory?`folder`:`file`,title:e.title});return t?e.multiple?[t]:t:null}async function r(e={}){let t=await o({mode:`folder`,title:e.title||`Choose destination folder`});return t?`${t.replace(/\\/+$/,``)}/${a(e.defaultPath)}`:null}async function i(e){return window.confirm(e)}export{t as i,n,r,i as t};',
  },
];

const INDEX_PATCHES = [
  {
    name: "LocalPathPicker 授权根禁用上一级（避免访问 /vol1/@appshare 这类父目录时报错）",
    applied: (s) => s.includes("let y=l&&!s.includes(l)?sa(l):null;"),
    anchor: "let y=l?sa(l):null;return(0,M.jsxDEV)",
    apply: (s, a) => s.replace(a, "let y=l&&!s.includes(l)?sa(l):null;return(0,M.jsxDEV)"),
  },
];

function applyPatches(targetPath, patches) {
  let s = readFileSync(targetPath, "utf8");
  const before = s;
  const report = [];

  for (const p of patches) {
    if (p.applied(s)) {
      report.push(`  • 跳过（已应用）：${p.name}`);
      continue;
    }
    const count = s.split(p.anchor).length - 1;
    if (count === 0) {
      fail(
        `锚点未找到，可能上游构建产物形态已变（命令/选择器漂移）：\n    改动：${p.name}\n    锚点：${p.anchor}\n` +
          `  请人工复核 ${targetPath} 后更新本脚本的锚点/改动逻辑。`,
      );
    }
    if (count > 1) {
      fail(`锚点不唯一（出现 ${count} 次），无法安全替换：\n    改动：${p.name}\n    锚点：${p.anchor}`);
    }
    s = p.apply(s, p.anchor);
    report.push(`  ✓ 应用：${p.name}`);
  }

  if (s !== before) {
    writeFileSync(targetPath, s);
  }

  console.log(`[patch-webui] 目标：${targetPath}`);
  console.log(report.join("\n"));
  console.log(`[patch-webui] ${s === before ? "无变化（全部已应用）" : "已写入补丁"}。`);
}

// ── 执行 ────────────────────────────────────────────────────────────────────
applyPatches(findShim(), SHIM_PATCHES);
applyPatches(findPickPath(), PICK_PATH_PATCHES);
applyPatches(findDialog(), DIALOG_PATCHES);
applyPatches(findIndex(), INDEX_PATCHES);
