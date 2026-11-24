/**
 * [INPUT]: 依赖全局 React 与 Antigravity UI Options.html 注入的 --agy-* 语义 CSS 变量
 * [OUTPUT]: 导出 window.AGY_SHARED（SCENARIOS、AgyIcon、toneColor、DonutGauge、PaceBar、TrendChartSVG、PastCyclesSVG、SurfaceShowcase）
 * [POS]: designs/antigravity-ui 的共享模拟数据与原生风基础组件库，供 app.jsx 及 variant-a/b/c.jsx 统一消费
 * [PROTOCOL]: Update this header on change, then check GEMINI.md
 */

(function initAntigravityShared() {
  const { useState, useId } = React;

  // ── 语义配色与格式化 ─────────────────────────────────────────
  function toneKeyFromPct(leftPct) {
    if (typeof leftPct !== 'number' || Number.isNaN(leftPct)) return 'muted';
    if (leftPct <= 10) return 'danger';
    if (leftPct <= 30) return 'warning';
    return 'success';
  }

  function toneColor(value) {
    if (typeof value === 'string') {
      const map = { danger: 'var(--agy-danger)', warning: 'var(--agy-warning)', success: 'var(--agy-success)', accent: 'var(--agy-accent)', muted: 'var(--agy-muted)' };
      return map[value] || value;
    }
    const key = toneKeyFromPct(value);
    return key === 'danger' ? 'var(--agy-danger)' : key === 'warning' ? 'var(--agy-warning)' : key === 'success' ? 'var(--agy-success)' : 'var(--agy-muted)';
  }

  function clampPct(v) {
    return typeof v === 'number' && !Number.isNaN(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
  }

  // ── 合成数据构造（仅使用合成账号 dev@workspace.ai，无真实凭据） ──
  const BUCKET_META = {
    '3p-weekly':     { groupKey: '3p',     family: '3p',     groupTitle: 'Claude & GPT',  shortGroup: 'C&G', shortLabel: 'C&G 周', label: 'WEEKLY', fullTitle: 'Claude & GPT · WEEKLY' },
    'gemini-5h':     { groupKey: 'gemini', family: 'gemini', groupTitle: 'Gemini Models', shortGroup: 'Gem', shortLabel: 'Gem 5H', label: '5H',     fullTitle: 'Gemini Models · 5H' },
    'gemini-weekly': { groupKey: 'gemini', family: 'gemini', groupTitle: 'Gemini Models', shortGroup: 'Gem', shortLabel: 'Gem 周', label: 'WEEKLY', fullTitle: 'Gemini Models · WEEKLY' },
    '3p-5h':         { groupKey: '3p',     family: '3p',     groupTitle: 'Claude & GPT',  shortGroup: 'C&G', shortLabel: 'C&G 5H', label: '5H',     fullTitle: 'Claude & GPT · 5H' },
  };

  function makeBucket(key, cfg) {
    const meta = BUCKET_META[key];
    return {
      key,
      ...meta,
      title: meta.fullTitle,
      leftPct: cfg.leftPct,
      elapsedPct: cfg.elapsedPct,
      paceLeftPct: cfg.paceLeftPct,
      paceDelta: cfg.paceDelta,
      runsOutText: cfg.runsOutText || null,
      countdown: cfg.countdown,
      resetLabel: cfg.resetLabel,
      resetStamp: cfg.resetLabel,
      tone: cfg.tone,
      samples: cfg.samples.map(([x, left, pace]) => ({ x, left, pace })),
      forecast: cfg.forecast.map(([x, left]) => ({ x, left })),
      pastCycles: cfg.pastCycles.map(([label, left, current]) => ({ label, left, current: Boolean(current) })),
    };
  }

  const MODEL_CATALOG = [
    ['gemini-4-argon-high',     'Gemini 4 Argon (High)',     'gemini', true,  'Gemini 4 系列',        true,  false, 'gemini-5h'],
    ['gemini-4-carbon-high',    'Gemini 4 Carbon (High)',    'gemini', true,  'Gemini 4 系列',        true,  false, 'gemini-5h'],
    ['gemini-4-neon-high',      'Gemini 4 Neon (High)',      'gemini', true,  'Gemini 4 系列',        false, false, 'gemini-5h'],
    ['gemini-4-hydrogen-xhigh', 'Gemini 4 Hydrogen (xHigh)', 'gemini', true,  'Gemini 4 系列',        false, false, 'gemini-weekly'],
    ['claude-opus-5-5-high',    'Claude Opus 5.5 (High)',    '3p',     false, 'Claude & GPT 旗舰',    true,  false, '3p-weekly'],
    ['claude-sonnet-5-5-high',  'Claude Sonnet 5.5 (High)',  '3p',     false, 'Claude & GPT 旗舰',    true,  false, '3p-weekly'],
    ['gpt-oss-120b-medium',     'GPT OSS 120B (Medium)',     '3p',     false, 'Claude & GPT 旗舰',    false, false, '3p-5h'],
    ['gemini-3.8-flash-high',   'Gemini 3.8 Flash (High)',   'gemini', true,  'Gemini 3 / 2.5 & 工具', false, false, 'gemini-5h'],
    ['gemini-3.1-pro',          'Gemini 3.1 Pro',            'gemini', true,  'Gemini 3 / 2.5 & 工具', false, false, 'gemini-weekly'],
    ['gemini-2.5-pro',          'Gemini 2.5 Pro',            'gemini', true,  'Gemini 3 / 2.5 & 工具', false, false, 'gemini-weekly'],
    ['claude-haiku-4-5',        'Claude Haiku 4.5',          '3p',     false, 'Claude & GPT 轻量',    false, false, '3p-5h'],
    ['tab_flash_lite_preview',  'Tab Flash Lite Preview',    'gemini', true,  'Gemini 3 / 2.5 & 工具', false, true,  'gemini-5h'],
  ];

  function buildSnapshot(updatedText, bucketsList) {
    const byKey = {};
    bucketsList.forEach((b) => { byKey[b.key] = b; });
    const sortedBuckets = [...bucketsList].sort((a, b) => a.leftPct - b.leftPct);
    const models = MODEL_CATALOG.map(([id, displayName, fam, isPrimary, tier, recommended, isUtility, bKey]) => {
      const b = byKey[bKey];
      return {
        id, displayName, family: fam, groupKey: fam, isPrimary, tier, recommended, isUtility,
        bucketKey: b.key, windowLabel: b.label, leftPct: b.leftPct, elapsedPct: b.elapsedPct,
        paceLeftPct: b.paceLeftPct, paceDelta: b.paceDelta, countdown: b.countdown,
        resetLabel: b.resetLabel, resetStamp: b.resetStamp, tone: b.tone,
      };
    });
    const groups = [
      { key: 'gemini', family: 'gemini', title: 'Gemini Models', shortTitle: 'Gemini', modelCount: 29, buckets: [byKey['gemini-5h'], byKey['gemini-weekly']], models: models.filter((m) => m.groupKey === 'gemini') },
      { key: '3p', family: '3p', title: 'Claude & GPT', shortTitle: 'C&G', modelCount: 7, buckets: [byKey['3p-5h'], byKey['3p-weekly']], models: models.filter((m) => m.groupKey === '3p') },
    ];
    return {
      plan: 'AI Ultra 20x',
      accountLabel: 'dev@workspace.ai',
      accounts: ['dev@workspace.ai', 'team@workspace.ai'],
      origin: 'daily-cloudcode-pa.googleapis.com',
      updatedText,
      refreshInterval: '15m',
      totalModels: 38,
      buckets: sortedBuckets,
      groups,
      models,
    };
  }

  const URGENT_SNAPSHOT = buildSnapshot('刚刚更新', [
    makeBucket('3p-weekly', {
      leftPct: 15, elapsedPct: 11, paceLeftPct: 89, paceDelta: -74, runsOutText: '按当前速率预计周三耗尽',
      countdown: '6d 5h', resetLabel: '周一 19:30', tone: 'warning',
      samples: [[0, 100, 100], [0.02, 82, 98], [0.05, 54, 95], [0.08, 31, 92], [0.11, 15, 89]],
      forecast: [[0.11, 15], [0.24, 0]],
      pastCycles: [['W-4', 34], ['W-3', 19], ['W-2', 46], ['W-1', 8], ['本周', 15, true]],
    }),
    makeBucket('gemini-5h', {
      leftPct: 88, elapsedPct: 61, paceLeftPct: 39, paceDelta: 49, runsOutText: null,
      countdown: '1h 56m', resetLabel: '15:30', tone: 'success',
      samples: [[0, 100, 100], [0.16, 97, 84], [0.32, 93, 68], [0.48, 90, 52], [0.61, 88, 39]],
      forecast: [[0.61, 88], [1, 80]],
      pastCycles: [['前4', 72], ['前3', 64], ['前2', 91], ['上轮', 79], ['当前', 88, true]],
    }),
    makeBucket('gemini-weekly', {
      leftPct: 95, elapsedPct: 6, paceLeftPct: 94, paceDelta: 1, runsOutText: null,
      countdown: '6d 14h', resetLabel: '周二 04:04', tone: 'success',
      samples: [[0, 100, 100], [0.02, 98, 98], [0.04, 96, 96], [0.06, 95, 94]],
      forecast: [[0.06, 95], [1, 54]],
      pastCycles: [['W-4', 62], ['W-3', 58], ['W-2', 74], ['W-1', 69], ['本周', 95, true]],
    }),
    makeBucket('3p-5h', {
      leftPct: 100, elapsedPct: 1, paceLeftPct: 99, paceDelta: 1, runsOutText: null,
      countdown: '4h 59m', resetLabel: '18:33', tone: 'success',
      samples: [[0, 100, 100], [0.01, 100, 99]],
      forecast: [[0.01, 100], [1, 72]],
      pastCycles: [['前4', 26], ['前3', 44], ['前2', 18], ['上轮', 52], ['当前', 100, true]],
    }),
  ]);

  const HEALTHY_SNAPSHOT = buildSnapshot('1 分钟前更新', [
    makeBucket('gemini-5h', {
      leftPct: 74, elapsedPct: 48, paceLeftPct: 52, paceDelta: 22, runsOutText: null,
      countdown: '2h 36m', resetLabel: '16:10', tone: 'success',
      samples: [[0, 100, 100], [0.16, 91, 84], [0.32, 82, 68], [0.48, 74, 52]],
      forecast: [[0.48, 74], [1, 46]],
      pastCycles: [['前4', 68], ['前3', 77], ['前2', 84], ['上轮', 71], ['当前', 74, true]],
    }),
    makeBucket('3p-weekly', {
      leftPct: 81, elapsedPct: 36, paceLeftPct: 64, paceDelta: 17, runsOutText: null,
      countdown: '4d 11h', resetLabel: '周一 19:30', tone: 'success',
      samples: [[0, 100, 100], [0.12, 94, 88], [0.24, 87, 76], [0.36, 81, 64]],
      forecast: [[0.36, 81], [1, 48]],
      pastCycles: [['W-4', 55], ['W-3', 62], ['W-2', 70], ['W-1', 64], ['本周', 81, true]],
    }),
    makeBucket('3p-5h', {
      leftPct: 92, elapsedPct: 24, paceLeftPct: 76, paceDelta: 16, runsOutText: null,
      countdown: '3h 48m', resetLabel: '17:22', tone: 'success',
      samples: [[0, 100, 100], [0.12, 96, 88], [0.24, 92, 76]],
      forecast: [[0.24, 92], [1, 67]],
      pastCycles: [['前4', 78], ['前3', 82], ['前2', 74], ['上轮', 88], ['当前', 92, true]],
    }),
    makeBucket('gemini-weekly', {
      leftPct: 96, elapsedPct: 22, paceLeftPct: 78, paceDelta: 18, runsOutText: null,
      countdown: '5d 10h', resetLabel: '周二 04:04', tone: 'success',
      samples: [[0, 100, 100], [0.11, 98, 89], [0.22, 96, 78]],
      forecast: [[0.22, 96], [1, 82]],
      pastCycles: [['W-4', 81], ['W-3', 79], ['W-2', 88], ['W-1', 84], ['本周', 96, true]],
    }),
  ]);

  const EXHAUSTED_SNAPSHOT = buildSnapshot('刚刚更新', [
    makeBucket('3p-5h', {
      leftPct: 0, elapsedPct: 68, paceLeftPct: 32, paceDelta: -32, runsOutText: '当前窗口已耗尽',
      countdown: '1h 36m', resetLabel: '15:10', tone: 'danger',
      samples: [[0, 100, 100], [0.22, 62, 78], [0.44, 24, 56], [0.58, 4, 42], [0.68, 0, 32]],
      forecast: [[0.68, 0], [1, 0]],
      pastCycles: [['前4', 14], ['前3', 6], ['前2', 22], ['上轮', 4], ['当前', 0, true]],
    }),
    makeBucket('3p-weekly', {
      leftPct: 6, elapsedPct: 42, paceLeftPct: 58, paceDelta: -52, runsOutText: '按当前速率预计今日耗尽',
      countdown: '4d 2h', resetLabel: '周一 19:30', tone: 'danger',
      samples: [[0, 100, 100], [0.14, 61, 86], [0.28, 28, 72], [0.42, 6, 58]],
      forecast: [[0.42, 6], [0.48, 0]],
      pastCycles: [['W-4', 18], ['W-3', 11], ['W-2', 24], ['W-1', 3], ['本周', 6, true]],
    }),
    makeBucket('gemini-5h', {
      leftPct: 18, elapsedPct: 54, paceLeftPct: 46, paceDelta: -28, runsOutText: '按当前速率预计 14:40 耗尽',
      countdown: '2h 18m', resetLabel: '15:52', tone: 'warning',
      samples: [[0, 100, 100], [0.18, 72, 82], [0.36, 42, 64], [0.54, 18, 46]],
      forecast: [[0.54, 18], [0.69, 0]],
      pastCycles: [['前4', 38], ['前3', 29], ['前2', 45], ['上轮', 26], ['当前', 18, true]],
    }),
    makeBucket('gemini-weekly', {
      leftPct: 64, elapsedPct: 38, paceLeftPct: 62, paceDelta: 2, runsOutText: null,
      countdown: '4d 8h', resetLabel: '周二 04:04', tone: 'success',
      samples: [[0, 100, 100], [0.14, 86, 86], [0.26, 74, 74], [0.38, 64, 62]],
      forecast: [[0.38, 64], [1, 16]],
      pastCycles: [['W-4', 54], ['W-3', 48], ['W-2', 66], ['W-1', 59], ['本周', 64, true]],
    }),
  ]);

  const SCENARIOS = {
    urgent:    { scenarioKey: 'urgent',    label: '15% 紧迫态',   snapshot: URGENT_SNAPSHOT,    inflight: false, error: '' },
    healthy:   { scenarioKey: 'healthy',   label: '充裕健康态',   snapshot: HEALTHY_SNAPSHOT,   inflight: false, error: '' },
    exhausted: { scenarioKey: 'exhausted', label: '0% 耗尽态',    snapshot: EXHAUSTED_SNAPSHOT, inflight: false, error: '' },
    loading:   { scenarioKey: 'loading',   label: '骨架加载态',   snapshot: null,               inflight: true,  error: '' },
    error:     { scenarioKey: 'error',     label: '令牌过期异常', snapshot: null,               inflight: false, error: '登录令牌已过期（请在终端运行一次 agy 续期后点击右上角刷新，或在设置中配置 OAuth Client Secret）。' },
  };

  // ── AgyIcon：Crisp 矢量图标集 ─────────────────────────────────
  function AgyIcon({ name = 'mark', size = 14, color = 'currentColor', style = {}, className = '' }) {
    const p = {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color,
      strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', className,
      style: { display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', ...style },
      'aria-hidden': 'true',
    };
    const icons = {
      mark: <svg {...p}><path d="M12 2.5 14.4 9.6 21.5 12 14.4 14.4 12 21.5 9.6 14.4 2.5 12 9.6 9.6Z" /><circle cx="18.5" cy="5.5" r="1.4" fill={color} stroke="none" /></svg>,
      sparkle: <svg {...p} fill={color} stroke="none"><path d="M12 2.8 14.3 9.7 21.2 12 14.3 14.3 12 21.2 9.7 14.3 2.8 12 9.7 9.7Z" /></svg>,
      bot: <svg {...p}><rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 4v4M8 4h8" /><circle cx="9.2" cy="13.5" r="0.9" fill={color} stroke="none" /><circle cx="14.8" cy="13.5" r="0.9" fill={color} stroke="none" /></svg>,
      refresh: <svg {...p}><path d="M20.5 12a8.5 8.5 0 1 1-8.5-8.5c2.4 0 4.6 1 6.3 2.6L20.5 8" /><path d="M20.5 3.5V8H16" /></svg>,
      copy: <svg {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
      clock: <svg {...p}><circle cx="12" cy="12" r="9.2" /><polyline points="12 6.8 12 12 15.6 14" /></svg>,
      alert: <svg {...p}><circle cx="12" cy="12" r="9.2" /><path d="M12 7.5v5" /><circle cx="12" cy="16.2" r="0.9" fill={color} stroke="none" /></svg>,
      search: <svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></svg>,
      chevronDown: <svg {...p}><path d="m6 9 6 6 6-6" /></svg>,
      chevronRight: <svg {...p}><path d="m9 6 6 6-6 6" /></svg>,
      check: <svg {...p}><path d="M5 12.5 9.8 17.2 19 8" /></svg>,
    };
    return icons[name] || icons.mark;
  }

  // ── DonutGauge：对齐官方 claude-code.bar 的环形仪表 ────────────
  function DonutGauge({ leftPct = 0, label = '', sublabel = '', countdown = '', resetLabel = '', size = 98, strokeWidth = 8, tone, active = false, onClick }) {
    const pct = clampPct(leftPct);
    const resolvedTone = tone || toneKeyFromPct(pct);
    const strokeColor = toneColor(resolvedTone);
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct / 100);
    const pctSize = Math.max(15, Math.round(size * 0.24));
    const subSize = Math.max(9, Math.round(size * 0.105));

    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: onClick ? 'pointer' : 'default', userSelect: 'none' }}
      >
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--agy-track)" strokeWidth={strokeWidth} />
            {pct > 0 && (
              <circle
                cx={size / 2} cy={size / 2} r={r} fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
                strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 280ms cubic-bezier(.2,.8,.2,1), stroke 200ms ease' }}
              />
            )}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, pointerEvents: 'none' }}>
            <span className="agy-tnum" style={{ fontSize: pctSize, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em', color: resolvedTone === 'success' ? 'var(--agy-text)' : strokeColor }}>
              {pct}%
            </span>
            {sublabel && <span style={{ fontSize: subSize, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--agy-muted)', lineHeight: 1.1 }}>{sublabel}</span>}
          </div>
        </div>
        {(label || countdown || resetLabel) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0, maxWidth: '100%' }}>
            {label && <div style={{ fontSize: 11.5, fontWeight: active ? 650 : 600, color: active ? 'var(--agy-accent)' : 'var(--agy-text)', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{label}</div>}
            {(countdown || resetLabel) && (
              <div className="agy-tnum" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--agy-muted)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                <AgyIcon name="clock" size={10.5} color="var(--agy-muted)" />
                <span>{countdown}{resetLabel ? ` · ${resetLabel}` : ''}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── PaceBar：配额条 + 2px Even-Pace 匀速参考刻度 ───────────────
  function PaceBar({ leftPct = 0, paceLeftPct, showPace = true, height = 6, tone, elapsedPct }) {
    const pct = clampPct(leftPct);
    const fillColor = toneColor(tone || pct);
    const hasPace = showPace && typeof paceLeftPct === 'number' && !Number.isNaN(paceLeftPct);
    const pacePos = hasPace ? Math.max(1, Math.min(99, paceLeftPct)) : 0;
    const tip = hasPace
      ? `匀速参考线：此时段应剩 ${Math.round(paceLeftPct)}%${typeof elapsedPct === 'number' ? `（时段已过 ${Math.round(elapsedPct)}%）` : ''}`
      : undefined;

    return (
      <div title={tip} style={{ position: 'relative', width: '100%', height, borderRadius: height / 2, background: 'var(--agy-track)', overflow: 'visible' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: pct > 0 ? `${Math.max(pct, 2)}%` : '0%', borderRadius: height / 2, background: fillColor, transition: 'width 240ms cubic-bezier(.2,.8,.2,1), background 200ms ease' }} />
        {hasPace && (
          <div aria-label={tip} style={{ position: 'absolute', left: `calc(${pacePos}% - 1px)`, top: -2, bottom: -2, width: 2, borderRadius: 1, background: 'var(--agy-pace-tick)', boxShadow: '0 0 0 1px var(--agy-bg)', pointerEvents: 'none' }} />
        )}
      </div>
    );
  }

  // ── TrendChartSVG：剩余配额曲线 + 匀速线 + 预测虚线 ─────────────
  function TrendChartSVG({ bucket, height = 108, showPace = true, showForecast = true }) {
    const rawId = useId();
    const gradId = 'agy-tg-' + String(rawId).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!bucket) return null;

    const width = 360, padL = 30, padR = 10, padT = 10, padB = 20;
    const plotW = width - padL - padR;
    const plotH = Math.max(40, height - padT - padB);
    const sx = (x) => padL + Math.max(0, Math.min(1, x)) * plotW;
    const sy = (pct) => padT + (1 - Math.max(0, Math.min(100, pct)) / 100) * plotH;

    const strokeColor = toneColor(bucket.tone || bucket.leftPct);
    const samples = Array.isArray(bucket.samples) && bucket.samples.length ? bucket.samples : [{ x: 0, left: 100 }, { x: 0.5, left: bucket.leftPct }];
    const forecast = Array.isArray(bucket.forecast) ? bucket.forecast : [];
    const lineD = samples.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${sx(pt.x).toFixed(1)} ${sy(pt.left).toFixed(1)}`).join(' ');
    const lastPt = samples[samples.length - 1];
    const areaD = `${lineD} L ${sx(lastPt.x).toFixed(1)} ${sy(0).toFixed(1)} L ${sx(samples[0].x).toFixed(1)} ${sy(0).toFixed(1)} Z`;
    const forecastD = showForecast && forecast.length >= 2 ? forecast.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${sx(pt.x).toFixed(1)} ${sy(pt.left).toFixed(1)}`).join(' ') : '';
    const forecastEnd = forecast.length >= 2 ? forecast[forecast.length - 1] : null;
    const forecastColor = bucket.runsOutText ? toneColor(bucket.tone === 'danger' ? 'danger' : 'warning') : 'var(--agy-success)';
    const nowX = sx(lastPt.x), nowY = sy(lastPt.left);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.24" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[100, 50, 0].map((tick) => {
          const y = sy(tick);
          return (
            <g key={tick}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--agy-border)" strokeWidth="1" strokeDasharray={tick === 0 ? undefined : '2.5 3'} />
              <text x={padL - 5} y={y + 3} textAnchor="end" fill="var(--agy-muted)" fontSize="9" style={{ fontVariantNumeric: 'tabular-nums' }}>{tick}%</text>
            </g>
          );
        })}
        {showPace && <line x1={sx(0)} y1={sy(100)} x2={sx(1)} y2={sy(0)} stroke="var(--agy-muted)" strokeOpacity="0.48" strokeWidth="1.2" strokeDasharray="4 4" />}
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={lineD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {forecastD && (
          <g>
            <path d={forecastD} fill="none" stroke={forecastColor} strokeWidth="1.6" strokeDasharray="3.5 3.5" strokeLinecap="round" />
            {forecastEnd && <circle cx={sx(forecastEnd.x)} cy={sy(forecastEnd.left)} r="2.6" fill="var(--agy-bg)" stroke={forecastColor} strokeWidth="1.6" />}
          </g>
        )}
        <line x1={nowX} y1={nowY} x2={nowX} y2={sy(0)} stroke={strokeColor} strokeOpacity="0.28" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx={nowX} cy={nowY} r="5.5" fill={strokeColor} fillOpacity="0.18" />
        <circle cx={nowX} cy={nowY} r="3" fill={strokeColor} stroke="var(--agy-bg)" strokeWidth="1.4" />
        <text x={padL} y={height - 4} textAnchor="start" fill="var(--agy-muted)" fontSize="9">周期起点</text>
        <text x={Math.max(padL + 74, Math.min(width - padR - 114, nowX))} y={height - 4} textAnchor="middle" fill="var(--agy-text)" fillOpacity="0.72" fontSize="9" fontWeight="600">当前 {clampPct(bucket.leftPct)}%</text>
        <text x={width - padR} y={height - 4} textAnchor="end" fill="var(--agy-muted)" fontSize="9">重置 {bucket.resetLabel || ''}</text>
      </svg>
    );
  }

  // ── PastCyclesSVG：历史周期结余对比迷你柱状图 ──────────────────
  function PastCyclesSVG({ pastCycles = [], height = 56 }) {
    if (!Array.isArray(pastCycles) || !pastCycles.length) return null;
    const width = 360, padL = 6, padR = 6, padT = 14, padB = 15;
    const plotW = width - padL - padR, plotH = Math.max(18, height - padT - padB);
    const slotW = plotW / pastCycles.length, barW = Math.min(34, slotW * 0.54);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ display: 'block' }}>
        <line x1={padL} y1={padT + plotH} x2={width - padR} y2={padT + plotH} stroke="var(--agy-border)" strokeWidth="1" />
        {pastCycles.map((item, idx) => {
          const pct = clampPct(item.left);
          const barH = Math.max(pct > 0 ? 3 : 1.5, (pct / 100) * plotH);
          const cx = padL + idx * slotW + slotW / 2;
          const fill = toneColor(pct);
          return (
            <g key={`${item.label}-${idx}`}>
              <rect x={cx - barW / 2} y={padT + plotH - barH} width={barW} height={barH} rx="3" fill={fill} fillOpacity={item.current ? 0.92 : 0.42} stroke={item.current ? fill : 'none'} strokeWidth={item.current ? 1 : 0} />
              <text x={cx} y={padT + plotH - barH - 3.5} textAnchor="middle" fill={item.current ? 'var(--agy-text)' : 'var(--agy-muted)'} fontSize="8.5" fontWeight={item.current ? '650' : '500'} style={{ fontVariantNumeric: 'tabular-nums' }}>{pct}%</text>
              <text x={cx} y={height - 2.5} textAnchor="middle" fill={item.current ? 'var(--agy-text)' : 'var(--agy-muted)'} fontSize="8.5" fontWeight={item.current ? '600' : '400'}>{item.label}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  // ── SurfaceShowcase：Menu Bar / Notch / 桌面小组件全表面预览 ────
  function MenuBarSurfaceCard({ data, settings }) {
    const snap = data && data.snapshot;
    const lead = snap && snap.buckets && snap.buckets[0];
    const [menuOpen, setMenuOpen] = useState(true);
    const isDark = !settings || settings.theme !== 'light';
    const leadPct = lead ? `${clampPct(lead.leftPct)}%` : data && data.error ? '!' : '…';
    const leadTone = lead ? toneColor(lead.tone || lead.leftPct) : data && data.error ? 'var(--agy-danger)' : 'var(--agy-muted)';

    return (
      <div style={{ padding: 18, background: isDark ? 'linear-gradient(145deg,#1b2234,#141822 52%,#1d1b29)' : 'linear-gradient(145deg,#dce8f8,#eef2f9 55%,#e6e3f5)', color: 'var(--agy-text)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.62)' : 'rgba(15,23,42,0.58)' }}>macOS Sequoia 菜单栏托盘 · 极简图标 + 最低余量百分比</div>
        <div style={{ height: 30, borderRadius: 8, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(24,26,33,0.78)' : 'rgba(255,255,255,0.74)', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(15,23,42,0.08)', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7, fontWeight: 500 }}><span style={{ fontWeight: 700 }}>Finder</span><span>文件</span><span>编辑</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => setMenuOpen((o) => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 7px', borderRadius: 5, border: 'none', cursor: 'pointer', background: menuOpen ? (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.1)') : 'transparent', color: isDark ? '#fff' : '#14161a', font: 'inherit', fontSize: 12, fontWeight: 650 }}>
              <AgyIcon name="mark" size={13} color={lead && lead.leftPct <= 30 ? leadTone : 'currentColor'} />
              <span className="agy-tnum" style={{ color: lead && lead.leftPct <= 30 ? leadTone : 'currentColor' }}>{leadPct}</span>
            </button>
            <span className="agy-tnum" style={{ fontSize: 11.5, opacity: 0.72 }}>周二 13:34</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, padding: '9px 11px', borderRadius: 9, background: 'var(--agy-bg)', border: '1px solid var(--agy-border)', fontSize: 11, lineHeight: 1.5, color: 'var(--agy-muted)' }}>
            <div style={{ color: 'var(--agy-text)', fontWeight: 600, marginBottom: 2 }}>悬停 Tooltip</div>
            <div className="agy-tnum">{lead ? `Antigravity · ${lead.fullTitle} ${clampPct(lead.leftPct)}% · 剩余 ${lead.countdown} · ${snap.totalModels} 个模型` : data && data.error ? 'Antigravity · 认证异常，点击刷新或重试' : 'Antigravity · 正在同步最新配额…'}</div>
          </div>
          {menuOpen && (
            <div style={{ width: 148, padding: 4, borderRadius: 9, background: 'var(--agy-bg)', border: '1px solid var(--agy-border-strong)', boxShadow: '0 10px 26px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11.5 }}>
              <div style={{ padding: '5px 8px', borderRadius: 5, background: 'var(--agy-accent)', color: '#fff', fontWeight: 500 }}>打开配额面板</div>
              <div style={{ padding: '5px 8px', borderRadius: 5, color: 'var(--agy-text)' }}>立即刷新配额</div>
              <div style={{ padding: '5px 8px', borderRadius: 5, color: 'var(--agy-text)' }}>复制额度摘要</div>
              <div style={{ height: 1, background: 'var(--agy-border)', margin: '2px 4px' }} />
              <div style={{ padding: '4px 8px', fontSize: 10.5, color: 'var(--agy-muted)' }}>{snap ? snap.accountLabel : 'dev@workspace.ai'}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function NotchSurfaceCard({ data, settings }) {
    const [mode, setMode] = useState('expanded');
    const snap = data && data.snapshot;
    const buckets = (snap && snap.buckets) || [];
    const lead = buckets[0] || null;
    const isDark = !settings || settings.theme !== 'light';
    const leadColor = lead ? toneColor(lead.tone || lead.leftPct) : data && data.error ? '#f87171' : '#94a3b8';

    return (
      <div style={{ padding: 18, background: isDark ? 'linear-gradient(155deg,#161b29,#0f131b)' : 'linear-gradient(155deg,#dfe6f2,#edf1f8)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.68)' : 'rgba(15,23,42,0.62)' }}>Notch 刘海岛交互态</span>
          <div style={{ display: 'inline-flex', padding: 2, borderRadius: 7, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)', gap: 2 }}>
            {[['compact', 'Compact'], ['minimal', 'Minimal'], ['expanded', 'Expanded']].map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setMode(k)} style={{ border: 'none', cursor: 'pointer', padding: '3px 8px', borderRadius: 5, fontSize: 10.5, fontWeight: 600, background: mode === k ? (isDark ? 'rgba(255,255,255,0.18)' : '#fff') : 'transparent', color: mode === k ? (isDark ? '#fff' : '#14161a') : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.58)'), boxShadow: mode === k ? '0 1px 2px rgba(0,0,0,0.14)' : 'none' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div style={{ borderRadius: 12, padding: '0 14px 18px', background: isDark ? 'radial-gradient(circle at 50% 0%,rgba(79,158,255,0.16),rgba(16,19,26,0.92) 68%)' : 'radial-gradient(circle at 50% 0%,rgba(79,158,255,0.22),rgba(226,232,244,0.95) 70%)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 190 }}>
          {mode === 'minimal' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <div style={{ width: 124, height: 28, background: '#050608', borderRadius: '0 0 12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 8, height: 8, borderRadius: 4, background: '#171c26', border: '1px solid #262e3d' }} /></div>
              <div style={{ height: 26, padding: '0 8px', marginTop: 1, background: '#050608', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.34)' }}><AgyIcon name="mark" size={13} color={lead && lead.leftPct <= 30 ? leadColor : '#ffffff'} /></div>
            </div>
          )}
          {mode === 'compact' && (
            <div style={{ width: 214, height: 30, background: '#050608', borderRadius: '0 0 14px 14px', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 22px rgba(0,0,0,0.38)', color: '#fff' }}>
              <AgyIcon name="mark" size={14} color="#fff" />
              <div style={{ width: 8, height: 8, borderRadius: 4, background: '#171c26', border: '1px solid #262e3d' }} />
              <span className="agy-tnum" style={{ fontSize: 12, fontWeight: 700, color: lead && lead.leftPct <= 30 ? leadColor : '#fff' }}>{lead ? `${clampPct(lead.leftPct)}%` : data && data.error ? 'ERR' : '…'}</span>
            </div>
          )}
          {mode === 'expanded' && (
            <div data-theme="dark" style={{ width: '100%', background: '#08090c', color: 'rgba(255,255,255,0.92)', borderRadius: '0 0 20px 20px', padding: '8px 14px 14px', boxShadow: '0 16px 38px rgba(0,0,0,0.52)', display: 'flex', flexDirection: 'column', gap: 10, '--agy-bg': '#08090c', '--agy-border': 'rgba(255,255,255,0.1)', '--agy-track': 'rgba(255,255,255,0.13)', '--agy-text': 'rgba(255,255,255,0.94)', '--agy-muted': 'rgba(255,255,255,0.56)', '--agy-pace-tick': 'rgba(255,255,255,0.84)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AgyIcon name="mark" size={14} color="#4f9eff" /><span style={{ fontSize: 12, fontWeight: 650 }}>Antigravity</span></div>
                <div style={{ width: 9, height: 9, borderRadius: 5, background: '#171c26', border: '1px solid #262e3d' }} />
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)' }}>{snap ? snap.plan : '状态检查'}</span>
              </div>
              {!snap ? (
                <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,0.62)' }}>{data && data.error ? '令牌已过期，请在面板中刷新续期' : '正在加载 Antigravity 配额…'}</div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {buckets.slice(0, 3).map((b) => (
                      <div key={b.key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                          <span style={{ fontWeight: 550, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.fullTitle}</span>
                          <span className="agy-tnum" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{b.countdown}</span>
                          <span className="agy-tnum" style={{ fontWeight: 700, color: toneColor(b.tone || b.leftPct), width: 32, textAlign: 'right' }}>{clampPct(b.leftPct)}%</span>
                        </div>
                        <PaceBar leftPct={b.leftPct} paceLeftPct={b.paceLeftPct} elapsedPct={b.elapsedPct} showPace={!settings || settings.showPaceTick !== false} height={4} tone={b.tone} />
                      </div>
                    ))}
                  </div>
                  {lead && <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 }}><TrendChartSVG bucket={lead} height={68} showPace={!settings || settings.showPaceTick !== false} showForecast /></div>}
                </>
              )}
            </div>
          )}
          {mode !== 'expanded' && (
            <div style={{ marginTop: 48, fontSize: 11, color: isDark ? 'rgba(255,255,255,0.48)' : 'rgba(15,23,42,0.52)', textAlign: 'center', lineHeight: 1.5 }}>
              {mode === 'compact' ? '低余量（≤20%）自动在刘海两侧常驻提醒，点击即展开趋势卡片' : '当多个插件共享刘海时自动退让为极简品牌微标（带语义警戒色）'}
            </div>
          )}
        </div>
      </div>
    );
  }

  function WidgetsSurfaceCard({ data, settings }) {
    const snap = data && data.snapshot;
    const buckets = (snap && snap.buckets) || [];
    const lead = buckets[0] || null;
    const second = buckets[1] || null;
    const isDark = !settings || settings.theme !== 'light';
    const cardChrome = {
      borderRadius: 22, background: 'var(--agy-bg)', border: '1px solid var(--agy-border-strong)',
      boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.42)' : '0 10px 28px rgba(15,23,42,0.11)',
      padding: 14, color: 'var(--agy-text)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    };

    return (
      <div style={{ padding: 18, background: isDark ? 'linear-gradient(135deg,#1b2436,#161822 50%,#241b2e)' : 'linear-gradient(135deg,#dbe8fa,#eef2fb 50%,#ece4f7)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(15,23,42,0.6)' }}>macOS 桌面小组件 · Small (170×170) / Medium (360×170) / Large (360×350)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
          {/* Small 170x170 */}
          <div style={{ ...cardChrome, width: 170, height: 170, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><AgyIcon name="mark" size={13} color="var(--agy-accent)" /><span style={{ fontSize: 12, fontWeight: 650 }}>Antigravity</span></div>
            {!lead ? <div style={{ fontSize: 11, color: 'var(--agy-muted)', textAlign: 'center' }}>{data && data.error ? '认证已过期' : '加载中…'}</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <DonutGauge leftPct={lead.leftPct} sublabel={lead.label} size={84} strokeWidth={7} tone={lead.tone} />
                <div style={{ fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{lead.groupTitle}</div>
                <div className="agy-tnum" style={{ fontSize: 10, color: 'var(--agy-muted)' }}>{lead.countdown} 重置</div>
              </div>
            )}
          </div>
          {/* Medium 360x170 */}
          <div style={{ ...cardChrome, width: 360, height: 170, gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AgyIcon name="mark" size={13} color="var(--agy-accent)" /><span style={{ fontSize: 12, fontWeight: 650 }}>Antigravity</span></div>
              {snap && <span style={{ fontSize: 9.5, fontWeight: 650, padding: '2px 6px', borderRadius: 5, background: 'var(--agy-accent-subtle)', color: 'var(--agy-accent)' }}>{snap.plan}</span>}
            </div>
            {!lead ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, color: 'var(--agy-muted)' }}>{data && data.error ? '登录令牌已过期，请运行 agy 续期' : '正在加载配额数据…'}</div> : (
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '154px 1fr', gap: 10, alignItems: 'center', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <DonutGauge leftPct={lead.leftPct} sublabel={lead.shortGroup} label={lead.label} size={66} strokeWidth={6} tone={lead.tone} />
                  {second && <DonutGauge leftPct={second.leftPct} sublabel={second.shortGroup} label={second.label} size={66} strokeWidth={6} tone={second.tone} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--agy-muted)' }}><span>{lead.shortLabel} 趋势</span><span className="agy-tnum">{lead.countdown}</span></div>
                  <TrendChartSVG bucket={lead} height={88} showPace={!settings || settings.showPaceTick !== false} showForecast />
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Large 360x350 */}
        <div style={{ ...cardChrome, width: 360, height: 350, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AgyIcon name="mark" size={14} color="var(--agy-accent)" /><span style={{ fontSize: 13, fontWeight: 650 }}>Antigravity</span>
              {snap && <span style={{ fontSize: 10, fontWeight: 650, padding: '2px 6px', borderRadius: 5, background: 'var(--agy-accent-subtle)', color: 'var(--agy-accent)' }}>{snap.plan}</span>}
            </div>
            <span style={{ fontSize: 10.5, color: 'var(--agy-muted)' }}>{snap ? snap.updatedText : '离线'}</span>
          </div>
          {!lead ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--agy-muted)', fontSize: 12 }}>
              <AgyIcon name={data && data.error ? 'alert' : 'clock'} size={22} color={data && data.error ? 'var(--agy-danger)' : 'var(--agy-muted)'} />
              <span>{data && data.error ? '令牌已过期，请在菜单栏面板重试' : '正在同步 Antigravity 额度…'}</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                  <DonutGauge leftPct={lead.leftPct} sublabel={lead.shortGroup} label={lead.label} size={66} strokeWidth={6} tone={lead.tone} />
                  {second && <DonutGauge leftPct={second.leftPct} sublabel={second.shortGroup} label={second.label} size={66} strokeWidth={6} tone={second.tone} />}
                </div>
                <TrendChartSVG bucket={lead} height={88} showPace={!settings || settings.showPaceTick !== false} showForecast />
              </div>
              <div style={{ height: 1, background: 'var(--agy-border)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
                {buckets.map((b) => (
                  <div key={b.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                      <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.fullTitle}</span>
                      <span className="agy-tnum" style={{ fontSize: 10.5, color: 'var(--agy-muted)' }}>{b.resetLabel} · {b.countdown}</span>
                      <span className="agy-tnum" style={{ fontWeight: 700, color: toneColor(b.tone || b.leftPct), width: 34, textAlign: 'right' }}>{clampPct(b.leftPct)}%</span>
                    </div>
                    <PaceBar leftPct={b.leftPct} paceLeftPct={b.paceLeftPct} elapsedPct={b.elapsedPct} showPace={!settings || settings.showPaceTick !== false} height={5} tone={b.tone} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  function SurfaceShowcase({ data, settings, surface }) {
    if (surface === 'menubar') return <MenuBarSurfaceCard data={data} settings={settings} />;
    if (surface === 'notch') return <NotchSurfaceCard data={data} settings={settings} />;
    if (surface === 'widgets') return <WidgetsSurfaceCard data={data} settings={settings} />;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <MenuBarSurfaceCard data={data} settings={settings} />
        <NotchSurfaceCard data={data} settings={settings} />
        <WidgetsSurfaceCard data={data} settings={settings} />
      </div>
    );
  }

  window.AGY_SHARED = {
    SCENARIOS,
    AgyIcon,
    toneColor,
    DonutGauge,
    PaceBar,
    TrendChartSVG,
    PastCyclesSVG,
    SurfaceShowcase,
  };
})();
