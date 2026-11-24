/**
 * [INPUT]: depends on ../../test-utils/metrixbar-assert.cjs, node:path, node:vm, node:assert/strict, and sibling antigravity.bar
 * [OUTPUT]: 无导出，直接执行 Antigravity v1.4.1 看板离线契约测试并以进程退出码反馈结果
 * [POS]: dashboards/antigravity 的离线回归验证入口（22 项离线契约检查），复用共享契约断言库覆盖凭据/轮询、双环/PaceBar/A2 胶囊/SQLite 趋势、Weekly 短时突发预测平滑、多表面契约、严格 Widget 子集、richTray 原生双行富托盘及自定义低额度阈值/预测提前耗尽刘海预警
 * [PROTOCOL]: Update this header on change, then check GEMINI.md
 */
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {
  extractBarScript,
  flatten,
  textOf,
  validatePanelTree,
  validateWidgetTree,
  validateTrayContent,
  validateViewContract,
} = require('../../test-utils/metrixbar-assert.cjs');

const { rawXml, script: source } = extractBarScript(path.join(__dirname, 'antigravity.bar'));

const futureIso = new Date(Date.now() + (6 * 86400 + 4 * 3600 + 300) * 1000).toISOString();
const shortIso = new Date(Date.now() + (3 * 3600 + 1200) * 1000).toISOString();

const fixtureModels = {
  agentModelSorts: [
    { groups: [{ modelIds: ['gemini-4-argon-high', 'gemini-4-carbon-high', 'claude-opus-5-5-high'] }] },
  ],
  models: {
    'tab_flash_lite_preview': { displayName: 'Tab Flash Lite Preview', quotaInfo: { remainingFraction: 1 } },
    'gemini-2.5-pro': { displayName: 'Gemini 2.5 Pro', quotaInfo: { remainingFraction: 0.85, resetTime: futureIso } },
    'gemini-3.1-flash': { displayName: 'Gemini 3.1 Flash', quotaInfo: { remainingFraction: 0.85, resetTime: futureIso } },
    'gemini-4-argon-high': { displayName: 'Gemini 4 Argon (High)', quotaInfo: { remainingFraction: 0.85, resetTime: futureIso } },
    'gemini-4-carbon-high': { displayName: 'Gemini 4 Carbon (High)', quotaInfo: { remainingFraction: 0.85, resetTime: futureIso } },
    'claude-opus-5-5-high': { displayName: 'Claude Opus 5.5 (High)', quotaInfo: { remainingFraction: 0.42, resetTime: shortIso } },
    'internal-no-quota': { displayName: 'No Quota Model' },
    'hidden-internal': { isInternal: true, quotaInfo: { remainingFraction: 0.9, resetTime: futureIso } },
  },
};

function createMockSqlite(seed = []) {
  const rows = seed.map(r => ({ ...r }));
  return {
    rows,
    prepare(sql) {
      const exec = (params = []) => {
        const s = sql.trim();
        if (s.startsWith('CREATE TABLE')) return { run: async () => ({}) };
        if (s.startsWith('INSERT OR REPLACE INTO samples')) {
          const [acct, bucket, cycle, ts, left_pct] = params;
          const idx = rows.findIndex(r => r.acct === acct && r.bucket === bucket && r.ts === ts);
          if (idx >= 0) rows.splice(idx, 1);
          rows.push({ acct, bucket, cycle, ts, left_pct });
          return { run: async () => ({}) };
        }
        if (s.startsWith('DELETE FROM samples WHERE ts < ?')) {
          const [cutoff] = params;
          for (let i = rows.length - 1; i >= 0; i--) if (rows[i].ts < cutoff) rows.splice(i, 1);
          return { run: async () => ({}) };
        }
        if (s.startsWith('SELECT cycle, left_pct FROM samples')) {
          const [acct, bucket] = params;
          const hit = rows.filter(r => r.acct === acct && r.bucket === bucket).sort((a, b) => b.ts - a.ts)[0] || null;
          return { first: async () => (hit ? { cycle: hit.cycle, left_pct: hit.left_pct } : null) };
        }
        if (s.startsWith('SELECT ts, left_pct FROM samples')) {
          const [acct, bucket, cycle] = params;
          const results = rows.filter(r => r.acct === acct && r.bucket === bucket && r.cycle === cycle).sort((a, b) => a.ts - b.ts).map(r => ({ ts: r.ts, left_pct: r.left_pct }));
          return { all: async () => ({ results }) };
        }
        if (s.startsWith('SELECT cycle, MIN(left_pct) AS left_pct FROM samples')) {
          const [acct, bucket, maxCycle, limit] = params;
          const byCycle = new Map();
          for (const r of rows) {
            if (r.acct === acct && r.bucket === bucket && r.cycle > 0 && r.cycle < maxCycle) {
              const prev = byCycle.get(r.cycle);
              if (prev === undefined || r.left_pct < prev) byCycle.set(r.cycle, r.left_pct);
            }
          }
          const results = [...byCycle.entries()].sort((a, b) => b[0] - a[0]).slice(0, limit).map(([cycle, left_pct]) => ({ cycle, left_pct }));
          return { all: async () => ({ results }) };
        }
        throw new Error(`Unexpected SQL in mock sqlite: ${sql}`);
      };
      return {
        run: () => exec([]).run(),
        bind: (...params) => exec(params),
      };
    },
  };
}

function setup(options = {}) {
  const requests = [];
  const copied = [];
  const toasts = [];
  const stats = { keychainCalls: 0, secretCalls: 0, fileCalls: 0 };
  const storage = new Map();
  const secrets = { ...(options.secrets || {}) };
  const mockDb = options.sqlite ? createMockSqlite(options.sqliteSeed || []) : null;
  const authContent =
    options.authContent !== undefined
      ? options.authContent
      : JSON.stringify({
          email: 'dev@example.invalid',
          access_token: 'synthetic-access-token',
          refresh_token: 'synthetic-refresh-token',
          project_id: 'proj-demo',
          expires_at: Date.now() + 3600e3,
        });

  const context = vm.createContext({
    URL, URLSearchParams, Map, Set, Date, JSON, Promise, AbortController,
    setTimeout, clearTimeout, atob, TextDecoder, Uint8Array,
    Blob: class FakeBlob { constructor(parts) { this.parts = parts; } },
    ClipboardItem: class FakeClipboardItem { constructor(map) { this.map = map; } },
    navigator: {
      languages: ['zh-CN', 'en-US'],
      clipboard: {
        write: async items => {
          const textBlob = items[0] && items[0].map && items[0].map['text/plain'];
          copied.push(textBlob ? textBlob.parts.join('') : '');
        },
      },
    },
    localStorage: {
      getItem: k => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
    },
    $metrix: {
      platform: options.platform || 'darwin',
      secret: name => {
        stats.secretCalls++;
        return options.asyncSecret ? Promise.resolve(secrets[name] || '') : (secrets[name] || '');
      },
      readFile: async p => {
        stats.fileCalls++;
        if (options.localFiles && Object.prototype.hasOwnProperty.call(options.localFiles, p)) {
          const val = options.localFiles[p];
          if (val instanceof Error) throw val;
          return val;
        }
        if (options.readFails) throw options.readError || new Error('ENOENT');
        return typeof authContent === 'function' ? authContent(p) : authContent;
      },
      readCredential: async (service, account) => {
        stats.keychainCalls++;
        if (options.keychainError) throw options.keychainError;
        if (options.keychainValue && service === 'gemini' && account === 'antigravity') return options.keychainValue;
        throw new Error('item could not be found');
      },
      caniuse: async cap => (typeof options.caniuse === 'function' ? Boolean(options.caniuse(cap)) : (options.caniuse && Object.prototype.hasOwnProperty.call(options.caniuse, cap) ? Boolean(options.caniuse[cap]) : (cap === 'sqlite' ? Boolean(mockDb) : false))),
      sqlite: mockDb ? { open: async () => mockDb } : undefined,
      outputs: () => ({ tray: true, panel: true, notch: options.notchState || 'compact', widget: { known: true, families: ['small', 'medium', 'large'] } }),
      invalidate: () => {},
      toast: msg => toasts.push(msg),
      openURL: () => {},
    },
    fetch: async (url, req) => {
      requests.push({ url, req });
      if (options.respond) {
        const custom = await options.respond(url, req, requests.length);
        if (custom === '__THROW__') throw new Error('offline');
        if (custom) {
          return {
            ok: !custom.__status || (custom.__status >= 200 && custom.__status < 300),
            status: custom.__status || 200,
            text: async () => JSON.stringify(custom),
          };
        }
      }
      if (url.endsWith(':loadCodeAssist')) {
        return { ok: true, status: 200, text: async () => JSON.stringify({ cloudaicompanionProject: 'proj-demo', currentTier: { id: 'free-tier' }, paidTier: { id: 'g1-pro-tier', name: 'Google AI Pro' } }) };
      }
      if (url.endsWith(':fetchAvailableModels')) {
        return { ok: true, status: 200, text: async () => JSON.stringify(fixtureModels) };
      }
      if (url.endsWith(':retrieveUserQuotaSummary')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            groups: [
              {
                displayName: 'Gemini Models',
                buckets: [
                  { bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.82, resetTime: futureIso },
                  { bucketId: 'gemini-5h', window: '5h', remainingFraction: 0.73, resetTime: shortIso },
                ],
              },
              {
                displayName: 'Claude and GPT models',
                buckets: [
                  { bucketId: '3p-weekly', window: 'weekly', remainingFraction: 0.95, resetTime: futureIso },
                  { bucketId: '3p-5h', window: '5h', remainingFraction: 0.42, resetTime: shortIso },
                ],
              },
            ],
          }),
        };
      }
      if (url === 'https://oauth2.googleapis.com/token') {
        return { ok: true, status: 200, text: async () => JSON.stringify({ access_token: 'refreshed-access-token', expires_in: 3600 }) };
      }
      if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
        return { ok: true, status: 200, text: async () => JSON.stringify({ email: 'keychain-user@example.invalid' }) };
      }
      return { ok: false, status: 404, text: async () => '{}' };
    },
    console,
  });

  vm.runInContext(source.replace('export default {', 'globalThis.dashboard = {'), context);
  const env = {
    inputs: {
      authFile: '~/.antigravity/auth.json',
      endpoint: 'auto',
      accountIndex: 0,
      notchActivity: true,
      ...(options.inputs || {}),
    },
    viewport: options.viewport || { width: 540, height: 620 },
  };
  return {
    context,
    env,
    requests,
    copied,
    toasts,
    stats,
    run: (reason = 'interval') => context.dashboard.scheduled({ ...env, reason }),
    event: (name, payload) => context.dashboard.event(name, payload),
    render: () => context.dashboard.render(env),
    call: expr => vm.runInContext(expr, context),
  };
}

(async () => {
  // 1. Overview, dual 5H + WEEKLY grouped buckets, deduplicated preview, and privacy
  const s = setup({ notchState: 'expanded' });
  await s.run();
  const view = s.render();
  validateViewContract(view, {
    requireWidget: true,
    requireNotch: true,
    forbidSecrets: ['synthetic-access-token', 'synthetic-refresh-token'],
  });
  assert.equal(view.tray.title, '42%');
  assert.equal(view.tray.error, '');
  assert.equal(s.call('snapshot.models.length'), 6);
  assert.equal(s.call('snapshot.groups.length'), 2);
  assert.equal(s.call('snapshot.buckets.length'), 4);
  assert.equal(s.call('snapshot.plan'), 'AI Pro');
  assert.equal(s.call('snapshot.origin'), 'https://daily-cloudcode-pa.googleapis.com');
  const serialized = JSON.stringify(view);
  assert(!serialized.includes('synthetic-access-token'), 'access token must never leak');
  assert(!serialized.includes('synthetic-refresh-token'), 'refresh token must never leak');
  assert(serialized.includes('Gemini Models') && serialized.includes('Claude and GPT models'));
  assert(serialized.includes('5H') && serialized.includes('WEEKLY'));
  assert(serialized.includes('73%') && serialized.includes('82%'));
  assert(serialized.includes('Gemini 4 Argon, Gemini 4 Carbon'));
  assert(!serialized.includes('(4 个模型)'), 'expand toggle must not repeat count');
  const geminiBuckets = Array.from(s.call('snapshot.groups[0].buckets.map(b => b.label)'));
  assert.deepEqual(geminiBuckets, ['5H', 'WEEKLY']);
  assert(view.widget && view.widget.small && view.widget.medium && view.widget.large);
  assert(view.notch && view.notch.compact && view.notch.minimal && view.notch.expanded);

  // 2. macOS agy Keychain (go-keyring-base64:) auto-read fallback when authFile does not exist
  const agyPayload = JSON.stringify({
    token: { access_token: 'kc-access-token', refresh_token: 'kc-refresh', expiry: new Date(Date.now() + 3600e3).toISOString() },
    auth_method: 'consumer',
    id_token_email: 'agy@example.invalid',
  });
  const kc = setup({
    readFails: true,
    keychainValue: 'go-keyring-base64:' + Buffer.from(agyPayload, 'utf8').toString('base64'),
  });
  await kc.run();
  const kcView = kc.render();
  validateViewContract(kcView, { requireWidget: true, requireNotch: true, forbidSecrets: ['kc-access-token', 'kc-refresh'] });
  assert.equal(kcView.tray.title, '42%');
  assert.equal(kc.call('snapshot.accountLabel'), 'agy@example.invalid');

  // 3. Grid view puts newest models first (agentModelSorts -> semantic version -> utility last), click copies ID, search filters
  const seg = flatten(view.panel).find(n => n.type === 'Segmented');
  seg.props.onChange('grid');
  const gridView = s.render();
  validatePanelTree(gridView.panel, 'grid.panel');
  const cards = flatten(gridView.panel).filter(n => n.props && String(n.props.key || '').startsWith('card-'));
  assert.equal(cards.length, 6);
  assert.deepEqual(cards.map(c => c.props.key), [
    'card-gemini-4-argon-high',
    'card-gemini-4-carbon-high',
    'card-claude-opus-5-5-high',
    'card-gemini-3.1-flash',
    'card-gemini-2.5-pro',
    'card-tab_flash_lite_preview',
  ]);
  cards[0].props.onClick();
  await new Promise(r => setTimeout(r, 10));
  assert.equal(s.copied[0], 'gemini-4-argon-high');
  const searchField = flatten(gridView.panel).find(n => n.type === 'SearchField');
  searchField.props.onChange('argon');
  assert.equal(flatten(s.render().panel).filter(n => n.props && String(n.props.key || '').startsWith('card-')).length, 1);
  searchField.props.onChange('nonexistent-model');
  assert(JSON.stringify(s.render().panel).includes('没有匹配'));
  searchField.props.onChange('');

  // 3b. Newest-first sorting without agentModelSorts relies on semantic version + utility demotion
  const verSort = setup({
    respond: async url => {
      if (url.endsWith(':fetchAvailableModels')) {
        return {
          models: {
            'tab_jump_flash_lite_preview': { displayName: 'Tab Jump Flash Lite Preview', quotaInfo: { remainingFraction: 1 } },
            'gemini-2.5-pro': { displayName: 'Gemini 2.5 Pro', quotaInfo: { remainingFraction: 0.8, resetTime: shortIso } },
            'gemini-3.1-flash': { displayName: 'Gemini 3.1 Flash', quotaInfo: { remainingFraction: 0.8, resetTime: shortIso } },
            'gemini-4-argon-high': { displayName: 'Gemini 4 Argon (High)', quotaInfo: { remainingFraction: 0.8, resetTime: shortIso } },
            'claude-opus-5-5-high': { displayName: 'Claude Opus 5.5 (High)', quotaInfo: { remainingFraction: 0.9, resetTime: shortIso } },
          },
        };
      }
    },
  });
  await verSort.run();
  assert.deepEqual(Array.from(verSort.call('snapshot.models.map(m => m.id)')), [
    'claude-opus-5-5-high',
    'gemini-4-argon-high',
    'gemini-3.1-flash',
    'gemini-2.5-pro',
    'tab_jump_flash_lite_preview',
  ]);

  // 4. Exhausted model/bucket (0%) triggers low-quota notch activity when summary is empty
  const exhausted = setup({
    respond: async url => {
      if (url.endsWith(':fetchAvailableModels')) {
        return { models: { 'gemini-4-neon-high': { displayName: 'Gemini 4 Neon (High)', quotaInfo: { resetTime: shortIso } } } };
      }
      if (url.endsWith(':retrieveUserQuotaSummary')) return { groups: [] };
    },
  });
  await exhausted.run();
  assert.equal(exhausted.render().tray.title, '0%');
  assert(exhausted.render().notch.activity && exhausted.render().notch.activity.expiresAt > Date.now());

  // 5. Summary-only fallback when fetchAvailableModels returns empty
  const summaryFallback = setup({
    respond: async url => {
      if (url.endsWith(':fetchAvailableModels')) return { models: {} };
    },
  });
  await summaryFallback.run();
  assert.equal(summaryFallback.render().tray.title, '42%');
  assert(JSON.stringify(summaryFallback.render().panel).includes('Gemini Models'));
  assert(JSON.stringify(summaryFallback.render().panel).includes('WEEKLY'));

  // 6. Auto endpoint fallback: daily fails with 503 -> prod succeeds
  const fallback = setup({
    respond: async url => {
      if (url.startsWith('https://daily-cloudcode-pa.googleapis.com')) return { __status: 503 };
    },
  });
  await fallback.run();
  assert.equal(fallback.render().tray.title, '42%');
  assert.equal(fallback.call('snapshot.origin'), 'https://cloudcode-pa.googleapis.com');

  // 7. Offline failure preserves last successful tray title and reports tray.error
  s.context.fetch = async () => { throw new Error('offline'); };
  await s.run();
  assert.equal(s.render().tray.title, '42%');
  assert(s.render().tray.error.includes('无法连接'));

  // 8. Token refresh on 401 + retry succeeds with oauthClientSecret
  let first401 = true;
  const renewed = setup({
    secrets: { oauthClientSecret: 'fixture-client-secret' },
    respond: async url => {
      if (url.endsWith(':fetchAvailableModels') && first401) { first401 = false; return { __status: 401 }; }
    },
  });
  await renewed.run();
  assert.equal(renewed.render().tray.title, '42%');
  assert.equal(renewed.requests.filter(r => r.url === 'https://oauth2.googleapis.com/token').length, 1);

  // 9. CC Switch agy_accounts.json object-map multi-account format + Ultra 5x tier
  const ccSwitch = setup({
    authContent: JSON.stringify({
      version: 1,
      accounts: {
        'sub-1': { sub: 'sub-1', email: 'first@example.invalid', credential: { token: { access_token: 'tok-1' } } },
        'sub-2': { sub: 'sub-2', email: 'second@example.invalid', credential: { token: { access_token: 'tok-2' } } },
      },
    }),
    inputs: { accountIndex: 1 },
    respond: async url => {
      if (url.endsWith(':loadCodeAssist')) {
        return { currentTier: { id: 'free-tier' }, paidTier: { id: 'g1-ultra-lite-tier', name: 'Google AI Ultra' } };
      }
    },
  });
  await ccSwitch.run();
  assert.equal(ccSwitch.call('snapshot.accountLabel'), 'second@example.invalid');
  assert.equal(ccSwitch.call('snapshot.plan'), 'AI Ultra 5x');
  assert(flatten(ccSwitch.render().panel).some(n => n.type === 'Select' && n.props.key === 'acct-select'));
  assert(JSON.stringify(ccSwitch.render().panel).includes('刚刚更新'));
  assert(!JSON.stringify(ccSwitch.render().panel).includes('刚刚前更新'));

  // 10. HTTP/1.1 TLS socket parser: Content-Length & Transfer-Encoding: chunked (UTF-8 + completion check)
  const parseHttpBytes = ccSwitch.call('parseHttpBytes');
  const clPayload = JSON.stringify({ ok: true, msg: '中文额度' });
  const clRaw = new TextEncoder().encode(
    `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(clPayload)}\r\n\r\n${clPayload}`
  );
  const clParsed = parseHttpBytes(clRaw);
  assert.equal(clParsed.status, 200);
  assert.equal(clParsed.complete, true);
  assert.deepEqual(JSON.parse(clParsed.text), { ok: true, msg: '中文额度' });

  const part1 = '{"ok":true,"note":"';
  const part2 = '测试完成"}';
  const chunkedPartial = new TextEncoder().encode(
    `HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n${Buffer.byteLength(part1).toString(16)}\r\n${part1}\r\n`
  );
  assert.equal(parseHttpBytes(chunkedPartial).complete, false);
  const chunkedFull = new TextEncoder().encode(
    `HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n${Buffer.byteLength(part1).toString(16)}\r\n${part1}\r\n${Buffer.byteLength(part2).toString(16)}\r\n${part2}\r\n0\r\n\r\n`
  );
  const chunkedParsed = parseHttpBytes(chunkedFull);
  assert.equal(chunkedParsed.status, 200);
  assert.equal(chunkedParsed.complete, true);
  assert.deepEqual(JSON.parse(chunkedParsed.text), { ok: true, note: '测试完成' });

  // 11. ~/.gemini silent file priority (freshest token, 0 Keychain calls), cachedAuth memory reuse,
  //     24h metadata cache -> 1 single retrieveUserQuotaSummary request on routine polls, and 5m expand cooldown
  assert(rawXml.includes('refresh="15m"'), 'default refresh interval must be 15m');
  assert(rawXml.includes('~/.gemini/jetski-standalone-oauth-token'), 'must declare jetski oauth file permission');
  assert(rawXml.includes('~/.gemini/antigravity-cli/antigravity-oauth-token'), 'must declare agy cli oauth file permission');

  const olderFile = JSON.stringify({
    token: { access_token: 'older-tok', expiry: new Date(Date.now() + 1800e3).toISOString() },
    id_token_email: 'older@example.invalid',
  });
  const newerFile = JSON.stringify({
    token: { access_token: 'newer-tok', expiry: new Date(Date.now() + 3600e3).toISOString() },
    id_token_email: 'newer@example.invalid',
  });
  const quiet = setup({
    inputs: { authFile: '' },
    readFails: true,
    localFiles: {
      '~/.gemini/antigravity-cli/antigravity-oauth-token': olderFile,
      '~/.gemini/jetski-standalone-oauth-token': newerFile,
    },
  });
  await quiet.run('initial');
  assert.equal(quiet.stats.keychainCalls, 0, 'must never touch Keychain when ~/.gemini token files exist');
  assert.equal(quiet.call('snapshot.accountLabel'), 'newer@example.invalid', 'must pick fresher ~/.gemini token');
  const firstFiles = quiet.stats.fileCalls;
  const firstSecrets = quiet.stats.secretCalls;
  quiet.requests.length = 0;

  // Routine poll #2 & #3: reuse cachedAuth in memory (0 file/secret/keychain reads) and send ONLY 1 request!
  await quiet.run('interval');
  await quiet.run('interval');
  assert.equal(quiet.stats.keychainCalls, 0);
  assert.equal(quiet.stats.fileCalls, firstFiles, 'cachedAuth must prevent repeated file reads while token is valid');
  assert.equal(quiet.stats.secretCalls, firstSecrets, 'cachedAuth must prevent repeated secret() calls while token is valid');
  assert.deepEqual(
    quiet.requests.map(r => r.url),
    [
      'https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary',
      'https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary',
    ],
    'routine grouped polls must send only 1 retrieveUserQuotaSummary request'
  );

  // Lifecycle expand: < 5m must NOT refresh; > 5m MUST refresh
  quiet.requests.length = 0;
  quiet.call('snapshot.fetchedAt = Date.now() - 120000');
  quiet.event('lifecycle', { type: 'expand' });
  await new Promise(r => setTimeout(r, 15));
  assert.equal(quiet.requests.length, 0, 'expand within 5m must not trigger upstream requests');
  quiet.call('snapshot.fetchedAt = Date.now() - 305000');
  quiet.event('lifecycle', { type: 'expand' });
  await new Promise(r => setTimeout(r, 15));
  assert.equal(quiet.requests.length, 1, 'expand after 5m triggers 1 summary refresh');

  // Sticky origin: transient network error on cached daily origin must NOT dual-hammer prod
  quiet.requests.length = 0;
  quiet.context.fetch = async url => {
    quiet.requests.push({ url });
    throw new Error('socket hang up');
  };
  await quiet.run('interval');
  assert.deepEqual(quiet.requests.map(r => r.url), ['https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary']);

  // 12. Async $metrix.secret(Promise) compatibility + cachedAuth reuse
  const asyncSec = setup({
    inputs: { authFile: '' },
    readFails: true,
    asyncSecret: true,
    secrets: {
      credentialsJSON: JSON.stringify({
        email: 'async-sec@example.invalid',
        access_token: 'async-sec-tok',
        expires_at: Date.now() + 3600e3,
      }),
    },
  });
  await asyncSec.run('initial');
  assert.equal(asyncSec.call('snapshot.accountLabel'), 'async-sec@example.invalid');
  const secCount = asyncSec.stats.secretCalls;
  await asyncSec.run('interval');
  assert.equal(asyncSec.stats.secretCalls, secCount);

  // 13. Precise error diagnostics & Keychain anti-popup guard on background intervals
  const kcDenied = setup({
    inputs: { authFile: '' },
    readFails: true,
    keychainError: new Error('User canceled / Permission denied (-128)'),
  });
  await kcDenied.run('initial');
  assert(kcDenied.render().tray.error.includes('系统钥匙串拒绝访问'));
  assert.equal(kcDenied.stats.keychainCalls, 1);
  await kcDenied.run('interval');
  assert.equal(kcDenied.stats.keychainCalls, 1, 'background interval must NOT re-prompt Keychain after failure');
  await kcDenied.run('manual');
  assert.equal(kcDenied.stats.keychainCalls, 2, 'manual refresh is allowed to retry Keychain');

  const kcMissing = setup({
    inputs: { authFile: '' },
    readFails: true,
    keychainError: new Error('The specified item could not be found in the keychain (-25300)'),
  });
  await kcMissing.run('initial');
  assert(kcMissing.render().tray.error.includes('未找到 agy 登录记录'));

  const filePerm = setup({
    inputs: { authFile: '~/custom/blocked.json' },
    readFails: true,
    readError: new Error('EACCES: permission denied'),
    keychainError: new Error('item could not be found'),
  });
  await filePerm.run('initial');
  assert(filePerm.render().tray.error.includes('无法读取指定的认证文件'));

  const expiredLocal = setup({
    inputs: { authFile: '' },
    readFails: true,
    localFiles: {
      '~/.gemini/jetski-standalone-oauth-token': JSON.stringify({
        token: { access_token: 'expired-tok', refresh_token: 'rt-no-secret', expiry: new Date(Date.now() - 60e3).toISOString() },
        id_token_email: 'exp@example.invalid',
      }),
    },
  });
  await expiredLocal.run('interval');
  assert(expiredLocal.render().tray.error.includes('登录令牌已过期'));
  assert.equal(expiredLocal.requests.length, 0, 'known-expired token without client_secret must not send doomed /v1internal requests');

  // 14. v1.4.1 layout contract: preferredWidth 420, HeroDualRings replaces old 3-tile SummaryStrip
  assert(rawXml.includes('version="1.4.1"'), 'bar XML must declare version 1.4.1');
  const v14 = setup({ notchState: 'expanded' });
  await v14.run('initial');
  const v14View = v14.render();
  assert.equal(v14View.panel.props.preferredWidth, 420, 'panel preferredWidth must be 420');
  assert.equal(v14View.panel.props.preferredHeight, undefined, 'panel must not lock preferredHeight');
  const v14PanelJson = JSON.stringify(v14View.panel);
  assert(!v14PanelJson.includes('有额度模型'), 'old 3-tile vanity SummaryStrip must be removed');
  const heroGrid = flatten(v14View.panel).find(n => n.props && n.props.key === 'hero-rings');
  assert(heroGrid && heroGrid.type === 'Grid' && heroGrid.props.columns === 2, 'HeroDualRings must render a 2-column Grid');
  const heroRings = flatten(heroGrid).filter(n => n.props && String(n.props.key || '').startsWith('ring-'));
  assert.deepEqual(heroRings.map(r => r.props.key), ['ring-3p-5h', 'ring-gemini-5h']);
  const heroCharts = flatten(heroGrid).filter(n => n.type === 'Chart' && n.props.type === 'pie');
  assert.equal(heroCharts.length, 2, 'HeroDualRings must render 2 pie donut Charts');
  assert(heroCharts.every(c => c.props.innerRadius === 0.8), 'Hero donut rings must use innerRadius 0.8');

  // 15. Hero ring & bucket row clicks switch trendKey and TrendSection active series/title
  const trendSegBefore = flatten(v14View.panel).find(n => n.type === 'Segmented' && n.props.key === 'trend-bucket');
  assert(trendSegBefore && trendSegBefore.props.value === '3p-5h', 'default trendKey must follow lead hero bucket');
  heroRings[1].props.onClick();
  assert.equal(v14.call('trendKey'), 'gemini-5h', 'clicking 2nd hero ring must update trendKey');
  const v14AfterRing = v14.render();
  const trendSecAfterRing = flatten(v14AfterRing.panel).find(n => n.props && n.props.key === 'trend-section');
  const trendSegAfterRing = flatten(trendSecAfterRing).find(n => n.type === 'Segmented' && n.props.key === 'trend-bucket');
  const trendChartAfterRing = flatten(trendSecAfterRing).find(n => n.type === 'Chart' && n.props.type === 'line');
  assert.equal(trendSegAfterRing.props.value, 'gemini-5h');
  assert(trendChartAfterRing && trendChartAfterRing.props.label.includes('Gemini') && trendChartAfterRing.props.label.includes('5H'));
  const weeklyRow = flatten(v14AfterRing.panel).find(n => n.props && n.props.key === 'b-gemini-weekly');
  assert(weeklyRow && typeof weeklyRow.props.onClick === 'function');
  weeklyRow.props.onClick();
  assert.equal(v14.call('trendKey'), 'gemini-weekly', 'clicking a bucket row must update trendKey');
  const v14AfterRow = v14.render();
  const trendSecAfterRow = flatten(v14AfterRow.panel).find(n => n.props && n.props.key === 'trend-section');
  const trendSegAfterRow = flatten(trendSecAfterRow).find(n => n.props && n.props.key === 'trend-bucket');
  assert.equal(trendSegAfterRow.props.value, 'gemini-weekly');
  assert(flatten(trendSecAfterRow).find(n => n.type === 'Chart' && n.props.type === 'line').props.label.includes('WEEKLY'));
  trendSegAfterRow.props.onChange('3p-weekly');
  assert.equal(v14.call('trendKey'), '3p-weekly', 'changing trend-bucket Segmented must update trendKey');

  // 16. PaceBar renders Even-Pace tick mark (width: 2, height: 10, leftPercent) on timed buckets & expanded notch
  const panelTicks = flatten(v14View.panel).filter(
    n => n.type === 'Box' && n.props.absolute === true && n.props.width === 2 && n.props.height === 10 && typeof n.props.leftPercent === 'number'
  );
  assert.equal(panelTicks.length, 4, 'all 4 timed buckets in grouped view must render an Even-Pace tick mark');
  assert(panelTicks.every(t => t.props.leftPercent >= 1 && t.props.leftPercent <= 99));
  const notchTicks = flatten(v14View.notch.expanded).filter(
    n => n.type === 'Box' && n.props.absolute === true && n.props.width === 2 && n.props.height === 10 && typeof n.props.leftPercent === 'number'
  );
  assert(notchTicks.length >= 2, 'expanded notch must render PaceBar Even-Pace ticks');

  // 17. Group drawer expansion renders A2 short readable model chips while clicking copies full model ID
  const geminiToggle = flatten(v14View.panel).find(n => n.props && n.props.key === 'toggle-sum-0-gemini');
  const claudeToggle = flatten(v14View.panel).find(n => n.props && n.props.key === 'toggle-sum-1-claude');
  assert(geminiToggle && claudeToggle, 'grouped view must render drawer toggles');
  geminiToggle.props.onClick();
  claudeToggle.props.onClick();
  const v14Expanded = v14.render();
  validatePanelTree(v14Expanded.panel, 'expanded.panel');
  const argonChip = flatten(v14Expanded.panel).find(n => n.props && n.props.key === 'chip-gemini-4-argon-high');
  const carbonChip = flatten(v14Expanded.panel).find(n => n.props && n.props.key === 'chip-gemini-4-carbon-high');
  const opusChip = flatten(v14Expanded.panel).find(n => n.props && n.props.key === 'chip-claude-opus-5-5-high');
  assert(argonChip && carbonChip && opusChip, 'expanded drawers must render model chips');
  assert.equal(textOf(argonChip), 'Argon High');
  assert.equal(textOf(carbonChip), 'Carbon High');
  assert.equal(textOf(opusChip), 'Opus 5.5 High');
  assert(!textOf(argonChip).includes('gemini-4-argon-high'), 'chip text must be concise human label, not raw ID');
  assert(argonChip.props.tooltip.includes('gemini-4-argon-high'), 'chip tooltip must include full model ID');
  argonChip.props.onClick();
  await new Promise(r => setTimeout(r, 10));
  assert.equal(v14.copied[0], 'gemini-4-argon-high', 'clicking A2 chip must still copy full model ID');

  // 18. SQLite disabled vs enabled: TrendChart works without SQLite; mock SQLite populates trends & PastCyclesChart
  const noDbTrendSec = flatten(v14View.panel).find(n => n.props && n.props.key === 'trend-section');
  const noDbLine = flatten(noDbTrendSec).find(n => n.type === 'Chart' && n.props.type === 'line');
  assert(noDbLine && noDbLine.props.series.length >= 2, 'TrendChart must render remaining + pace even without SQLite');
  assert(noDbLine.props.series.some(sr => sr.dashed === true), 'TrendChart must render dashed forecast without SQLite');
  assert(!flatten(noDbTrendSec).some(n => n.type === 'Chart' && n.props.type === 'bar'), 'no PastCyclesChart without SQLite history');

  const shortCycleMs = Math.round(Date.parse(shortIso));
  const fiveH = 5 * 3600e3;
  const withDb = setup({
    sqlite: true,
    sqliteSeed: [
      { acct: 'dev@example.invalid', bucket: 'bucket:3p-5h', cycle: shortCycleMs - 2 * fiveH, ts: shortCycleMs - 2 * fiveH - 600e3, left_pct: 35 },
      { acct: 'dev@example.invalid', bucket: 'bucket:3p-5h', cycle: shortCycleMs - fiveH, ts: shortCycleMs - fiveH - 600e3, left_pct: 12 },
      { acct: 'dev@example.invalid', bucket: 'bucket:3p-5h', cycle: shortCycleMs, ts: Date.now() - 45 * 60e3, left_pct: 68 },
    ],
  });
  await withDb.run('initial');
  const dbTrends = withDb.call('trends["bucket:3p-5h"]');
  assert(dbTrends && dbTrends.samples.length >= 2, 'SQLite must persist and reload current-cycle samples');
  assert.deepEqual(Array.from(dbTrends.past.map(p => p.left_pct)), [35, 12], 'past cycles must be ordered oldest-first');
  const dbView = withDb.render();
  const dbTrendSec = flatten(dbView.panel).find(n => n.props && n.props.key === 'trend-section');
  const dbLine = flatten(dbTrendSec).find(n => n.type === 'Chart' && n.props.type === 'line');
  const dbBar = flatten(dbTrendSec).find(n => n.type === 'Chart' && n.props.type === 'bar');
  assert(dbLine && dbLine.props.series.length === 3, 'SQLite TrendChart must include remaining, pace, and forecast series');
  assert(dbBar && dbBar.props.series[0].points.length === 2, 'PastCyclesChart must render bar chart for past cycles');
  assert.deepEqual(dbBar.props.series[0].points.map(p => p.y), [35, 12]);

  // 19. Multi-surface validateViewContract & Strict Widget Subset across loaded, SQLite, loading, error, and Windows states
  const loadingState = setup();
  const winState = setup({ platform: 'windows' });
  await winState.run('initial');
  for (const [label, stateView] of [
    ['loaded-darwin', v14View],
    ['loaded-sqlite', dbView],
    ['loading', loadingState.render()],
    ['error', kcMissing.render()],
    ['loaded-windows', winState.render()],
  ]) {
    validateViewContract(stateView, {
      requireWidget: true,
      requireNotch: true,
      forbidSecrets: ['synthetic-access-token', 'synthetic-refresh-token'],
    });
    for (const family of ['small', 'medium', 'large']) {
      assert(stateView.widget && stateView.widget[family], `${label}.widget.${family} must exist`);
      validateWidgetTree(stateView.widget[family], `${label}.${family}`);
    }
  }

  // 20. On-demand richTray (tray.content) & strict TrayContentRoot validator
  assert.equal(v14View.tray.content, undefined, 'tray.content must be undefined when richTray is off');
  const richOff = setup({ caniuse: { 'render.tray.content': true, 'render.tray.content.icon': true } });
  await richOff.run('initial');
  assert.equal(richOff.render().tray.content, undefined, 'richTray default false must keep tray.content undefined');
  const richOn = setup({ inputs: { richTray: true }, caniuse: { 'render.tray.content': true, 'render.tray.content.icon': true } });
  await richOn.run('initial');
  const richView = richOn.render();
  assert.equal(richView.tray.title, '42%', 'fallback tray.title must remain 42%');
  validateTrayContent(richView.tray.content, { allowIcon: true }, 'richTray.withIcon');
  validateViewContract(richView, {
    requireWidget: true,
    requireNotch: true,
    allowTrayIcon: true,
    forbidSecrets: ['synthetic-access-token', 'synthetic-refresh-token'],
  });
  const richNodes = flatten(richView.tray.content);
  assert(richNodes.some(n => n.type === 'Icon'), 'richTray with icon cap must include Icon');
  const richTexts = richNodes.filter(n => n.type === 'Text').map(n => n.props.text);
  assert(richTexts.includes('G 73%') && richTexts.includes('C 42%'), 'richTray must stack G 73% and C 42%');
  const richNoIcon = setup({ inputs: { richTray: true }, caniuse: { 'render.tray.content': true, 'render.tray.content.icon': false } });
  await richNoIcon.run('initial');
  const richNoIconView = richNoIcon.render();
  validateTrayContent(richNoIconView.tray.content, { allowIcon: false }, 'richTray.noIcon');
  validateViewContract(richNoIconView, {
    requireWidget: true,
    requireNotch: true,
    allowTrayIcon: false,
    forbidSecrets: ['synthetic-access-token', 'synthetic-refresh-token'],
  });
  assert(!flatten(richNoIconView.tray.content).some(n => n.type === 'Icon'), 'richTray without icon cap must omit Icon');

  // 21. Configurable lowQuotaThreshold & notchForecastAlert pace run-out warning
  const customThr = setup({ inputs: { lowQuotaThreshold: 50, notchForecastAlert: false } });
  await customThr.run('initial');
  assert(customThr.render().notch.activity && customThr.render().notch.activity.id.includes(':low:'), 'lowQuotaThreshold=50 must trigger :low: notch activity for 42%');
  assert.equal(customThr.call('quotaTone(42)'), 'warning', '42% must become warning tone when lowQuotaThreshold=50');
  const paceIso = new Date(Date.now() + 4 * 3600e3).toISOString();
  const fastBurnResp = async url => (url.endsWith(':retrieveUserQuotaSummary')
    ? { groups: [{ displayName: 'Claude and GPT models', buckets: [{ bucketId: '3p-5h', window: '5h', remainingFraction: 0.55, resetTime: paceIso }] }] }
    : url.endsWith(':fetchAvailableModels') ? { models: {} } : undefined);
  const paceWarn = setup({ inputs: { lowQuotaThreshold: 20, notchForecastAlert: true }, respond: fastBurnResp });
  await paceWarn.run('initial');
  assert(paceWarn.render().notch.activity && paceWarn.render().notch.activity.id.includes(':pace:'), 'fast burn (55% left, 80% window left) must trigger :pace: notch activity');
  const paceOff = setup({ inputs: { lowQuotaThreshold: 20, notchForecastAlert: false }, respond: fastBurnResp });
  await paceOff.run('initial');
  assert.equal(paceOff.render().notch.activity, undefined, 'notchForecastAlert=false must keep notch.activity undefined when 55% > 20%');

  // 22. Weekly short-burst forecast smoothing (minAge = spanMs/28 = 6h on 7d WEEKLY)
  const weekly6d12hMs = Date.now() + (6 * 24 + 12) * 3600e3;
  const weekly6d12hIso = new Date(weekly6d12hMs).toISOString();
  const weekly6d12hCycle = Math.round(Date.parse(weekly6d12hIso));
  const weekly6d12hResp = async url => (url.endsWith(':retrieveUserQuotaSummary')
    ? { groups: [{ displayName: 'Gemini Models', buckets: [{ bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.89, resetTime: weekly6d12hIso }] }] }
    : url.endsWith(':fetchAvailableModels') ? { models: {} } : undefined);
  const shortBurst = setup({
    sqlite: true,
    sqliteSeed: [{ acct: 'dev@example.invalid', bucket: 'bucket:gemini-weekly', cycle: weekly6d12hCycle, ts: Date.now() - 45 * 60e3, left_pct: 95 }],
    respond: weekly6d12hResp,
  });
  await shortBurst.run('initial');
  const burstFc = shortBurst.call('forecastBucket(snapshot.buckets[0])');
  assert(burstFc.rate < 1.2 / 3600e3, '45m-old weekly sample (< 6h minAge) must be ignored in favor of 12h cycle-start baseline');
  assert(!burstFc.runsOutMs || burstFc.runsOutMs - Date.now() > 3 * 86400e3, '45m burst on 6d 12h weekly bucket must not trigger false ~11h early run-out alarm');

  const steepOn6d12h = setup({
    sqlite: true,
    sqliteSeed: [{ acct: 'dev@example.invalid', bucket: 'bucket:gemini-weekly', cycle: weekly6d12hCycle, ts: Date.now() - 10 * 3600e3, left_pct: 100 }],
    respond: weekly6d12hResp,
  });
  await steepOn6d12h.run('initial');
  const steep6d12hFc = steepOn6d12h.call('forecastBucket(snapshot.buckets[0])');
  assert(steep6d12hFc.rate > 1.0 / 3600e3, '10h-old sample (>= 6h minAge) on 6d 12h weekly bucket must use recent 10h sample rate (~1.1%/h)');

  const weekly6dMs = Date.now() + 6 * 86400e3;
  const weekly6dIso = new Date(weekly6dMs).toISOString();
  const weekly6dCycle = Math.round(Date.parse(weekly6dIso));
  const weekly6dResp = async url => (url.endsWith(':retrieveUserQuotaSummary')
    ? { groups: [{ displayName: 'Gemini Models', buckets: [{ bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.89, resetTime: weekly6dIso }] }] }
    : url.endsWith(':fetchAvailableModels') ? { models: {} } : undefined);
  const smoothWeekly = setup({
    sqlite: true,
    sqliteSeed: [{ acct: 'dev@example.invalid', bucket: 'bucket:gemini-weekly', cycle: weekly6dCycle, ts: Date.now() - 45 * 60e3, left_pct: 95 }],
    respond: weekly6dResp,
  });
  await smoothWeekly.run('initial');
  assert.equal(smoothWeekly.call('forecastBucket(snapshot.buckets[0]).runsOutMs'), null, '45m-old sample (< 6h minAge) on ahead-of-pace weekly bucket must keep runsOutMs null');
  assert.equal(smoothWeekly.render().notch.activity, undefined, 'smoothed ahead-of-pace weekly bucket must not trigger false :pace: notch alert');

  const steep10h = setup({
    sqlite: true,
    sqliteSeed: [{ acct: 'dev@example.invalid', bucket: 'bucket:gemini-weekly', cycle: weekly6dCycle, ts: Date.now() - 10 * 3600e3, left_pct: 99 }],
    respond: weekly6dResp,
  });
  await steep10h.run('initial');
  const steepFc = steep10h.call('forecastBucket(snapshot.buckets[0])');
  assert(steepFc.runsOutMs && steepFc.runsOutMs < weekly6dMs, '10h-old sample (>= 6h minAge) showing steep burn must use recent sample rate and predict early run-out');
  assert(steep10h.render().notch.activity && steep10h.render().notch.activity.id.includes(':pace:'), 'sustained 10h steep weekly burn must trigger :pace: notch activity');

  console.log('PASS: v1.4.1 full contract suite (22 checks: shared test-utils contract, silent auth, 1-req polling, 420px HeroDualRings, PaceBar, A2 chips, SQLite trend/past, strict Widget subset, richTray, threshold/pace notch alerts, weekly short-burst smoothing)');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
