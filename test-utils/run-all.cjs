/**
 * [INPUT]: 依赖 node:fs、node:path、node:child_process 与 node:perf_hooks，扫描 dashboards/<id>/*.test.cjs
 * [OUTPUT]: 作为 CLI 入口顺序执行全部看板离线契约测试，输出耗时摘要并以 0/1 退出码反馈结果
 * [POS]: test-utils 的统一测试运行器，供本地回归与 .github/workflows/ci.yml 共用，避免新增看板遗漏接入
 * [PROTOCOL]: Update this header on change, then check GEMINI.md
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const REPO_ROOT = path.resolve(__dirname, '..');
const DASHBOARDS_DIR = path.join(REPO_ROOT, 'dashboards');

// -- 自动发现 dashboards/*/*.test.cjs --
const sortNames = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function discoverSuites(dashboardsDir) {
  if (!fs.existsSync(dashboardsDir)) return [];
  const dirs = fs.readdirSync(dashboardsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(sortNames);

  return dirs.flatMap((dirName) => {
    const dirPath = path.join(dashboardsDir, dirName);
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.test.cjs'))
      .map((entry) => entry.name)
      .sort(sortNames)
      .map((fileName) => path.join(dirPath, fileName));
  });
}

// -- 顺序执行并汇总结果 --
function main() {
  const suites = discoverSuites(DASHBOARDS_DIR);
  if (suites.length === 0) {
    console.error('FAIL: no dashboard test suites found under dashboards/*/*.test.cjs');
    process.exit(1);
  }

  const totalStart = performance.now();
  let passed = 0;
  let failed = 0;

  for (const testPath of suites) {
    const relPath = path.relative(REPO_ROOT, testPath).split(path.sep).join('/');
    const start = performance.now();
    const res = spawnSync(process.execPath, [testPath], { cwd: REPO_ROOT, encoding: 'utf8' });
    const ms = Math.round(performance.now() - start);

    if (res.stdout) process.stdout.write(res.stdout.endsWith('\n') ? res.stdout : `${res.stdout}\n`);
    if (!res.error && res.status === 0) {
      passed += 1;
      console.log(`[PASS] ${relPath} (${ms}ms)`);
    } else {
      failed += 1;
      if (res.stderr) process.stderr.write(res.stderr.endsWith('\n') ? res.stderr : `${res.stderr}\n`);
      if (res.error) console.error(res.error.message);
      console.error(`[FAIL] ${relPath} (${ms}ms)`);
    }
  }

  const totalMs = Math.round(performance.now() - totalStart);
  if (failed > 0) {
    console.error(`FAIL: ${passed}/${suites.length} dashboard suites passed (${failed} failed) in ${totalMs}ms`);
    process.exit(1);
  }
  console.log(`ALL PASS: ${passed}/${suites.length} dashboard suites passed in ${totalMs}ms`);
}

main();
