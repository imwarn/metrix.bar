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
  models: {
    'gemini-4-argon-high': { displayName: 'Gemini 4 Argon (High)', quotaInfo: { remainingFraction: 0.85, resetTime: futureIso } },
    'gemini-4-carbon-high': { displayName: 'Gemini 4 Carbon (High)', quotaInfo: { remainingFraction: 0.85, resetTime: futureIso } },
    'gemini-4-hydrogen-high': { displayName: 'Gemini 4 Hydrogen (High)', quotaInfo: { remainingFraction: 0.85, resetTime: futureIso } },
    'gemini-4-hydrogen-tiered-xhigh': { displayName: 'Gemini 4 Hydrogen (XHigh)', quotaInfo: { remainingFraction: 0.85, resetTime: futureIso } },
    'gemini-4-neon-high': { displayName: 'Gemini 4 Neon (High)', quotaInfo: { remainingFraction: 0.85, resetTime: futureIso } },
    'claude-sonnet-4': { displayName: 'Claude Sonnet 4', quotaInfo: { remainingFraction: 0.42, resetTime: shortIso } },
    'internal-no-quota': { displayName: 'No Quota Model' },
    'hidden-internal': { isInternal: true, quotaInfo: { remainingFraction: 0.9, resetTime: futureIso } },
  },
};

function setup(options = {}) {
  const requests = [];
  const copied = [];
  const toasts = [];
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
    Blob: class FakeBlob {
      constructor(parts) { this.parts = parts; }
    },
    ClipboardItem: class FakeClipboardItem {
      constructor(map) { this.map = map; }
    },
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
      secret: name => secrets[name] || '',
      readFile: async p => {
        if (options.readFails) throw new Error('ENOENT');
        return typeof authContent === 'function' ? authContent(p) : authContent;
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
        return { ok: true, status: 200, text: async () => JSON.stringify({ cloudaicompanionProject: 'proj-demo', currentTier: { id: 'pro', name: 'Google AI Pro' } }) };
      }
      if (url.endsWith(':fetchAvailableModels')) {
        return { ok: true, status: 200, text: async () => JSON.stringify(fixtureModels) };
      }
      if (url === 'https://oauth2.googleapis.com/token') {
        return { ok: true, status: 200, text: async () => JSON.stringify({ access_token: 'refreshed-access-token', expires_in: 3600 }) };
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
    run: () => context.dashboard.scheduled(env),
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
  // 1. Overview, quota filtering, smart grouping, and privacy
  const s = setup({ notchState: 'expanded' });
  await s.run();
  const view = s.render();
  assert.equal(view.tray.title, '42%');
  assert.equal(view.tray.error, '');
  assert.equal(s.call('snapshot.models.length'), 6); // excludes internal-no-quota and hidden-internal
  assert.equal(s.call('snapshot.groups.length'), 2); // Claude (42%) + Gemini 4 bucket (85%, 5 models)
  assert.equal(s.call('snapshot.plan'), 'Pro');
  const serialized = JSON.stringify(view);
  assert(!serialized.includes('synthetic-access-token'), 'access token must never leak into view');
  assert(!serialized.includes('synthetic-refresh-token'), 'refresh token must never leak into view');
  assert(serialized.includes('Gemini 4'));
  assert(serialized.includes('Claude Sonnet 4'));
  assert(serialized.includes('85%'));
  assert(serialized.includes('6d 4h'));
  assert(view.widget && view.widget.small && view.widget.medium && view.widget.large);
  assert(view.notch && view.notch.compact && view.notch.minimal && view.notch.expanded);

  // 2. Switch to screenshot-style grid view & click card to select + copy ID
  const seg = flatten(view.panel).find(n => n.type === 'Segmented');
  assert(seg, 'view mode Segmented control should exist');
  seg.props.onChange('grid');
  const gridView = s.render();
  const cards = flatten(gridView.panel).filter(n => n.props && String(n.props.key || '').startsWith('card-'));
  assert.equal(cards.length, 6);
  cards[0].props.onClick();
  await new Promise(r => setTimeout(r, 10));
  assert.equal(s.copied[0], 'claude-sonnet-4');

  // 3. Search filtering & empty match
  const searchField = flatten(gridView.panel).find(n => n.type === 'SearchField');
  searchField.props.onChange('argon');
  assert.equal(flatten(s.render().panel).filter(n => n.props && String(n.props.key || '').startsWith('card-')).length, 1);
  searchField.props.onChange('nonexistent-model');
  assert(JSON.stringify(s.render().panel).includes('没有匹配'));
  searchField.props.onChange('');

  // 4. Exhausted model (omitted remainingFraction + valid resetTime => 0%) triggers low-quota notch activity
  const exhausted = setup({
    respond: async url => {
      if (url.endsWith(':fetchAvailableModels')) {
        return { models: { 'gemini-4-neon-high': { displayName: 'Gemini 4 Neon (High)', quotaInfo: { resetTime: shortIso } } } };
      }
    },
  });
  await exhausted.run();
  assert.equal(exhausted.render().tray.title, '0%');
  assert(exhausted.render().notch.activity && exhausted.render().notch.activity.expiresAt > Date.now());

  // 5. Offline failure keeps last successful tray title and sets tray.error
  s.context.fetch = async () => { throw new Error('offline'); };
  await s.run();
  assert.equal(s.render().tray.title, '42%');
  assert(s.render().tray.error.includes('无法连接'));

  // 6. Auto endpoint fallback: prod fails with 503 -> daily succeeds
  const fallback = setup({
    respond: async url => {
      if (url.startsWith('https://cloudcode-pa.googleapis.com')) return { __status: 503 };
    },
  });
  await fallback.run();
  assert.equal(fallback.render().tray.title, '42%');
  assert.equal(fallback.call('snapshot.origin'), 'https://daily-cloudcode-pa.googleapis.com');

  // 7. Token refresh on 401 + retry succeeds when client_id is configured
  let first401 = true;
  const renewed = setup({
    inputs: { oauthClientId: 'fixture-client-id' },
    secrets: { oauthClientSecret: 'fixture-client-secret' },
    respond: async url => {
      if (url.endsWith(':fetchAvailableModels') && first401) {
        first401 = false;
        return { __status: 401 };
      }
    },
  });
  await renewed.run();
  assert.equal(renewed.render().tray.title, '42%');
  assert.equal(renewed.requests.filter(r => r.url === 'https://oauth2.googleapis.com/token').length, 1);

  // 8. Multi-account JSON supports Select switching
  const multi = setup({
    authContent: JSON.stringify({
      version: 3,
      activeIndex: 1,
      accounts: [
        { email: 'first@example.invalid', access_token: 'tok-1', project_id: 'p1' },
        { email: 'second@example.invalid', access_token: 'tok-2', project_id: 'p2' },
      ],
    }),
    inputs: { accountIndex: 1 },
  });
  await multi.run();
  assert.equal(multi.call('snapshot.accountLabel'), 'second@example.invalid');
  assert(flatten(multi.render().panel).some(n => n.type === 'Select' && n.props.key === 'acct-select'));

  console.log('PASS: quota filtering, grouping, grid view, copy, search, exhausted 0%, offline cache, endpoint fallback, 401 OAuth renewal, multi-account, notch & widgets');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
