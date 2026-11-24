/**
 * [INPUT]: 依赖 node:fs、node:path、node:vm、node:assert/strict 及同目录 antigravity.bar
 * [OUTPUT]: 无导出，直接执行 Antigravity 看板离线契约测试并以进程退出码反馈结果
 * [POS]: dashboards/antigravity 的离线回归验证入口，可从仓库根目录或本目录直接运行
 * [PROTOCOL]: Update this header on change, then check GEMINI.md
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs
  .readFileSync(path.join(__dirname, 'antigravity.bar'), 'utf8')
  .match(/<script[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/script>/)[1];

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

function setup(options = {}) {
  const requests = [];
  const copied = [];
  const toasts = [];
  const stats = { keychainCalls: 0, secretCalls: 0, fileCalls: 0 };
  const storage = new Map();
  const secrets = { ...(options.secrets || {}) };
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
    URL,
    URLSearchParams,
    Map,
    Set,
    Date,
    JSON,
    Promise,
    AbortController,
    setTimeout,
    clearTimeout,
    atob,
    TextDecoder,
    Uint8Array,
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
      platform: 'darwin',
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
      caniuse: async () => false,
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

function flatten(node, out = []) {
  if (node && typeof node === 'object') {
    out.push(node);
    for (const c of node.children || []) flatten(c, out);
  }
  return out;
}

(async () => {
  // 1. Overview, dual 5H + WEEKLY grouped buckets, deduplicated preview, and privacy
  const s = setup({ notchState: 'expanded' });
  await s.run();
  const view = s.render();
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
  assert.equal(kc.render().tray.title, '42%');
  assert.equal(kc.call('snapshot.accountLabel'), 'agy@example.invalid');
  assert(!JSON.stringify(kc.render()).includes('kc-access-token'));

  // 3. Grid view puts newest models first (agentModelSorts -> semantic version -> utility last), click copies ID, search filters
  const seg = flatten(view.panel).find(n => n.type === 'Segmented');
  seg.props.onChange('grid');
  const gridView = s.render();
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
  const rawXml = fs.readFileSync(path.join(__dirname, 'antigravity.bar'), 'utf8');
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

  console.log('PASS: v1.3.0 ~/.gemini silent auth, cachedAuth anti-popup, async secret, precise diagnostics, 1-request polling, 24h meta cache, sticky origin, 5H+WEEKLY & newest-first grid');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
