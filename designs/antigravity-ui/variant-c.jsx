/**
 * [INPUT]: 依赖 window.AGY_SHARED（AgyIcon、PaceBar、TrendChartSVG、PastCyclesSVG、toneColor）与全局 React、CSS 变量（--agy-*）
 * [OUTPUT]: 挂载 window.VariantCCockpit 组件，渲染方案 C（2×2 矩阵聚焦驾驶舱 · Sequoia Glass Cockpit）
 * [POS]: designs/antigravity-ui/ 的第三套主面板交互变体，由 app.jsx 在 DCArtboard 中渲染并与方案 A/B 并排对照
 * [PROTOCOL]: Update this header on change, then check GEMINI.md
 */

(() => {
  const { useState, useEffect, useMemo } = React;

  // ===========================================================================
  // 样式注入（独立命名空间 vc-，严格绑定 --agy-* 主题变量，禁止顶层 const styles）
  // ===========================================================================
  const VC_STYLE_ID = 'vc-cockpit-style-sheet';
  const variantCStyles = `
    .vc-shell { width: 100%; background: var(--agy-bg); color: var(--agy-text); font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", sans-serif; font-size: 13px; line-height: 1.4; -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; display: flex; flex-direction: column; box-sizing: border-box; }
    .vc-shell *, .vc-shell *::before, .vc-shell *::after { box-sizing: border-box; }
    .vc-divider { height: 1px; width: 100%; background: var(--agy-border); flex-shrink: 0; }
    .vc-header { display: flex; align-items: center; gap: 8px; padding: 11px 12px 9px 14px; }
    .vc-header-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .vc-header-title-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .vc-title { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; color: var(--agy-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vc-plan-badge { font-size: 10px; font-weight: 600; line-height: 1.3; padding: 1.5px 6px; border-radius: 5px; background: var(--agy-accent); color: var(--agy-accent-text); white-space: nowrap; flex-shrink: 0; }
    .vc-acct-btn { border: none; background: transparent; color: var(--agy-muted); font: inherit; font-size: 11px; padding: 0; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; max-width: 100%; }
    .vc-acct-btn:hover { color: var(--agy-text); }
    .vc-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .vc-icon-btn { width: 28px; height: 28px; border-radius: 7px; border: 1px solid transparent; background: transparent; color: var(--agy-muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; flex-shrink: 0; transition: background 120ms ease, color 120ms ease; }
    .vc-icon-btn:hover { background: var(--agy-surface-hover); color: var(--agy-text); }
    .vc-icon-btn:active { background: var(--agy-surface-pressed, var(--agy-surface-hover)); }
    .vc-body { display: flex; flex-direction: column; gap: 11px; padding: 11px 13px 13px; }
    .vc-err-banner { display: flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 8px; background: var(--agy-surface-hover); border: 1px solid var(--agy-border); font-size: 11.5px; color: var(--agy-text); }
    .vc-matrix { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .vc-tile { position: relative; display: flex; flex-direction: column; gap: 7px; padding: 10px 11px; border-radius: 10px; background: var(--agy-surface-hover); border: 1px solid var(--agy-border); text-align: left; cursor: pointer; min-width: 0; width: 100%; color: inherit; font: inherit; transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 120ms ease; }
    .vc-tile:hover { background: var(--agy-surface); border-color: var(--agy-accent); }
    .vc-tile:active { transform: scale(0.99); }
    .vc-tile-active { background: var(--agy-surface); border-width: 1.5px; padding: 9.5px 10.5px; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.07); }
    [data-theme="dark"] .vc-tile-active { background: rgba(255, 255, 255, 0.105); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28); }
    .vc-tile-top, .vc-tile-mid, .vc-tile-foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%; }
    .vc-tile-label-wrap { display: flex; align-items: center; gap: 4px; min-width: 0; }
    .vc-tile-micro { font-size: 10px; font-weight: 650; letter-spacing: 0.03em; color: var(--agy-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vc-tile-active .vc-tile-micro { color: var(--agy-text); }
    .vc-tile-delta { font-size: 9.5px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
    .vc-tile-pct { font-size: 23px; font-weight: 700; line-height: 1.05; letter-spacing: -0.025em; }
    .vc-tile-cd { display: inline-flex; align-items: center; gap: 3.5px; font-size: 10.5px; font-weight: 600; color: var(--agy-text); white-space: nowrap; }
    .vc-tile-reset { font-size: 10px; color: var(--agy-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vc-seg-wrap { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2px; padding: 2px; border-radius: 8px; background: var(--agy-surface-hover); border: 1px solid var(--agy-border); width: 100%; }
    .vc-seg-btn { border: none; background: transparent; color: var(--agy-muted); font: inherit; font-size: 11.5px; font-weight: 500; padding: 5px 6px; border-radius: 6px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease; }
    .vc-seg-btn:hover { color: var(--agy-text); }
    .vc-seg-btn-active { background: var(--agy-surface); color: var(--agy-text); font-weight: 600; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12); }
    [data-theme="dark"] .vc-seg-btn-active { background: rgba(255, 255, 255, 0.13); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.32); }
    .vc-inspector { display: flex; flex-direction: column; gap: 9px; }
    .vc-insp-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding: 0 2px; }
    .vc-insp-title-wrap { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .vc-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .vc-insp-title { font-size: 12.5px; font-weight: 650; color: var(--agy-text); }
    .vc-insp-meta { font-size: 10.5px; color: var(--agy-muted); white-space: nowrap; flex-shrink: 0; }
    .vc-verdict { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; background: var(--agy-surface-hover); font-size: 11.5px; line-height: 1.35; color: var(--agy-text); font-weight: 500; }
    .vc-chart-box { padding: 9px 11px 8px; border-radius: 10px; background: var(--agy-surface); border: 1px solid var(--agy-border); display: flex; flex-direction: column; gap: 6px; }
    .vc-chart-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .vc-chart-title { font-size: 10.5px; font-weight: 600; color: var(--agy-muted); }
    .vc-legend { display: flex; align-items: center; gap: 10px; font-size: 10px; color: var(--agy-muted); }
    .vc-legend-item { display: inline-flex; align-items: center; gap: 4px; }
    .vc-past-wrap { margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--agy-border); display: flex; flex-direction: column; gap: 4px; }
    .vc-quick-wrap { display: flex; flex-direction: column; gap: 6px; padding: 1px 2px 0; }
    .vc-quick-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--agy-muted); }
    .vc-chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .vc-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 7px; border-radius: 5px; border: 1px solid transparent; background: var(--agy-accent-subtle); color: var(--agy-accent); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10.5px; line-height: 1.25; cursor: pointer; max-width: 100%; transition: background 120ms ease, color 120ms ease, border-color 120ms ease; }
    .vc-chip:hover { border-color: var(--agy-accent); }
    .vc-chip-copied { background: var(--agy-accent); color: var(--agy-accent-text); }
    .vc-link-btn { border: none; background: transparent; color: var(--agy-accent); font: inherit; font-size: 11px; font-weight: 500; padding: 0; cursor: pointer; }
    .vc-link-btn:hover { text-decoration: underline; }
    .vc-search-box { display: flex; align-items: center; gap: 6px; padding: 0 9px; height: 30px; border-radius: 7px; background: var(--agy-surface-hover); border: 1px solid var(--agy-border); width: 100%; transition: border-color 120ms ease, background 120ms ease; }
    .vc-search-box:focus-within { border-color: var(--agy-accent); background: var(--agy-surface); }
    .vc-search-input { border: none; outline: none; background: transparent; color: var(--agy-text); font: inherit; font-size: 12px; flex: 1; min-width: 0; }
    .vc-search-input::placeholder { color: var(--agy-muted); }
    .vc-clear-btn { border: none; background: transparent; color: var(--agy-muted); cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px; }
    .vc-list-box { display: flex; flex-direction: column; border-radius: 10px; background: var(--agy-surface); border: 1px solid var(--agy-border); padding: 4px; gap: 2px; }
    .vc-row-item { display: flex; align-items: center; gap: 8px; padding: 7.5px 9px; border-radius: 7px; border: 1px solid transparent; background: transparent; cursor: pointer; width: 100%; text-align: left; color: inherit; font: inherit; transition: background 120ms ease, border-color 120ms ease; }
    .vc-row-item:hover { background: var(--agy-surface-hover); border-color: var(--agy-border); }
    .vc-row-item-copied { background: var(--agy-surface-hover); border-color: var(--agy-accent); }
    .vc-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .vc-row-name { font-size: 12px; font-weight: 600; color: var(--agy-text); }
    .vc-row-id { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; color: var(--agy-muted); }
    .vc-model-grid { display: grid; gap: 7px; }
    .vc-model-card { display: flex; flex-direction: column; gap: 6px; padding: 9px 10px; border-radius: 9px; background: var(--agy-surface); border: 1px solid var(--agy-border); cursor: pointer; text-align: left; color: inherit; font: inherit; min-width: 0; width: 100%; transition: background 120ms ease, border-color 120ms ease; }
    .vc-model-card:hover { background: var(--agy-surface-hover); border-color: var(--agy-accent); }
    .vc-model-card-copied { border-color: var(--agy-accent); background: var(--agy-surface-hover); }
    .vc-card-id-pill { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; padding: 1.5px 5px; border-radius: 4px; background: var(--agy-accent-subtle); color: var(--agy-accent); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 9.5px; align-self: flex-start; }
    .vc-card-id-pill-copied { background: var(--agy-accent); color: var(--agy-accent-text); }
    .vc-empty { padding: 22px 12px; text-align: center; font-size: 12px; color: var(--agy-muted); }
    .vc-problem { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 9px; padding: 36px 26px; }
    .vc-retry-btn { margin-top: 6px; border: 1px solid var(--agy-border); background: var(--agy-surface-hover); color: var(--agy-text); font: inherit; font-size: 12px; font-weight: 500; padding: 6px 14px; border-radius: 7px; cursor: pointer; transition: background 120ms ease, border-color 120ms ease; }
    .vc-retry-btn:hover { background: var(--agy-surface); border-color: var(--agy-accent); }
    .vc-footer { display: flex; align-items: center; gap: 8px; padding: 7px 14px; font-size: 10px; color: var(--agy-muted); }
    .vc-footer-hint { white-space: nowrap; flex-shrink: 0; padding: 1px 5px; border-radius: 4px; background: var(--agy-surface-hover); }
    @keyframes vcSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .vc-spinning { display: inline-flex; animation: vcSpin 850ms linear infinite; }
    @keyframes vcPulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.95; } }
    .vc-bone { background: var(--agy-surface-hover); border-radius: 6px; animation: vcPulse 1.5s ease-in-out infinite; }
  `;

  function ensureVariantCStyles() {
    if (typeof document === 'undefined' || document.getElementById(VC_STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = VC_STYLE_ID;
    el.textContent = variantCStyles;
    document.head.appendChild(el);
  }

  // ===========================================================================
  // 数据适配与语义辅助函数
  // ===========================================================================
  function vcClampPct(val) {
    const n = Number(val);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  }

  function vcToneColor(tone, leftPct, sharedToneColor) {
    if (typeof sharedToneColor === 'function') {
      const res = sharedToneColor(tone || leftPct);
      if (typeof res === 'string' && res) return res;
    }
    const key = tone || (leftPct <= 10 ? 'danger' : leftPct <= 30 ? 'warning' : 'success');
    if (key === 'danger') return 'var(--agy-danger)';
    if (key === 'warning') return 'var(--agy-warning)';
    if (key === 'accent') return 'var(--agy-accent)';
    return 'var(--agy-success)';
  }

  function vcIsGemini(str) {
    return /gemini|tab_flash/i.test(String(str || ''));
  }

  function vcOrderMatrixBuckets(buckets) {
    if (!Array.isArray(buckets) || !buckets.length) return [];
    const rankFam = (b) => (vcIsGemini(`${b.groupKey || ''} ${b.groupTitle || ''} ${b.key || ''}`) ? 0 : 1);
    const rankWin = (b) => (/5h/i.test(`${b.label || ''} ${b.key || ''}`) ? 0 : 1);
    return [...buckets].sort((a, b) => rankFam(a) - rankFam(b) || rankWin(a) - rankWin(b));
  }

  function vcPickMostUrgent(buckets) {
    if (!Array.isArray(buckets) || !buckets.length) return null;
    return [...buckets].sort((a, b) => {
      const pa = Number.isFinite(a.leftPct) ? a.leftPct : 100;
      const pb = Number.isFinite(b.leftPct) ? b.leftPct : 100;
      return pa - pb || (a.paceDelta || 0) - (b.paceDelta || 0);
    })[0];
  }

  function vcMatrixMicroLabel(bucket) {
    const isGem = vcIsGemini(`${bucket.groupKey || ''} ${bucket.groupTitle || ''}`);
    return `${isGem ? 'GEMINI' : 'CLAUDE & GPT'} · ${bucket.label}`;
  }

  function vcGetFamilyModels(snapshot, bucket) {
    if (!snapshot || !bucket) return { list: [], totalCount: 0, groupTitle: '' };
    const all = Array.isArray(snapshot.models) ? snapshot.models : [];
    const groups = Array.isArray(snapshot.groups) ? snapshot.groups : [];
    const isGem = vcIsGemini(`${bucket.groupKey || ''} ${bucket.groupTitle || ''}`);
    const group =
      groups.find((g) => g.key === bucket.groupKey || g.family === bucket.groupKey || g.title === bucket.groupTitle) ||
      groups.find((g) => vcIsGemini(g.key || g.title) === isGem) ||
      null;

    let list = all.filter((m) =>
      m.groupKey && bucket.groupKey
        ? m.groupKey === bucket.groupKey
        : m.family && bucket.groupKey
          ? m.family === bucket.groupKey
          : vcIsGemini(`${m.id} ${m.displayName}`) === isGem
    );
    if (!list.length && group && Array.isArray(group.models) && typeof group.models[0] === 'object') {
      list = group.models;
    }

    return {
      list,
      totalCount: (group && (group.modelCount || group.totalModels)) || list.length,
      groupTitle: (group && group.title) || bucket.groupTitle || (isGem ? 'Gemini Models' : 'Claude & GPT'),
    };
  }

  function vcComputeVerdict(bucket) {
    if (!bucket) return { text: '', level: 'success' };
    const left = vcClampPct(bucket.leftPct);
    const delta = Number.isFinite(bucket.paceDelta) ? Math.round(bucket.paceDelta) : 0;
    const elapsed = Number.isFinite(bucket.elapsedPct) ? Math.round(bucket.elapsedPct) : null;

    if (left <= 0) {
      return { text: `当前窗口已耗尽，将于 ${bucket.resetLabel || '下周期'} 恢复`, level: 'danger' };
    }
    if (delta < 0 || bucket.runsOutText) {
      const fastText = delta < 0 ? `当前消耗快于匀速 ${Math.abs(delta)}%` : '当前消耗偏快';
      const tail = bucket.runsOutText ? bucket.runsOutText.replace(/^按当前速率/, '').trim() : '预计将提前耗尽';
      return { text: `${fastText}，${tail}`, level: left <= 10 ? 'danger' : 'warning' };
    }

    let projected = null;
    if (Array.isArray(bucket.forecast) && bucket.forecast.length) {
      const end = bucket.forecast[bucket.forecast.length - 1];
      if (end && Number.isFinite(end.left)) projected = vcClampPct(end.left);
    }
    if (projected === null) {
      const used = 100 - left;
      projected = used <= 1 ? 96 : elapsed && elapsed > 5 ? vcClampPct(100 - (used / elapsed) * 100) : Math.round(left * 0.72);
    }
    return {
      text: `余量充裕（高于匀速 +${delta}%），预计重置前剩余 ${projected}%`,
      level: 'success',
    };
  }

  // ===========================================================================
  // 迷你圆环与加载/错误视图（1:1 映射 Metrix.Bar 原生 Chart/Skeleton/Problem）
  // ===========================================================================
  function MiniRing({ leftPct, color, size = 22 }) {
    const pct = vcClampPct(leftPct);
    const sw = 2.6;
    const r = (size - sw) / 2;
    const circ = 2 * Math.PI * r;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, display: 'block' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--agy-track, var(--agy-border))" strokeWidth={sw} />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
    );
  }

  function CockpitSkeleton() {
    return (
      <div className="vc-body">
        <div className="vc-matrix">
          {[0, 1, 2, 3].map((i) => (
            <div key={`sk-${i}`} className="vc-tile" style={{ cursor: 'default', pointerEvents: 'none' }}>
              <div className="vc-bone" style={{ width: '64%', height: 10 }} />
              <div className="vc-tile-mid">
                <div className="vc-bone" style={{ width: 44, height: 22 }} />
                <div className="vc-bone" style={{ width: 20, height: 20, borderRadius: '50%' }} />
              </div>
              <div className="vc-bone" style={{ width: '100%', height: 5, borderRadius: 3 }} />
              <div className="vc-bone" style={{ width: '50%', height: 9 }} />
            </div>
          ))}
        </div>
        <div className="vc-bone" style={{ width: '100%', height: 30, borderRadius: 8 }} />
        <div className="vc-chart-box" style={{ gap: 10 }}>
          <div className="vc-chart-head">
            <div className="vc-bone" style={{ width: '44%', height: 12 }} />
            <div className="vc-bone" style={{ width: '32%', height: 10 }} />
          </div>
          <div className="vc-bone" style={{ width: '100%', height: 28, borderRadius: 7 }} />
          <div className="vc-bone" style={{ width: '100%', height: 104, borderRadius: 8 }} />
          <div className="vc-chips">
            {[74, 88, 66, 92].map((w, idx) => (
              <div key={idx} className="vc-bone" style={{ width: w, height: 21, borderRadius: 5 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  function CockpitProblem({ detail, AgyIcon, onRetry }) {
    return (
      <div className="vc-problem">
        {AgyIcon ? <AgyIcon name="alert" size={24} color="var(--agy-danger)" /> : null}
        <div style={{ fontSize: 14, fontWeight: 600 }}>无法加载额度</div>
        <div style={{ fontSize: 12, color: 'var(--agy-muted)', lineHeight: 1.48, maxWidth: 320 }}>{detail}</div>
        <button type="button" className="vc-retry-btn" onClick={onRetry}>
          重试刷新
        </button>
      </div>
    );
  }

  // ===========================================================================
  // 主组件：方案 C · 2×2 矩阵聚焦驾驶舱 (Sequoia Glass Cockpit)
  // ===========================================================================
  function VariantCCockpit({ data, settings, onCopy }) {
    useEffect(() => { ensureVariantCStyles(); }, []);

    const shared = window.AGY_SHARED || {};
    const { AgyIcon, PaceBar, TrendChartSVG, PastCyclesSVG, toneColor } = shared;

    const safeData = data || {};
    const snapshot = safeData.snapshot || null;
    const inflight = Boolean(safeData.inflight);
    const errorMsg = safeData.error || '';
    const scenarioKey = safeData.scenarioKey || (settings && settings.scenario) || 'urgent';

    const safeSettings = settings || {};
    const panelWidth = Number(safeSettings.panelWidth) || 420;
    const showPaceTick = safeSettings.showPaceTick !== false;
    const showPastCycles = Boolean(safeSettings.showPastCycles);

    const matrixBuckets = useMemo(() => vcOrderMatrixBuckets(snapshot && snapshot.buckets), [snapshot]);
    const urgentBucket = useMemo(() => vcPickMostUrgent(snapshot && snapshot.buckets), [snapshot]);

    const [activeBucketKey, setActiveBucketKey] = useState(urgentBucket ? urgentBucket.key : '');
    const [activeTab, setActiveTab] = useState('trend');
    const [familyQuery, setFamilyQuery] = useState('');
    const [allQuery, setAllQuery] = useState('');
    const [copiedId, setCopiedId] = useState('');
    const [copiedSummary, setCopiedSummary] = useState(false);
    const [spinning, setSpinning] = useState(false);
    const [acctIdx, setAcctIdx] = useState(0);

    // 场景变化时自动聚焦最紧迫配额桶
    useEffect(() => {
      setActiveBucketKey(urgentBucket ? urgentBucket.key : '');
      setFamilyQuery('');
      setAllQuery('');
    }, [scenarioKey, urgentBucket && urgentBucket.key]);

    const activeBucket = useMemo(() => {
      if (!matrixBuckets.length) return null;
      return matrixBuckets.find((b) => b.key === activeBucketKey) || urgentBucket || matrixBuckets[0];
    }, [matrixBuckets, activeBucketKey, urgentBucket]);

    const familyData = useMemo(() => vcGetFamilyModels(snapshot, activeBucket), [snapshot, activeBucket]);
    const allModels = useMemo(() => (snapshot && Array.isArray(snapshot.models) ? snapshot.models : []), [snapshot]);

    const filteredFamilyModels = useMemo(() => {
      const q = familyQuery.trim().toLowerCase();
      return q ? familyData.list.filter((m) => `${m.displayName || ''} ${m.id || ''}`.toLowerCase().includes(q)) : familyData.list;
    }, [familyData.list, familyQuery]);

    const filteredAllModels = useMemo(() => {
      const q = allQuery.trim().toLowerCase();
      return q ? allModels.filter((m) => `${m.displayName || ''} ${m.id || ''}`.toLowerCase().includes(q)) : allModels;
    }, [allModels, allQuery]);

    const accounts = useMemo(() => {
      if (!snapshot) return [];
      if (Array.isArray(snapshot.accounts) && snapshot.accounts.length) return snapshot.accounts;
      return snapshot.accountLabel ? [snapshot.accountLabel] : [];
    }, [snapshot]);
    const currentAccount = accounts[acctIdx % Math.max(accounts.length, 1)] || (snapshot && snapshot.accountLabel) || '';

    const triggerCopy = (text, marker) => {
      if (typeof onCopy === 'function') onCopy(text);
      if (marker === '__summary__') {
        setCopiedSummary(true);
        window.setTimeout(() => setCopiedSummary(false), 1400);
      } else {
        const id = marker || text;
        setCopiedId(id);
        window.setTimeout(() => setCopiedId((cur) => (cur === id ? '' : cur)), 1400);
      }
    };

    const triggerRefresh = () => {
      setSpinning(true);
      window.setTimeout(() => setSpinning(false), 700);
    };

    const copySummary = () => {
      if (!snapshot) return;
      const summary = (snapshot.buckets || [])
        .map((b) => `${b.shortGroup || b.groupTitle} ${b.label}: ${vcClampPct(b.leftPct)}% (${b.countdown || ''})`)
        .join(' | ');
      triggerCopy(`Antigravity (${snapshot.plan || 'Quota'}) · ${summary}`, '__summary__');
    };

    const totalModelCount = (snapshot && snapshot.totalModels) || allModels.length;
    const verdict = useMemo(() => vcComputeVerdict(activeBucket), [activeBucket]);
    const activeColor = activeBucket ? vcToneColor(activeBucket.tone, activeBucket.leftPct, toneColor) : 'var(--agy-accent)';
    const verdictColor = activeBucket ? vcToneColor(verdict.level, activeBucket.leftPct, toneColor) : 'var(--agy-success)';
    const gridCols = panelWidth < 350 ? 1 : 2;

    return (
      <div className="vc-shell">
        {/* 1. Header：品牌标识 + 套餐徽章 + 账号副标题 + Copy / Refresh 图标按钮 */}
        <div className="vc-header">
          {AgyIcon ? <AgyIcon name="mark" size={18} color="var(--agy-accent)" /> : null}
          <div className="vc-header-main">
            <div className="vc-header-title-row">
              <span className="vc-title">Antigravity</span>
              {snapshot && snapshot.plan ? <span className="vc-plan-badge">{snapshot.plan}</span> : null}
            </div>
            {currentAccount ? (
              <button
                type="button"
                className="vc-acct-btn"
                title={accounts.length > 1 ? '点击切换预览账号' : currentAccount}
                onClick={() => accounts.length > 1 && setAcctIdx((i) => (i + 1) % accounts.length)}
              >
                <span className="vc-ellipsis">{currentAccount}</span>
                {accounts.length > 1 && AgyIcon ? <AgyIcon name="chevronDown" size={10} color="var(--agy-muted)" /> : null}
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className="vc-icon-btn"
            title="复制全部配额摘要"
            aria-label="复制全部配额摘要"
            disabled={!snapshot}
            style={{ opacity: snapshot ? 1 : 0.4 }}
            onClick={copySummary}
          >
            {AgyIcon ? <AgyIcon name={copiedSummary ? 'check' : 'copy'} size={14} color={copiedSummary ? 'var(--agy-success)' : 'var(--agy-muted)'} /> : null}
          </button>
          <button type="button" className="vc-icon-btn" title="刷新配额" aria-label="刷新配额" onClick={triggerRefresh}>
            <span className={inflight || spinning ? 'vc-spinning' : ''}>
              {AgyIcon ? <AgyIcon name="refresh" size={14} color="var(--agy-muted)" /> : null}
            </span>
          </button>
        </div>

        <div className="vc-divider" />

        {/* 2. 主体：加载骨架 / 异常态 / 2×2 矩阵聚焦驾驶舱 */}
        {!snapshot ? (
          errorMsg ? <CockpitProblem detail={errorMsg} AgyIcon={AgyIcon} onRetry={triggerRefresh} /> : <CockpitSkeleton />
        ) : (
          <div className="vc-body">
            {errorMsg ? (
              <div className="vc-err-banner">
                {AgyIcon ? <AgyIcon name="alert" size={13} color="var(--agy-danger)" /> : null}
                <span style={{ flex: 1, minWidth: 0 }}>{errorMsg}</span>
              </div>
            ) : null}

            {/* 3. 2×2 交互式配额矩阵（Top Bento Grid，零嵌套卡片） */}
            <div className="vc-matrix">
              {matrixBuckets.map((b) => {
                const isSelected = Boolean(activeBucket && activeBucket.key === b.key);
                const pct = vcClampPct(b.leftPct);
                const tColor = vcToneColor(b.tone, pct, toneColor);
                const isUrgent = b.tone === 'danger' || b.tone === 'warning' || pct <= 25;
                const activeBorder = isUrgent ? tColor : 'var(--agy-accent)';
                const isGem = vcIsGemini(`${b.groupKey || ''} ${b.groupTitle || ''}`);
                const delta = Number.isFinite(b.paceDelta) ? Math.round(b.paceDelta) : null;
                const deltaText = pct <= 0 ? '已耗尽' : delta !== null ? `${delta >= 0 ? '+' : ''}${delta}%` : null;
                const deltaColor = pct <= 0 ? 'var(--agy-danger)' : delta !== null && delta < 0 ? 'var(--agy-warning)' : 'var(--agy-success)';

                return (
                  <button
                    key={b.key}
                    type="button"
                    className={`vc-tile${isSelected ? ' vc-tile-active' : ''}`}
                    style={isSelected ? { borderColor: activeBorder } : undefined}
                    onClick={() => setActiveBucketKey(b.key)}
                    aria-pressed={isSelected}
                  >
                    <div className="vc-tile-top">
                      <div className="vc-tile-label-wrap">
                        {AgyIcon ? <AgyIcon name={isGem ? 'sparkle' : 'bot'} size={11} color={isSelected ? activeBorder : 'var(--agy-muted)'} /> : null}
                        <span className="vc-tile-micro">{vcMatrixMicroLabel(b)}</span>
                      </div>
                      {deltaText ? <span className="vc-tile-delta" style={{ color: deltaColor }}>{deltaText}</span> : null}
                    </div>

                    <div className="vc-tile-mid">
                      <span className="vc-tile-pct" style={{ color: isUrgent ? tColor : 'var(--agy-text)' }}>{pct}%</span>
                      <MiniRing leftPct={pct} color={tColor} size={22} />
                    </div>

                    {PaceBar ? (
                      <PaceBar leftPct={pct} paceLeftPct={b.paceLeftPct} elapsedPct={b.elapsedPct} tone={b.tone} showPace={showPaceTick} height={5} />
                    ) : null}

                    <div className="vc-tile-foot">
                      <span className="vc-tile-cd">
                        {AgyIcon ? <AgyIcon name="clock" size={10} color="var(--agy-muted)" /> : null}
                        {b.countdown || '—'}
                      </span>
                      <span className="vc-tile-reset">{b.resetLabel || b.resetStamp || ''}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 4. 下半区 Tabs / Segmented 切换器 */}
            <div className="vc-seg-wrap" role="tablist" aria-label="聚焦检视视图">
              <button type="button" role="tab" aria-selected={activeTab === 'trend'} className={`vc-seg-btn${activeTab === 'trend' ? ' vc-seg-btn-active' : ''}`} onClick={() => setActiveTab('trend')}>
                节奏与趋势
              </button>
              <button type="button" role="tab" aria-selected={activeTab === 'family'} className={`vc-seg-btn${activeTab === 'family' ? ' vc-seg-btn-active' : ''}`} onClick={() => setActiveTab('family')}>
                关联模型 ({familyData.totalCount})
              </button>
              <button type="button" role="tab" aria-selected={activeTab === 'all'} className={`vc-seg-btn${activeTab === 'all' ? ' vc-seg-btn-active' : ''}`} onClick={() => setActiveTab('all')}>
                全部模型 ({totalModelCount})
              </button>
            </div>

            {/* Tab 1：聚焦节奏与趋势检视器 */}
            {activeTab === 'trend' && activeBucket ? (
              <div className="vc-inspector">
                <div className="vc-insp-head">
                  <div className="vc-insp-title-wrap">
                    <span className="vc-dot" style={{ background: activeColor }} />
                    <span className="vc-insp-title vc-ellipsis">{activeBucket.fullTitle || `${activeBucket.groupTitle} · ${activeBucket.label}`}</span>
                  </div>
                  <span className="vc-insp-meta">
                    {activeBucket.resetLabel || activeBucket.resetStamp} 重置
                    {Number.isFinite(activeBucket.elapsedPct) ? ` · 时段已过 ${Math.round(activeBucket.elapsedPct)}%` : ''}
                  </span>
                </div>

                <div className="vc-verdict" style={{ borderLeft: `2.5px solid ${verdictColor}` }}>
                  {AgyIcon ? <AgyIcon name={verdict.level === 'success' ? 'sparkle' : 'alert'} size={13} color={verdictColor} /> : null}
                  <span style={{ flex: 1, minWidth: 0 }}>{verdict.text}</span>
                </div>

                <div className="vc-chart-box">
                  <div className="vc-chart-head">
                    <span className="vc-chart-title">消耗轨迹与预测</span>
                    <div className="vc-legend">
                      <span className="vc-legend-item">
                        <span style={{ width: 7, height: 2, borderRadius: 1, background: activeColor }} />
                        剩余
                      </span>
                      {showPaceTick ? (
                        <span className="vc-legend-item">
                          <span style={{ width: 7, height: 1.5, background: 'var(--agy-muted)', opacity: 0.65 }} />
                          匀速
                        </span>
                      ) : null}
                      <span className="vc-legend-item">
                        <span style={{ width: 9, height: 0, borderTop: `1.5px dashed ${verdict.level === 'success' ? 'var(--agy-success)' : 'var(--agy-warning)'}` }} />
                        预测
                      </span>
                    </div>
                  </div>

                  {TrendChartSVG ? <TrendChartSVG bucket={activeBucket} height={106} showPace={showPaceTick} showForecast={true} /> : null}

                  {showPastCycles && Array.isArray(activeBucket.pastCycles) && activeBucket.pastCycles.length > 0 && PastCyclesSVG ? (
                    <div className="vc-past-wrap">
                      <span className="vc-chart-title" style={{ fontWeight: 500 }}>历史周期结算余量</span>
                      <PastCyclesSVG pastCycles={activeBucket.pastCycles} height={54} />
                    </div>
                  ) : null}
                </div>

                {familyData.list.length > 0 ? (
                  <div className="vc-quick-wrap">
                    <div className="vc-quick-head">
                      <span>快捷复制 · {familyData.groupTitle}</span>
                      <button type="button" className="vc-link-btn" onClick={() => setActiveTab('family')}>
                        全部 {familyData.totalCount} 个 →
                      </button>
                    </div>
                    <div className="vc-chips">
                      {familyData.list.slice(0, 4).map((m) => {
                        const isCopied = copiedId === m.id;
                        return (
                          <button
                            key={`quick-${m.id}`}
                            type="button"
                            className={`vc-chip${isCopied ? ' vc-chip-copied' : ''}`}
                            title={`点击复制 ${m.displayName || m.id} (${m.id})`}
                            onClick={() => triggerCopy(m.id, m.id)}
                          >
                            {isCopied && AgyIcon ? <AgyIcon name="check" size={10} color="var(--agy-accent-text)" /> : null}
                            <span className="vc-ellipsis">{m.id}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Tab 2：当前聚焦分组的关联模型 */}
            {activeTab === 'family' && activeBucket ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="vc-insp-head">
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>{familyData.groupTitle}</span>
                  <span className="vc-insp-meta">点击上方 2×2 卡片可切换分组</span>
                </div>

                <div className="vc-search-box">
                  {AgyIcon ? <AgyIcon name="search" size={12} color="var(--agy-muted)" /> : null}
                  <input
                    type="text"
                    className="vc-search-input"
                    value={familyQuery}
                    onChange={(e) => setFamilyQuery(e.target.value)}
                    placeholder={`搜索 ${familyData.groupTitle} 模型名称或 ID…`}
                  />
                  {familyQuery ? (
                    <button type="button" className="vc-clear-btn" onClick={() => setFamilyQuery('')} aria-label="清除搜索">×</button>
                  ) : null}
                </div>

                {!filteredFamilyModels.length ? (
                  <div className="vc-empty">没有匹配的模型，请调整搜索关键词。</div>
                ) : (
                  <div className="vc-list-box">
                    {filteredFamilyModels.map((m) => {
                      const isCopied = copiedId === m.id;
                      const mPct = vcClampPct(Number.isFinite(m.leftPct) ? m.leftPct : activeBucket.leftPct);
                      const mColor = vcToneColor(m.tone, mPct, toneColor);
                      return (
                        <button
                          key={`fam-${m.id}`}
                          type="button"
                          className={`vc-row-item${isCopied ? ' vc-row-item-copied' : ''}`}
                          onClick={() => triggerCopy(m.id, m.id)}
                          title={`点击复制模型 ID: ${m.id}`}
                        >
                          {AgyIcon ? <AgyIcon name={vcIsGemini(`${m.id} ${m.displayName}`) ? 'sparkle' : 'bot'} size={13} color={isCopied ? 'var(--agy-accent)' : 'var(--agy-muted)'} /> : null}
                          <div className="vc-row-main">
                            <span className="vc-row-name vc-ellipsis" style={isCopied ? { color: 'var(--agy-accent)' } : undefined}>{m.displayName || m.id}</span>
                            <span className="vc-row-id vc-ellipsis">{m.id}</span>
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 650, color: mColor, flexShrink: 0 }}>{mPct}%</span>
                          {AgyIcon ? <AgyIcon name={isCopied ? 'check' : 'copy'} size={12} color={isCopied ? 'var(--agy-success)' : 'var(--agy-muted)'} /> : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                {!familyQuery && familyData.totalCount > filteredFamilyModels.length ? (
                  <div style={{ fontSize: 10.5, color: 'var(--agy-muted)', padding: '0 4px' }}>
                    已展示最新 {filteredFamilyModels.length} 个代表模型（该分组共 {familyData.totalCount} 个）。
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Tab 3：全部模型（最新优先 2 列紧凑网格） */}
            {activeTab === 'all' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="vc-search-box">
                  {AgyIcon ? <AgyIcon name="search" size={12} color="var(--agy-muted)" /> : null}
                  <input
                    type="text"
                    className="vc-search-input"
                    value={allQuery}
                    onChange={(e) => setAllQuery(e.target.value)}
                    placeholder={`搜索全部 ${totalModelCount} 个模型名称或 ID…`}
                  />
                  {allQuery ? (
                    <button type="button" className="vc-clear-btn" onClick={() => setAllQuery('')} aria-label="清除搜索">×</button>
                  ) : null}
                </div>

                {!filteredAllModels.length ? (
                  <div className="vc-empty">没有匹配的模型，请调整搜索关键词。</div>
                ) : (
                  <div className="vc-model-grid" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                    {filteredAllModels.map((m) => {
                      const isCopied = copiedId === m.id;
                      const mPct = vcClampPct(m.leftPct);
                      const mColor = vcToneColor(m.tone, mPct, toneColor);
                      return (
                        <button
                          key={`all-${m.id}`}
                          type="button"
                          className={`vc-model-card${isCopied ? ' vc-model-card-copied' : ''}`}
                          onClick={() => triggerCopy(m.id, m.id)}
                          title={`点击复制模型 ID: ${m.id}`}
                        >
                          <div className="vc-tile-top">
                            <span className="vc-ellipsis" style={{ fontSize: 11.5, fontWeight: 600, color: isCopied ? 'var(--agy-accent)' : 'var(--agy-text)' }}>
                              {m.displayName || m.id}
                            </span>
                            <span style={{ fontSize: 10.5, fontWeight: 650, color: mColor, flexShrink: 0 }}>{mPct}%</span>
                          </div>

                          <div className={`vc-card-id-pill${isCopied ? ' vc-card-id-pill-copied' : ''}`}>
                            {isCopied && AgyIcon ? <AgyIcon name="check" size={9} color="var(--agy-accent-text)" /> : null}
                            <span className="vc-ellipsis">{m.id}</span>
                          </div>

                          {PaceBar ? (
                            <PaceBar leftPct={mPct} paceLeftPct={m.paceLeftPct} elapsedPct={m.elapsedPct} tone={m.tone} showPace={Boolean(showPaceTick && Number.isFinite(m.paceLeftPct))} height={4} />
                          ) : null}

                          <div className="vc-tile-foot" style={{ fontSize: 9.5, color: 'var(--agy-muted)' }}>
                            <span className="vc-ellipsis">{m.resetLabel || m.resetStamp || ''}</span>
                            <span style={{ flexShrink: 0, fontWeight: 500 }}>{m.countdown || ''}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        <div className="vc-divider" />

        {/* 5. Footer：后端域名 + 当前聚焦提示 + 更新状态 */}
        <div className="vc-footer">
          <span className="vc-ellipsis" style={{ flex: 1 }}>
            {(snapshot && snapshot.origin) || 'daily-cloudcode-pa.googleapis.com'}
          </span>
          {activeBucket ? (
            <span className="vc-footer-hint">
              聚焦: {activeBucket.shortLabel || `${activeBucket.shortGroup} ${activeBucket.label}`}
            </span>
          ) : null}
          <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {snapshot ? snapshot.updatedText || '刚刚更新' : errorMsg ? '加载失败' : '加载中…'}
          </span>
        </div>
      </div>
    );
  }

  window.VariantCCockpit = VariantCCockpit;
})();
