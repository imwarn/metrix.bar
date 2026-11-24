/**
 * [INPUT]: 依赖 window.AGY_SHARED（AgyIcon、PaceBar、TrendChartSVG、PastCyclesSVG、toneColor）及外部传入的 { data, settings, onCopy }
 * [OUTPUT]: 导出 window.VariantBLinear 极简线性节奏风主面板 React 组件
 * [POS]: designs/antigravity-ui 面板方案 B（与 variant-a、variant-c 并列），零环形与零嵌套卡片的排版优先线性节奏布局
 * [PROTOCOL]: Update this header on change, then check GEMINI.md
 */
(function initVariantBLinear() {
  const { useState, useMemo, useEffect, useRef } = React;

  // ─────────────────────────────────────────────────────────────
  // 局部样式注入（仅使用 vb- 类前缀与 --agy-* 语义变量）
  // ─────────────────────────────────────────────────────────────

  function ensureVariantBStyleTag() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('vb-linear-styles')) return;
    const el = document.createElement('style');
    el.id = 'vb-linear-styles';
    el.textContent = `
      @keyframes vb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes vb-shimmer { 0%, 100% { opacity: 0.42; } 50% { opacity: 0.82; } }
      .vb-panel { width: 100%; background: var(--agy-bg); color: var(--agy-text); font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Helvetica Neue", sans-serif; font-size: 13px; line-height: 1.4; -webkit-font-smoothing: antialiased; box-sizing: border-box; }
      .vb-panel *, .vb-panel *::before, .vb-panel *::after { box-sizing: border-box; }
      .vb-tnum { font-variant-numeric: tabular-nums; }
      .vb-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .vb-spin { display: inline-flex; animation: vb-spin 850ms linear infinite; }
      .vb-bone { background: var(--agy-surface-hover); border-radius: 5px; animation: vb-shimmer 1.4s ease-in-out infinite; }
      .vb-header { display: flex; align-items: center; gap: 5px; padding: 10px 10px 9px 12px; border-bottom: 1px solid var(--agy-border); min-width: 0; overflow: hidden; }
      .vb-brand { font-size: 13.5px; font-weight: 650; letter-spacing: -0.01em; white-space: nowrap; flex-shrink: 0; }
      .vb-plan-badge { font-size: 9.5px; font-weight: 650; letter-spacing: 0.01em; white-space: nowrap; flex-shrink: 0; padding: 1.5px 5px; border-radius: 4px; background: var(--agy-accent); color: var(--agy-accent-text); }
      .vb-acct-chip { display: inline-flex; align-items: center; gap: 3px; flex: 0 1 auto; min-width: 0; max-width: 118px; overflow: hidden; padding: 2px 6px; border-radius: 5px; border: 1px solid transparent; background: var(--agy-surface-hover); color: var(--agy-muted); font-size: 10px; line-height: 1.3; font-family: inherit; cursor: pointer; transition: background 120ms ease, color 120ms ease, border-color 120ms ease; }
      .vb-acct-chip:hover { color: var(--agy-text); border-color: var(--agy-border); }
      .vb-header-actions { display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0; }
      .vb-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; border: none; padding: 0; flex-shrink: 0; background: transparent; color: var(--agy-muted); cursor: pointer; transition: background 120ms ease, color 120ms ease; }
      .vb-icon-btn:hover { background: var(--agy-surface-hover); color: var(--agy-text); }
      .vb-icon-btn:active { background: var(--agy-surface-pressed, var(--agy-surface-hover)); }
      .vb-icon-btn[data-active="true"] { background: var(--agy-accent-subtle); color: var(--agy-accent); }
      .vb-body { padding: 11px 14px 12px; display: flex; flex-direction: column; gap: 10px; }
      .vb-banner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 3px 8px; padding: 6.5px 10px; border-radius: 7px; }
      .vb-banner-urgent { cursor: pointer; }
      .vb-banner-healthy { background: var(--agy-surface-hover); font-size: 11px; }
      .vb-dot { width: 6px; height: 6px; border-radius: 999px; flex-shrink: 0; }
      .vb-search-wrap { display: flex; align-items: center; gap: 6px; height: 28px; padding: 0 9px; border-radius: 7px; background: var(--agy-surface-hover); border: 1px solid transparent; transition: border-color 120ms ease, background 120ms ease; }
      .vb-search-wrap:focus-within { border-color: var(--agy-accent); background: var(--agy-surface); }
      .vb-search-input { flex: 1; min-width: 0; border: none; outline: none; padding: 0; background: transparent; color: var(--agy-text); font-size: 11.5px; font-family: inherit; }
      .vb-search-input::placeholder { color: var(--agy-muted); opacity: 0.82; }
      .vb-clear-btn { border: none; background: transparent; color: var(--agy-muted); font-size: 12px; line-height: 1; cursor: pointer; padding: 0 2px; }
      .vb-clear-btn:hover { color: var(--agy-text); }
      .vb-family { display: flex; flex-direction: column; gap: 8px; padding: 10px 0; border-top: 1px solid var(--agy-border); }
      .vb-family:first-child { padding-top: 2px; border-top: none; }
      .vb-family:last-child { padding-bottom: 2px; }
      .vb-family-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .vb-family-title { font-size: 12.5px; font-weight: 650; color: var(--agy-text); white-space: nowrap; }
      .vb-family-count { font-size: 10.5px; color: var(--agy-muted); white-space: nowrap; }
      .vb-summary-pill { font-size: 10px; font-weight: 600; padding: 1.5px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
      .vb-track-grid { display: grid; gap: 10px; align-items: stretch; }
      .vb-track-grid[data-cols="2"] { grid-template-columns: 1fr 1px 1fr; gap: 12px; }
      .vb-track-divider { width: 1px; background: var(--agy-border); margin: 2px 0; }
      .vb-track-col { position: relative; display: flex; flex-direction: column; gap: 5px; min-width: 0; padding: 4px 6px; margin: -4px -6px; border-radius: 7px; cursor: pointer; transition: background 120ms ease; }
      .vb-track-col:hover { background: var(--agy-surface-hover); }
      .vb-track-col[data-selected="true"]::after { content: ""; position: absolute; left: 6px; right: 6px; bottom: 0; height: 1.5px; border-radius: 1px; background: var(--agy-accent); opacity: 0.65; }
      .vb-track-top { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
      .vb-big-pct { font-size: 22px; font-weight: 650; line-height: 1.05; letter-spacing: -0.025em; }
      .vb-win-badge { font-size: 9.5px; font-weight: 650; letter-spacing: 0.04em; flex-shrink: 0; padding: 1.5px 5px; border-radius: 4px; background: var(--agy-surface-hover); color: var(--agy-muted); }
      .vb-track-meta { display: flex; align-items: center; justify-content: space-between; gap: 4px; font-size: 10.5px; line-height: 1.25; }
      .vb-track-reset { display: flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--agy-muted); margin-top: 1px; }
      .vb-toggle-row { display: flex; align-items: center; gap: 5px; width: 100%; padding: 3px 0 0; border: none; background: transparent; color: var(--agy-muted); font-size: 11px; font-family: inherit; cursor: pointer; text-align: left; transition: color 120ms ease; }
      .vb-toggle-row:hover { color: var(--agy-text); }
      .vb-tier-list { display: flex; flex-direction: column; gap: 6px; padding-top: 2px; }
      .vb-tier-label { font-size: 10px; font-weight: 600; color: var(--agy-muted); letter-spacing: 0.01em; }
      .vb-pill-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
      .vb-model-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 5px; font-size: 10.5px; line-height: 1.35; font-family: inherit; border: 1px solid var(--agy-border); background: var(--agy-surface); color: var(--agy-text); cursor: pointer; transition: background 110ms ease, border-color 110ms ease, color 110ms ease; }
      .vb-model-pill:hover { background: var(--agy-accent-subtle); border-color: var(--agy-accent); color: var(--agy-accent); }
      .vb-model-pill[data-copied="true"] { background: var(--agy-accent); border-color: var(--agy-accent); color: var(--agy-accent-text); }
      .vb-search-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; cursor: pointer; transition: background 110ms ease; }
      .vb-search-row:hover { background: var(--agy-surface-hover); }
      .vb-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .vb-chart-section { border-top: 1px solid var(--agy-border); padding-top: 10px; display: flex; flex-direction: column; gap: 7px; }
      .vb-chart-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .vb-chart-pills { display: flex; flex-wrap: wrap; gap: 3px; }
      .vb-chart-pill { display: inline-flex; align-items: center; justify-content: center; padding: 2.5px 5.5px; border-radius: 5px; border: 1px solid transparent; background: transparent; color: var(--agy-muted); font-size: 10px; font-weight: 500; letter-spacing: -0.01em; font-family: inherit; white-space: nowrap; cursor: pointer; transition: background 120ms ease, color 120ms ease, border-color 120ms ease; }
      .vb-chart-pill:hover { background: var(--agy-surface-hover); color: var(--agy-text); }
      .vb-chart-pill[data-active="true"] { background: var(--agy-accent-subtle); color: var(--agy-accent); font-weight: 600; border-color: color-mix(in srgb, var(--agy-accent) 28%, transparent); }
      .vb-problem { padding: 32px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; }
      .vb-retry-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 14px; border-radius: 6px; border: 1px solid var(--agy-border); background: var(--agy-surface); color: var(--agy-text); font-size: 12px; font-weight: 500; font-family: inherit; cursor: pointer; transition: background 120ms ease, border-color 120ms ease; }
      .vb-retry-btn:hover { background: var(--agy-surface-hover); border-color: var(--agy-accent); }
      .vb-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 14px; border-top: 1px solid var(--agy-border); font-size: 10px; color: var(--agy-muted); }
    `;
    document.head.appendChild(el);
  }

  // ─────────────────────────────────────────────────────────────
  // 语义色、时间解析与分组辅助函数
  // ─────────────────────────────────────────────────────────────

  function vbResolveTone(tone, leftPct) {
    if (tone === 'danger' || tone === 'warning' || tone === 'success' || tone === 'accent') return tone;
    const pct = Number.isFinite(leftPct) ? leftPct : 100;
    return pct <= 10 ? 'danger' : pct <= 30 ? 'warning' : 'success';
  }

  function vbToneCss(shared, tone, leftPct) {
    const resolved = vbResolveTone(tone, leftPct);
    if (shared && typeof shared.toneColor === 'function') {
      const val = shared.toneColor(resolved);
      if (typeof val === 'string' && val) return val;
    }
    return resolved === 'danger'
      ? 'var(--agy-danger)'
      : resolved === 'warning'
        ? 'var(--agy-warning)'
        : resolved === 'accent'
          ? 'var(--agy-accent)'
          : 'var(--agy-success)';
  }

  const vbFmtPct = (v) => (Number.isFinite(v) ? `${Math.round(v)}%` : '—');

  function vbParseCountdownMinutes(text) {
    if (!text) return Number.POSITIVE_INFINITY;
    let mins = 0;
    const d = /(\d+)\s*d/i.exec(text);
    const h = /(\d+)\s*h/i.exec(text);
    const m = /(\d+)\s*m/i.exec(text);
    if (d) mins += Number(d[1]) * 1440;
    if (h) mins += Number(h[1]) * 60;
    if (m) mins += Number(m[1]);
    return mins > 0 ? mins : Number.POSITIVE_INFINITY;
  }

  function vbPaceDeltaMeta(bucket) {
    if (!bucket) return { text: '—', color: 'var(--agy-muted)' };
    if (bucket.leftPct <= 0) return { text: '窗口已耗尽', color: 'var(--agy-danger)' };
    const delta = Number.isFinite(bucket.paceDelta)
      ? Math.round(bucket.paceDelta)
      : Number.isFinite(bucket.paceLeftPct)
        ? Math.round(bucket.leftPct - bucket.paceLeftPct)
        : 0;
    if (delta <= -15) {
      return { text: `比匀速少 ${Math.abs(delta)}%`, color: bucket.leftPct <= 10 ? 'var(--agy-danger)' : 'var(--agy-warning)' };
    }
    if (delta < 0) return { text: `略快 ${Math.abs(delta)}%`, color: 'var(--agy-warning)' };
    if (delta >= 10) return { text: `充裕 +${delta}%`, color: 'var(--agy-success)' };
    return { text: `接近匀速 +${delta}%`, color: 'var(--agy-muted)' };
  }

  function vbPillFamilyName(bucket) {
    const raw = `${bucket.family || ''} ${bucket.groupKey || ''} ${bucket.groupTitle || ''} ${bucket.key || ''}`.toLowerCase();
    if (raw.includes('gemini')) return 'Gemini';
    if (raw.includes('3p') || raw.includes('claude') || raw.includes('gpt')) return 'Claude';
    return bucket.shortGroup || bucket.groupTitle || '';
  }

  function vbChartPillText(bucket) {
    const win = /week/i.test(bucket.label || '') ? '周' : String(bucket.label || '').toUpperCase();
    return `${vbPillFamilyName(bucket)} ${win} ${vbFmtPct(bucket.leftPct)}`;
  }

  function vbResetLine(bucket) {
    if (!bucket) return '—';
    const stamp = bucket.resetLabel || bucket.resetStamp || '';
    const cd = bucket.countdown || '';
    return stamp && cd ? `${stamp} · ${cd}` : stamp || cd || '—';
  }

  function vbFamilyKey(group) {
    const raw = `${group.family || ''} ${group.key || ''} ${group.title || ''}`.toLowerCase();
    return raw.includes('gemini') ? 'gemini' : '3p';
  }

  function vbShortModelLabel(model) {
    const raw = (model.displayName || model.id || '').trim();
    const cleaned = raw
      .replace(/^Gemini\s+4(?:\.\d+)?\s+/i, '')
      .replace(/^Gemini\s+/i, '')
      .replace(/^Claude\s+/i, '')
      .replace(/\s*\((High|Medium|Low|xHigh)\)\s*$/i, ' $1')
      .trim();
    return cleaned || raw;
  }

  function vbGroupModelsByTier(group, models) {
    const order = [];
    const map = new Map();
    const fam = vbFamilyKey(group);

    for (const m of models) {
      let tier = m.tier;
      if (!tier) {
        const sig = `${m.id || ''} ${m.displayName || ''}`.toLowerCase();
        tier = fam === 'gemini'
          ? (/gemini[-_\s]?4|argon|carbon|neon|hydrogen/.test(sig) ? 'Gemini 4 系列' : 'Gemini 3 / 2.5 & 工具')
          : (sig.includes('claude') ? 'Claude 系列' : 'GPT & 开源推理');
      }
      if (!map.has(tier)) {
        map.set(tier, []);
        order.push(tier);
      }
      map.get(tier).push(m);
    }
    return order.map((label) => ({ label, items: map.get(label) }));
  }

  function vbFamilyPaceSummary(group) {
    const list = Array.isArray(group.buckets) ? group.buckets : [];
    if (!list.length) return { text: '状态正常', tone: 'muted' };
    const worst = [...list].sort((a, b) => (a.leftPct ?? 100) - (b.leftPct ?? 100))[0];
    if (worst.leftPct <= 0) return { text: `${worst.label} 已耗尽`, tone: 'danger' };
    if (worst.leftPct <= 30 || worst.runsOutText) {
      return { text: `${/week/i.test(worst.label || '') ? '周' : worst.label}配额偏紧`, tone: 'warning' };
    }
    const maxDelta = Math.max(...list.map((b) => (Number.isFinite(b.paceDelta) ? b.paceDelta : 0)));
    return { text: maxDelta > 0 ? `节奏充裕 +${Math.round(maxDelta)}%` : '节奏平稳', tone: 'success' };
  }

  function vbBuildSummaryCopy(snapshot) {
    if (!snapshot) return 'Antigravity Quota';
    const items = (snapshot.buckets || []).map(
      (b) => `${b.groupTitle || b.shortGroup} ${b.label}: ${vbFmtPct(b.leftPct)} (${b.countdown || ''})`
    );
    return [`Antigravity${snapshot.plan ? ` (${snapshot.plan})` : ''}`, ...items].join(' | ');
  }

  // ─────────────────────────────────────────────────────────────
  // 骨架态与异常态
  // ─────────────────────────────────────────────────────────────

  function LinearSkeleton({ isTwoCol }) {
    return (
      <div className="vb-body">
        <div className="vb-bone" style={{ height: 30, width: '100%', borderRadius: 7 }} />
        <div className="vb-bone" style={{ height: 28, width: '100%', borderRadius: 7 }} />
        {[0, 1].map((idx) => (
          <div key={`vb-sk-${idx}`} className="vb-family">
            <div className="vb-family-head">
              <div className="vb-bone" style={{ height: 13, width: 112 }} />
              <div className="vb-bone" style={{ height: 16, width: 62, borderRadius: 4 }} />
            </div>
            <div className="vb-track-grid" data-cols={isTwoCol ? '2' : '1'}>
              {[0, 1].map((col) => (
                <React.Fragment key={`vb-sk-c-${idx}-${col}`}>
                  {isTwoCol && col === 1 ? <div className="vb-track-divider" /> : null}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div className="vb-track-top">
                      <div className="vb-bone" style={{ height: 22, width: 52 }} />
                      <div className="vb-bone" style={{ height: 14, width: 34, borderRadius: 4 }} />
                    </div>
                    <div className="vb-bone" style={{ height: 6, width: '100%', borderRadius: 3 }} />
                    <div className="vb-bone" style={{ height: 10, width: '76%' }} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
        <div className="vb-chart-section">
          <div className="vb-chart-head">
            <div className="vb-bone" style={{ height: 12, width: 76 }} />
            <div className="vb-bone" style={{ height: 12, width: 92 }} />
          </div>
          <div className="vb-bone" style={{ height: 86, width: '100%', borderRadius: 7 }} />
        </div>
      </div>
    );
  }

  function ProblemState({ detail, AgyIcon, onRetry }) {
    return (
      <div className="vb-problem">
        {AgyIcon ? <AgyIcon name="alert" size={22} color="var(--agy-danger)" /> : null}
        <div style={{ fontSize: 14, fontWeight: 600 }}>配额同步异常</div>
        <div style={{ fontSize: 12, color: 'var(--agy-muted)', lineHeight: 1.45, maxWidth: 320 }}>
          {detail || '无法连接到云端配额接口，请检查网络或认证状态后重试。'}
        </div>
        <div style={{ marginTop: 6 }}>
          <button type="button" className="vb-retry-btn" onClick={onRetry}>
            {AgyIcon ? <AgyIcon name="refresh" size={12} color="var(--agy-text)" /> : null}
            <span>重试</span>
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 主面板组件：方案 B · 极简线性节奏风
  // ─────────────────────────────────────────────────────────────

  function VariantBLinear({ data, settings, onCopy }) {
    ensureVariantBStyleTag();

    const shared = window.AGY_SHARED || {};
    const { AgyIcon, PaceBar, TrendChartSVG, PastCyclesSVG } = shared;

    const safeData = data || {};
    const snapshot = safeData.snapshot || null;
    const inflight = Boolean(safeData.inflight);
    const error = safeData.error || '';
    const scenarioKey = safeData.scenarioKey || (settings && settings.scenario) || 'urgent';

    const panelWidth = (settings && Number(settings.panelWidth)) || 420;
    const showPaceTick = settings && typeof settings.showPaceTick === 'boolean' ? settings.showPaceTick : true;
    const showPastCycles = settings && typeof settings.showPastCycles === 'boolean' ? settings.showPastCycles : true;
    const isTwoCol = panelWidth >= 400;

    const [accountIdx, setAccountIdx] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState(() => ({ gemini: true }));
    const [activeBucketKey, setActiveBucketKey] = useState('');
    const [chartOpen, setChartOpen] = useState(true);
    const [copiedKey, setCopiedKey] = useState('');
    const [pulseRefresh, setPulseRefresh] = useState(false);

    const searchInputRef = useRef(null);
    const copyTimerRef = useRef(null);
    const refreshTimerRef = useRef(null);

    useEffect(() => {
      setActiveBucketKey(snapshot && snapshot.buckets && snapshot.buckets[0] ? snapshot.buckets[0].key : '');
      setAccountIdx(0);
      setSearchQuery('');
    }, [scenarioKey, Boolean(snapshot)]);

    useEffect(() => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    }, []);

    const handleCopy = (value, tag) => {
      if (!value) return;
      if (typeof onCopy === 'function') onCopy(value);
      setCopiedKey(tag || value);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedKey(''), 1400);
    };

    const handleRefresh = () => {
      setPulseRefresh(true);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => setPulseRefresh(false), 750);
    };

    const buckets = useMemo(() => (snapshot && Array.isArray(snapshot.buckets) ? snapshot.buckets : []), [snapshot]);
    const leadBucket = buckets[0] || null;
    const soonestBucket = useMemo(() => {
      if (!buckets.length) return null;
      return [...buckets].sort((a, b) => vbParseCountdownMinutes(a.countdown) - vbParseCountdownMinutes(b.countdown))[0];
    }, [buckets]);
    const activeBucket = useMemo(
      () => buckets.find((b) => b.key === activeBucketKey) || leadBucket,
      [buckets, activeBucketKey, leadBucket]
    );

    const accounts = snapshot && Array.isArray(snapshot.accounts) ? snapshot.accounts : [];
    const activeAccount = accounts.length ? accounts[accountIdx % accounts.length] : (snapshot && snapshot.accountLabel) || '';

    const allModels = useMemo(() => {
      if (!snapshot) return [];
      if (Array.isArray(snapshot.models) && snapshot.models.length) return snapshot.models;
      const list = [];
      const seen = new Set();
      for (const g of snapshot.groups || []) {
        for (const m of g.models || []) {
          if (m && m.id && !seen.has(m.id)) { seen.add(m.id); list.push(m); }
        }
      }
      return list;
    }, [snapshot]);

    const trimmedQuery = searchQuery.trim().toLowerCase();
    const filteredModels = useMemo(() => {
      if (!trimmedQuery) return [];
      return allModels.filter((m) =>
        `${m.displayName || ''} ${m.id || ''} ${m.tier || ''} ${m.family || ''}`.toLowerCase().includes(trimmedQuery)
      );
    }, [allModels, trimmedQuery]);

    const isBottleneck = Boolean(leadBucket && (leadBucket.leftPct <= 30 || leadBucket.runsOutText));
    const bottleneckCss = leadBucket ? vbToneCss(shared, leadBucket.tone, leadBucket.leftPct) : 'var(--agy-success)';
    const hostText = snapshot && snapshot.origin ? String(snapshot.origin).replace(/^https?:\/\//, '') : 'daily-cloudcode-pa.googleapis.com';
    const footerTime = snapshot && snapshot.updatedText ? snapshot.updatedText : inflight ? '同步中…' : error ? '同步失败' : '—';

    return (
      <div className="vb-panel">
        {/* 1. Compact Single-Row Header */}
        <div className="vb-header">
          {AgyIcon ? <AgyIcon name="mark" size={15} color="var(--agy-accent)" /> : null}
          <span className="vb-brand">Antigravity</span>
          {snapshot && snapshot.plan ? <span className="vb-plan-badge">{snapshot.plan}</span> : null}
          <div style={{ flex: '1 1 0', minWidth: 2 }} />

          {activeAccount ? (
            <button
              type="button"
              className="vb-acct-chip"
              onClick={() => accounts.length > 1 && setAccountIdx((i) => (i + 1) % accounts.length)}
              title={accounts.length > 1 ? `当前账号：${activeAccount}（点击切换）` : activeAccount}
            >
              <span className="vb-ellipsis" style={{ flex: '1 1 auto' }}>{activeAccount}</span>
              {accounts.length > 1 && AgyIcon ? <AgyIcon name="chevronDown" size={9} color="var(--agy-muted)" /> : null}
            </button>
          ) : null}

          <div className="vb-header-actions">
            <button
              type="button"
              className="vb-icon-btn"
              data-active={Boolean(trimmedQuery || searchFocused)}
              title="筛选模型"
              onClick={() => { if (searchInputRef.current) searchInputRef.current.focus(); setSearchFocused(true); }}
            >
              {AgyIcon ? <AgyIcon name="search" size={13} color="currentColor" /> : null}
            </button>

            <button
              type="button"
              className="vb-icon-btn"
              title="复制配额摘要"
              onClick={() => handleCopy(vbBuildSummaryCopy(snapshot), '__summary__')}
            >
              {AgyIcon ? (
                <AgyIcon
                  name={copiedKey === '__summary__' ? 'check' : 'copy'}
                  size={13}
                  color={copiedKey === '__summary__' ? 'var(--agy-success)' : 'currentColor'}
                />
              ) : null}
            </button>

            <button type="button" className="vb-icon-btn" title="刷新配额" onClick={handleRefresh}>
              <span className={inflight || pulseRefresh ? 'vb-spin' : ''} style={{ display: 'inline-flex' }}>
                {AgyIcon ? <AgyIcon name="refresh" size={13} color="currentColor" /> : null}
              </span>
            </button>
          </div>
        </div>

        {/* 2. Loading / Error / Main Body */}
        {!snapshot ? (
          error ? <ProblemState detail={error} AgyIcon={AgyIcon} onRetry={handleRefresh} /> : <LinearSkeleton isTwoCol={isTwoCol} />
        ) : (
          <div className="vb-body">
            {error ? (
              <div
                className="vb-banner"
                style={{
                  background: 'color-mix(in srgb, var(--agy-danger) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--agy-danger) 24%, transparent)',
                  fontSize: 11,
                }}
              >
                {AgyIcon ? <AgyIcon name="alert" size={13} color="var(--agy-danger)" /> : null}
                <span style={{ flex: 1, minWidth: 0 }}>{error}</span>
              </div>
            ) : null}

            {/* 3. Smart Bottleneck Callout Banner */}
            {leadBucket ? (
              isBottleneck ? (
                <div
                  className="vb-banner vb-banner-urgent"
                  onClick={() => setActiveBucketKey(leadBucket.key)}
                  style={{
                    background: `color-mix(in srgb, ${bottleneckCss} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${bottleneckCss} 24%, transparent)`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span className="vb-dot" style={{ background: bottleneckCss }} />
                    <span className="vb-tnum" style={{ fontSize: 11.5, fontWeight: 600, color: bottleneckCss, whiteSpace: 'nowrap' }}>
                      {leadBucket.groupTitle || leadBucket.shortGroup} · {leadBucket.label} 剩余 {vbFmtPct(leadBucket.leftPct)}
                    </span>
                  </div>
                  <span className="vb-tnum" style={{ fontSize: 10.5, color: 'var(--agy-muted)', whiteSpace: 'nowrap' }}>
                    {leadBucket.leftPct <= 0
                      ? `窗口已耗尽 · ${leadBucket.countdown || '—'} 后重置`
                      : `时段已过 ${Math.round(leadBucket.elapsedPct || 0)}% · 预计提前耗尽 (${leadBucket.countdown || '—'} 重置)`}
                  </span>
                </div>
              ) : (
                <div className="vb-banner vb-banner-healthy">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="vb-dot" style={{ background: 'var(--agy-success)' }} />
                    <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>全部配额运行充裕</span>
                  </div>
                  {soonestBucket ? (
                    <span className="vb-tnum vb-ellipsis" style={{ color: 'var(--agy-muted)', fontSize: 10.5 }}>
                      最近重置 {vbPillFamilyName(soonestBucket)} {soonestBucket.label} ({soonestBucket.countdown || '—'})
                    </span>
                  ) : null}
                </div>
              )
            ) : null}

            {/* 5. Slim Inline SearchField */}
            <div className="vb-search-wrap">
              {AgyIcon ? <AgyIcon name="search" size={12} color="var(--agy-muted)" /> : null}
              <input
                ref={searchInputRef}
                type="text"
                className="vb-search-input"
                value={searchQuery}
                placeholder={`筛选 ${snapshot.totalModels || allModels.length} 个模型或点击复制 ID…`}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {trimmedQuery ? (
                <button type="button" className="vb-clear-btn" onClick={() => setSearchQuery('')} title="清空筛选">×</button>
              ) : (
                <span className="vb-tnum" style={{ fontSize: 10, color: 'var(--agy-muted)', opacity: 0.72, whiteSpace: 'nowrap' }}>
                  {snapshot.totalModels || allModels.length} 模型
                </span>
              )}
            </div>

            {/* Inline Search Results vs Dual-Family Linear Pace Tracks */}
            {trimmedQuery ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div className="vb-family-head" style={{ padding: '0 2px 4px', fontSize: 10.5, color: 'var(--agy-muted)' }}>
                  <span>匹配结果 ({filteredModels.length})</span>
                  <span>点击行复制模型 ID</span>
                </div>
                {filteredModels.length === 0 ? (
                  <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 11.5, color: 'var(--agy-muted)', borderTop: '1px solid var(--agy-border)' }}>
                    未找到包含 “{searchQuery.trim()}” 的模型
                  </div>
                ) : (
                  filteredModels.map((m) => {
                    const mCss = vbToneCss(shared, m.tone, m.leftPct);
                    const isCopied = copiedKey === m.id;
                    return (
                      <div key={`vb-sr-${m.id}`} className="vb-search-row" onClick={() => handleCopy(m.id, m.id)} title={`点击复制 ${m.id}`}>
                        <span className="vb-dot" style={{ background: mCss }} />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span className="vb-ellipsis" style={{ fontSize: 12, fontWeight: 550 }}>{m.displayName || m.id}</span>
                          <span className="vb-ellipsis vb-mono" style={{ fontSize: 10, color: 'var(--agy-muted)' }}>{m.id}</span>
                        </div>
                        <span className="vb-tnum" style={{ fontSize: 12, fontWeight: 650, color: mCss, flexShrink: 0 }}>{vbFmtPct(m.leftPct)}</span>
                        {m.countdown ? (
                          <span className="vb-tnum" style={{ fontSize: 10.5, color: 'var(--agy-muted)', flexShrink: 0, minWidth: 38, textAlign: 'right' }}>
                            {m.countdown}
                          </span>
                        ) : null}
                        {AgyIcon ? <AgyIcon name={isCopied ? 'check' : 'copy'} size={11} color={isCopied ? 'var(--agy-success)' : 'var(--agy-muted)'} /> : null}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* 4. Dual-Family Linear Pace Tracks（核心视觉区） */
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {(snapshot.groups || []).map((group) => {
                  const fam = vbFamilyKey(group);
                  const groupKey = group.key || fam;
                  const groupModels = Array.isArray(group.models) && group.models.length
                    ? group.models
                    : allModels.filter((m) => (m.family || m.groupKey) === fam);
                  const modelCount = group.modelCount || group.totalModels || groupModels.length;
                  const tiers = vbGroupModelsByTier(group, groupModels);
                  const isExpanded = Boolean(expandedGroups[groupKey]);
                  const summary = vbFamilyPaceSummary(group);
                  const summaryCss = summary.tone === 'muted'
                    ? 'var(--agy-muted)'
                    : vbToneCss(shared, summary.tone, summary.tone === 'danger' ? 0 : summary.tone === 'warning' ? 20 : 90);
                  const previewNames = groupModels.slice(0, 3).map(vbShortModelLabel).join(' · ');
                  const gBuckets = Array.isArray(group.buckets) ? group.buckets : [];
                  const useTwoCols = isTwoCol && gBuckets.length >= 2;

                  return (
                    <div key={`vb-fam-${groupKey}`} className="vb-family">
                      <div className="vb-family-head">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          {AgyIcon ? (
                            <AgyIcon name={fam === 'gemini' ? 'sparkle' : 'bot'} size={13.5} color={fam === 'gemini' ? 'var(--agy-accent)' : 'var(--agy-muted)'} />
                          ) : null}
                          <span className="vb-family-title">{group.title}</span>
                          <span className="vb-family-count vb-tnum">· {modelCount}</span>
                        </div>
                        <span
                          className="vb-summary-pill vb-tnum"
                          style={{
                            color: summaryCss,
                            background: summary.tone === 'muted'
                              ? 'var(--agy-surface-hover)'
                              : `color-mix(in srgb, ${summaryCss} 12%, transparent)`,
                          }}
                        >
                          {summary.text}
                        </span>
                      </div>

                      <div className="vb-track-grid" data-cols={useTwoCols ? '2' : '1'}>
                        {gBuckets.map((bucket, bIdx) => {
                          const bTone = vbResolveTone(bucket.tone, bucket.leftPct);
                          const bCss = vbToneCss(shared, bTone, bucket.leftPct);
                          const delta = vbPaceDeltaMeta(bucket);
                          const isSelected = activeBucket && activeBucket.key === bucket.key;

                          return (
                            <React.Fragment key={`vb-trk-${bucket.key}`}>
                              {useTwoCols && bIdx > 0 ? <div className="vb-track-divider" /> : null}
                              <div
                                className="vb-track-col"
                                data-selected={isSelected}
                                onClick={() => setActiveBucketKey(bucket.key)}
                                title={`点击查看 ${bucket.groupTitle || group.title} ${bucket.label} 消耗趋势`}
                              >
                                <div className="vb-track-top">
                                  <span
                                    className="vb-big-pct vb-tnum"
                                    style={{ color: bTone === 'danger' || bTone === 'warning' ? bCss : 'var(--agy-text)' }}
                                  >
                                    {vbFmtPct(bucket.leftPct)}
                                  </span>
                                  <span className="vb-win-badge">{bucket.label}</span>
                                </div>

                                <div style={{ margin: '2px 0 1px' }}>
                                  {PaceBar ? (
                                    <PaceBar
                                      leftPct={bucket.leftPct}
                                      paceLeftPct={bucket.paceLeftPct}
                                      elapsedPct={bucket.elapsedPct}
                                      tone={bucket.tone}
                                      showPace={showPaceTick}
                                      height={6}
                                    />
                                  ) : null}
                                </div>

                                <div className="vb-track-meta">
                                  <span className="vb-tnum vb-ellipsis" style={{ color: delta.color, fontWeight: bucket.paceDelta < 0 || bucket.leftPct <= 0 ? 550 : 500 }}>
                                    {delta.text}
                                  </span>
                                  {Number.isFinite(bucket.elapsedPct) ? (
                                    <span className="vb-tnum" style={{ color: 'var(--agy-muted)', fontSize: 10, opacity: 0.8, flexShrink: 0 }}>
                                      已过 {Math.round(bucket.elapsedPct)}%
                                    </span>
                                  ) : null}
                                </div>

                                <div className="vb-track-reset">
                                  {AgyIcon ? <AgyIcon name="clock" size={10} color="var(--agy-muted)" /> : null}
                                  <span className="vb-tnum vb-ellipsis">{vbResetLine(bucket)}</span>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {groupModels.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <button
                            type="button"
                            className="vb-toggle-row"
                            onClick={() => setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                          >
                            {AgyIcon ? <AgyIcon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={11} color="var(--agy-muted)" /> : null}
                            <span className="vb-tnum" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {isExpanded ? '收起模型目录' : `展开模型目录 · ${modelCount}`}
                            </span>
                            {!isExpanded && previewNames ? (
                              <span className="vb-ellipsis" style={{ flex: 1, textAlign: 'right', fontSize: 10, opacity: 0.78 }}>
                                {previewNames}
                              </span>
                            ) : null}
                          </button>

                          {isExpanded ? (
                            <div className="vb-tier-list">
                              {tiers.map((tier) => (
                                <div key={`vb-tier-${groupKey}-${tier.label}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <span className="vb-tier-label">{tier.label}</span>
                                  <div className="vb-pill-wrap">
                                    {tier.items.map((m) => {
                                      const isCopied = copiedKey === m.id;
                                      return (
                                        <button
                                          key={`vb-pill-${m.id}`}
                                          type="button"
                                          className="vb-model-pill"
                                          data-copied={isCopied}
                                          title={`${m.displayName || m.id} (${m.id}) — 点击复制模型 ID`}
                                          onClick={() => handleCopy(m.id, m.id)}
                                        >
                                          <span>{vbShortModelLabel(m)}</span>
                                          {isCopied && AgyIcon ? <AgyIcon name="check" size={9.5} color="currentColor" /> : null}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 6. Collapsible / Compact Pace & Forecast Chart */}
            {!trimmedQuery && activeBucket ? (
              <div className="vb-chart-section">
                <div className="vb-chart-head">
                  <button type="button" className="vb-toggle-row" style={{ width: 'auto', padding: 0 }} onClick={() => setChartOpen((v) => !v)}>
                    {AgyIcon ? <AgyIcon name={chartOpen ? 'chevronDown' : 'chevronRight'} size={11} color="var(--agy-muted)" /> : null}
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--agy-text)' }}>节奏与预测</span>
                  </button>
                  <span
                    className="vb-tnum vb-ellipsis"
                    style={{
                      fontSize: 10.5,
                      color: activeBucket.runsOutText ? vbToneCss(shared, activeBucket.tone, activeBucket.leftPct) : 'var(--agy-muted)',
                      fontWeight: activeBucket.runsOutText ? 550 : 400,
                    }}
                  >
                    {activeBucket.runsOutText || `${vbResetLine(activeBucket)} 重置`}
                  </span>
                </div>

                {chartOpen ? (
                  <>
                    <div className="vb-chart-pills">
                      {buckets.map((b) => (
                        <button
                          key={`vb-cp-${b.key}`}
                          type="button"
                          className="vb-chart-pill vb-tnum"
                          data-active={b.key === activeBucket.key}
                          onClick={() => setActiveBucketKey(b.key)}
                        >
                          {vbChartPillText(b)}
                        </button>
                      ))}
                    </div>

                    {TrendChartSVG ? (
                      <TrendChartSVG bucket={activeBucket} height={92} showPace={showPaceTick} showForecast={true} />
                    ) : null}

                    {showPastCycles && PastCyclesSVG && Array.isArray(activeBucket.pastCycles) && activeBucket.pastCycles.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--agy-muted)' }}>历史周期余量</span>
                        <PastCyclesSVG pastCycles={activeBucket.pastCycles} height={50} />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {/* 7. Minimal Footer */}
        <div className="vb-footer">
          <span className="vb-ellipsis">{hostText}</span>
          <span className="vb-tnum" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{footerTime}</span>
        </div>
      </div>
    );
  }

  window.VariantBLinear = VariantBLinear;
})();
