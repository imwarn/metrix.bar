/**
 * [INPUT]: depends on React globals and window.AGY_SHARED (AgyIcon, DonutGauge, PaceBar, TrendChartSVG, PastCyclesSVG, toneColor); reads --agy-* CSS theme variables
 * [OUTPUT]: exports window.VariantAGauges component for Antigravity UI Option A (Official Dual-Ring Gauge Rhythm)
 * [POS]: primary panel variant renderer inside designs/antigravity-ui/, mounted by app.jsx on DesignCanvas alongside variant-b.jsx and variant-c.jsx
 * [PROTOCOL]: Update this header on change, then check GEMINI.md
 */
(() => {
  const { useState, useEffect, useMemo } = React;

  // =========================================================================
  // 局部作用域样式（va- 前缀，避免顶层 const styles 命名冲突）
  // =========================================================================
  const VA_STYLE_ID = "va-gauges-scoped-styles";
  const VA_CSS = `
    .va-root { display: flex; flex-direction: column; width: 100%; background: var(--agy-bg); color: var(--agy-text); font-size: 13px; line-height: 1.4; }
    .va-tnum { font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1; }
    .va-trunc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
    .va-divider { height: 1px; width: 100%; background: var(--agy-border); flex-shrink: 0; }

    .va-header { display: flex; align-items: center; gap: 9px; padding: 11px 12px 9px 14px; width: 100%; }
    .va-brand { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 7px; background: var(--agy-accent-subtle); flex-shrink: 0; }
    .va-title-col { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
    .va-title-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .va-title { font-size: 14px; font-weight: 600; letter-spacing: -0.015em; white-space: nowrap; }
    .va-plan { display: inline-flex; align-items: center; font-size: 10px; font-weight: 600; line-height: 1.35; padding: 1px 6px; border-radius: 5px; background: var(--agy-accent); color: var(--agy-accent-text); white-space: nowrap; flex-shrink: 0; }
    .va-acct-sub { font-size: 11px; color: var(--agy-muted); }
    .va-acct-wrap { position: relative; display: inline-flex; align-items: center; width: fit-content; max-width: 100%; }
    .va-acct-select { appearance: none; -webkit-appearance: none; background: transparent; border: 1px solid transparent; border-radius: 5px; color: var(--agy-muted); font-size: 11px; line-height: 1.3; padding: 1px 16px 1px 4px; margin-left: -4px; cursor: pointer; max-width: 196px; text-overflow: ellipsis; transition: background 140ms ease, color 140ms ease, border-color 140ms ease; }
    .va-acct-select:hover { background: var(--agy-surface-hover); color: var(--agy-text); border-color: var(--agy-border); }
    .va-acct-select:focus { outline: none; border-color: var(--agy-accent); }
    .va-acct-caret { position: absolute; right: 3px; pointer-events: none; display: inline-flex; }
    .va-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
    .va-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 7px; border: none; background: transparent; color: var(--agy-muted); cursor: pointer; padding: 0; flex-shrink: 0; transition: background 140ms ease, color 140ms ease, transform 100ms ease; }
    .va-icon-btn:hover { background: var(--agy-surface-hover); color: var(--agy-text); }
    .va-icon-btn:active { background: var(--agy-surface-pressed, var(--agy-surface-hover)); transform: scale(0.95); }

    .va-body { display: flex; flex-direction: column; gap: 12px; padding: 10px 14px 14px; }
    .va-banner { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; background: var(--agy-danger-subtle); border: 1px solid var(--agy-border); font-size: 11.5px; color: var(--agy-text); }
    .va-rings-grid { display: grid; gap: 8px; }
    .va-ring-btn { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 11px 8px 9px; border-radius: 11px; border: 1px solid transparent; background: transparent; color: inherit; cursor: pointer; min-width: 0; width: 100%; transition: background 150ms ease, border-color 150ms ease; }
    .va-ring-btn:hover { background: var(--agy-surface-hover); }
    .va-ring-btn.is-active { background: var(--agy-surface); border-color: var(--agy-border-strong, var(--agy-border)); }
    .va-ring-ind { position: absolute; top: 8px; right: 9px; width: 6px; height: 6px; border-radius: 99px; }
    .va-pace-pill { display: inline-flex; align-items: center; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px; max-width: 100%; }
    .va-pace-note { font-size: 10px; font-weight: 500; color: var(--agy-muted); padding: 2px 6px; white-space: nowrap; }

    .va-controls { display: flex; align-items: center; gap: 8px; width: 100%; }
    .va-seg { display: inline-flex; align-items: center; padding: 2px; border-radius: 8px; background: var(--agy-surface-hover); border: 1px solid var(--agy-border); gap: 2px; flex-shrink: 0; }
    .va-seg-item { border: none; background: transparent; color: var(--agy-muted); font-size: 11.5px; font-weight: 500; padding: 4px 8px; border-radius: 6px; cursor: pointer; white-space: nowrap; line-height: 1.2; transition: background 140ms ease, color 140ms ease, box-shadow 140ms ease; }
    .va-seg-item:hover { color: var(--agy-text); }
    .va-seg-item.is-active { background: var(--agy-surface); color: var(--agy-text); font-weight: 600; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16); }
    .va-seg-sm .va-seg-item { font-size: 10.5px; padding: 3px 6px; }
    .va-search-wrap { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 100px; height: 28px; padding: 0 8px; border-radius: 8px; background: var(--agy-surface-hover); border: 1px solid var(--agy-border); transition: border-color 140ms ease, background 140ms ease; }
    .va-search-wrap:focus-within { border-color: var(--agy-accent); background: var(--agy-surface); }
    .va-search-input { border: none; background: transparent; color: var(--agy-text); font-size: 11.5px; width: 100%; min-width: 0; outline: none; padding: 0; }
    .va-search-input::placeholder { color: var(--agy-muted); opacity: 0.82; }
    .va-search-clear { border: none; background: transparent; color: var(--agy-muted); cursor: pointer; font-size: 13px; line-height: 1; padding: 0 2px; }

    .va-group { display: flex; flex-direction: column; gap: 7px; }
    .va-group-head { display: flex; align-items: center; gap: 7px; min-width: 0; }
    .va-group-title { font-size: 12.5px; font-weight: 650; white-space: nowrap; flex-shrink: 0; }
    .va-group-preview { font-size: 11px; color: var(--agy-muted); text-align: right; flex: 1; }
    .va-bucket-row { display: flex; flex-direction: column; gap: 6px; padding: 7px 8px; margin: 0 -8px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; transition: background 140ms ease, border-color 140ms ease; }
    .va-bucket-row:hover { background: var(--agy-surface-hover); }
    .va-bucket-row.is-active { background: var(--agy-accent-subtle); border-color: var(--agy-border); }
    .va-bucket-meta { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .va-bucket-win { font-size: 11px; font-weight: 650; letter-spacing: 0.02em; flex-shrink: 0; }
    .va-fast-tag { font-size: 9.5px; font-weight: 600; padding: 0.5px 5px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
    .va-reset-text { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--agy-muted); }
    .va-pct-val { font-size: 12px; font-weight: 650; min-width: 34px; text-align: right; flex-shrink: 0; }
    .va-drawer-toggle { display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent; color: var(--agy-muted); font-size: 11px; font-weight: 500; padding: 3px 4px; margin-left: -4px; border-radius: 5px; cursor: pointer; transition: color 140ms ease, background 140ms ease; }
    .va-drawer-toggle:hover { color: var(--agy-text); background: var(--agy-surface-hover); }
    .va-chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .va-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2.5px 8px; border-radius: 5px; border: 1px solid transparent; background: var(--agy-accent-subtle); color: var(--agy-accent); font-family: inherit; font-weight: 500; font-size: 10.5px; line-height: 1.35; cursor: pointer; transition: background 130ms ease, color 130ms ease, border-color 130ms ease; }
    .va-chip:hover { border-color: var(--agy-accent); }
    .va-chip.is-copied { background: var(--agy-accent); color: var(--agy-accent-text); }

    .va-model-grid { display: grid; gap: 8px; }
    .va-model-card { display: flex; flex-direction: column; gap: 7px; padding: 9px 10px; border-radius: 9px; background: var(--agy-surface); border: 1px solid var(--agy-border); min-width: 0; cursor: pointer; text-align: left; color: inherit; transition: background 140ms ease, border-color 140ms ease; }
    .va-model-card:hover { background: var(--agy-surface-hover); border-color: var(--agy-border-strong, var(--agy-border)); }
    .va-model-card.is-copied { border-color: var(--agy-accent); }
    .va-model-head { display: flex; align-items: center; gap: 5px; width: 100%; min-width: 0; }
    .va-model-name { font-size: 12px; font-weight: 600; flex: 1; }
    .va-model-tags { display: flex; align-items: center; gap: 5px; width: 100%; min-width: 0; }
    .va-tier-tag { font-size: 9.5px; font-weight: 600; padding: 1px 5px; border-radius: 4px; background: var(--agy-surface-hover); color: var(--agy-muted); flex-shrink: 0; }
    .va-id-pill { font-family: var(--agy-font-mono, ui-monospace, monospace); font-size: 10px; padding: 1.5px 5px; border-radius: 4px; background: var(--agy-accent-subtle); color: var(--agy-accent); }
    .va-model-card.is-copied .va-id-pill { background: var(--agy-accent); color: var(--agy-accent-text); }
    .va-model-foot { display: flex; align-items: center; gap: 4px; width: 100%; font-size: 10px; color: var(--agy-muted); }

    .va-trend { display: flex; flex-direction: column; gap: 9px; }
    .va-trend-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .va-trend-sub { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--agy-muted); }
    .va-past-head { display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: var(--agy-muted); }

    .va-skeleton { display: flex; flex-direction: column; gap: 18px; padding: 18px 16px 20px; }
    .va-problem { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 9px; padding: 42px 26px 46px; }
    .va-problem-icon { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: var(--agy-danger-subtle); margin-bottom: 2px; }
    .va-btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; padding: 0 14px; border-radius: 7px; border: 1px solid var(--agy-accent); background: var(--agy-accent); color: var(--agy-accent-text); font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 140ms ease, transform 100ms ease; }
    .va-btn-primary:hover { opacity: 0.92; }
    .va-btn-primary:active { transform: scale(0.97); }
    .va-empty { padding: 22px 12px; text-align: center; font-size: 12px; color: var(--agy-muted); }
    .va-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 14px; font-size: 10.5px; color: var(--agy-muted); }

    @keyframes va-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .va-spinning { animation: va-spin 900ms linear infinite; display: inline-flex; }
    @keyframes va-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.85; } }
    .va-bone { background: var(--agy-surface-hover); animation: va-pulse 1.5s ease-in-out infinite; }
  `;

  function ensureScopedStyles() {
    if (typeof document === "undefined" || document.getElementById(VA_STYLE_ID)) return;
    const tag = document.createElement("style");
    tag.id = VA_STYLE_ID;
    tag.textContent = VA_CSS;
    document.head.appendChild(tag);
  }

  // =========================================================================
  // 共享工具访问与语义格式化
  // =========================================================================
  const getShared = () => (typeof window !== "undefined" && window.AGY_SHARED) || {};

  function resolveToneKey(tone, leftPct) {
    if (tone === "danger" || tone === "warning" || tone === "success" || tone === "accent") return tone;
    if (typeof leftPct === "number") return leftPct <= 10 ? "danger" : leftPct <= 30 ? "warning" : "success";
    return "accent";
  }

  function resolveTone(tone, leftPct) {
    const shared = getShared();
    const key = resolveToneKey(tone, leftPct);
    return typeof shared.toneColor === "function" ? shared.toneColor(key) : `var(--agy-${key})`;
  }

  const resolveSubtleBg = (tone, leftPct) => `var(--agy-${resolveToneKey(tone, leftPct)}-subtle, var(--agy-accent-subtle))`;
  const formatPct = (v) => (typeof v === "number" && Number.isFinite(v) ? `${Math.round(v)}%` : "—");

  function formatResetPair(item) {
    if (!item) return "—";
    const stamp = item.resetStamp || item.resetLabel || "";
    const cd = item.countdown || "";
    return stamp && cd && !stamp.includes(cd) ? `${stamp} · ${cd}` : stamp || cd || "—";
  }

  function formatBucketChip(bucket) {
    if (!bucket) return "";
    if (bucket.shortLabel) return bucket.shortLabel;
    const key = String(bucket.key || "").toLowerCase();
    const label = String(bucket.label || "").toUpperCase();
    const groupText = String(bucket.shortGroup || bucket.groupTitle || bucket.groupKey || "").toLowerCase();
    const prefix = groupText.includes("gem") || key.includes("gem") ? "Gem" : "C&G";
    const win = label.includes("WEEK") || key.includes("week") ? "周" : label.includes("5H") || key.includes("5h") ? "5H" : bucket.label || "";
    return `${prefix} ${win}`.trim();
  }

  function buildSummaryText(snapshot) {
    if (!snapshot) return "Antigravity: 无可用配额数据";
    const head = `Antigravity (${snapshot.plan || "Quota"}) · ${snapshot.accountLabel || "dev@workspace.ai"}`;
    const rows = (snapshot.buckets || []).map(
      (b) => `- ${b.fullTitle || `${b.groupTitle || ""} ${b.label || ""}`.trim()}: ${formatPct(b.leftPct)} (${formatResetPair(b)})`
    );
    return [head, ...rows].join("\n");
  }

  function pickHeroBuckets(buckets) {
    if (!Array.isArray(buckets) || !buckets.length) return [];
    const primary = buckets[0];
    const secondary =
      buckets.find((b) => b.groupKey && primary.groupKey && b.groupKey !== primary.groupKey) ||
      buckets.find((b) => b.key !== primary.key) ||
      null;
    return secondary ? [primary, secondary] : [primary];
  }

  function buildGroupPreview(group) {
    const models = Array.isArray(group && group.models) ? group.models : [];
    const names = [];
    for (let i = 0; i < models.length && names.length < 3; i += 1) {
      const clean = (models[i].displayName || models[i].name || models[i].id || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
      if (clean && !names.includes(clean)) names.push(clean);
    }
    if (!names.length) return "";
    const total = group.modelCount || group.totalCount || models.length;
    return `${names.join(", ")}${total > names.length ? " …" : ""}`;
  }

  function shortModelLabel(m) {
    const raw = String((m && (m.displayName || m.name || m.id)) || "").trim();
    if (!raw) return "";
    if (/^gpt[\s-]*oss/i.test(raw)) {
      return raw.replace(/^gpt[\s-]*oss/i, "GPT-OSS").replace(/\s*\([^)]*\)\s*$/, "").trim();
    }
    const text = raw
      .replace(/^Gemini\s+4\s+/i, "")
      .replace(/^Gemini\s+/i, "")
      .replace(/^Claude\s+/i, "")
      .replace(/\s*\(([^)]+)\)\s*$/, " $1")
      .replace(/\s+Preview$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    return text || raw;
  }

  function normalizeAccounts(snapshot) {
    if (!snapshot) return [];
    if (Array.isArray(snapshot.accounts) && snapshot.accounts.length) {
      return snapshot.accounts.map((a) => (typeof a === "string" ? a : a.label || a.email || String(a)));
    }
    return snapshot.accountLabel ? [snapshot.accountLabel] : [];
  }

  function renderIcon(name, size, color, style) {
    const IconComp = getShared().AgyIcon;
    return IconComp ? (
      <IconComp name={name} size={size} color={color} style={style} />
    ) : (
      <span style={{ display: "inline-block", width: size, height: size, borderRadius: 3, background: color || "currentColor", opacity: 0.4, ...style }} />
    );
  }

  function renderPaceBar(item, showPace, height) {
    const BarComp = getShared().PaceBar;
    if (BarComp) {
      return <BarComp leftPct={item.leftPct} paceLeftPct={item.paceLeftPct} elapsedPct={item.elapsedPct} tone={item.tone} showPace={showPace} height={height} />;
    }
    const color = resolveTone(item.tone, item.leftPct);
    return (
      <div style={{ height, borderRadius: height / 2, background: "var(--agy-track, var(--agy-surface-hover))", overflow: "hidden", width: "100%" }}>
        <div style={{ width: `${Math.max(0, Math.min(100, item.leftPct || 0))}%`, height, background: color, borderRadius: height / 2 }} />
      </div>
    );
  }

  // =========================================================================
  // 1. Header：品牌标识 + 套餐徽章 + 账号切换 + 复制/刷新按钮
  // =========================================================================
  function Header({ snapshot, inflight, accountIdx, onSelectAccount, copiedSummary, onCopySummary, spinning, onRefresh }) {
    const accounts = normalizeAccounts(snapshot);
    const activeAccount = accounts[accountIdx] || (snapshot && snapshot.accountLabel) || "";

    return (
      <div className="va-header">
        <div className="va-brand">{renderIcon("mark", 16, "var(--agy-accent)")}</div>
        <div className="va-title-col">
          <div className="va-title-row">
            <span className="va-title">Antigravity</span>
            {snapshot && snapshot.plan ? <span className="va-plan">{snapshot.plan}</span> : null}
          </div>
          {accounts.length > 1 ? (
            <div className="va-acct-wrap">
              <select aria-label="切换账号" className="va-acct-select" value={String(accountIdx)} onChange={(e) => onSelectAccount(Number(e.target.value))}>
                {accounts.map((acc, idx) => <option key={acc} value={String(idx)}>{acc}</option>)}
              </select>
              <span className="va-acct-caret">{renderIcon("chevronDown", 10, "var(--agy-muted)")}</span>
            </div>
          ) : activeAccount ? (
            <span className="va-acct-sub va-trunc">{activeAccount}</span>
          ) : null}
        </div>
        <div className="va-actions">
          <button type="button" className="va-icon-btn" title="复制配额摘要" aria-label="复制配额摘要" onClick={onCopySummary} disabled={!snapshot} style={{ opacity: snapshot ? 1 : 0.45 }}>
            {renderIcon(copiedSummary ? "check" : "copy", 14, copiedSummary ? "var(--agy-success)" : "currentColor")}
          </button>
          <button type="button" className="va-icon-btn" title="刷新配额" aria-label="刷新配额" onClick={onRefresh}>
            <span className={inflight || spinning ? "va-spinning" : ""} style={{ display: "inline-flex" }}>{renderIcon("refresh", 14, "currentColor")}</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. Loading 骨架屏与 Error 异常态
  // =========================================================================
  function LoadingSkeleton() {
    return (
      <div className="va-skeleton">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[0, 1].map((idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
              <div className="va-bone" style={{ width: 98, height: 98, borderRadius: 999 }} />
              <div className="va-bone" style={{ width: 78, height: 10, borderRadius: 5 }} />
              <div className="va-bone" style={{ width: 102, height: 17, borderRadius: 999 }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="va-bone" style={{ width: 148, height: 28, borderRadius: 8 }} />
          <div className="va-bone" style={{ flex: 1, height: 28, borderRadius: 8 }} />
        </div>
        {[0, 1].map((idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="va-bone" style={{ width: 112, height: 11, borderRadius: 4 }} />
              <div className="va-bone" style={{ width: 64, height: 11, borderRadius: 4 }} />
            </div>
            <div className="va-bone" style={{ width: "100%", height: 6, borderRadius: 3 }} />
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="va-bone" style={{ width: 96, height: 11, borderRadius: 4 }} />
            <div className="va-bone" style={{ width: 132, height: 20, borderRadius: 6 }} />
          </div>
          <div className="va-bone" style={{ width: "100%", height: 104, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  function ErrorProblem({ detail, onRetry, retrying }) {
    return (
      <div className="va-problem">
        <div className="va-problem-icon">{renderIcon("alert", 20, "var(--agy-danger)")}</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>获取配额失败</div>
        <div style={{ fontSize: 12, color: "var(--agy-muted)", lineHeight: 1.5, maxWidth: 310, wordBreak: "break-word" }}>{detail}</div>
        <div style={{ marginTop: 6 }}>
          <button type="button" className="va-btn-primary" onClick={onRetry}>
            <span className={retrying ? "va-spinning" : ""} style={{ display: "inline-flex" }}>{renderIcon("refresh", 13, "var(--agy-accent-text)")}</span>
            <span>{retrying ? "正在重试…" : "重试刷新"}</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. Hero 双环仪表（对齐官方 claude-code.bar，点击联动底部趋势图）
  // =========================================================================
  function HeroDualRings({ heroBuckets, activeBucketKey, onSelectBucket }) {
    const Donut = getShared().DonutGauge;

    return (
      <div className="va-rings-grid" style={{ gridTemplateColumns: heroBuckets.length > 1 ? "1fr 1fr" : "1fr" }}>
        {heroBuckets.map((bucket) => {
          const isActive = bucket.key === activeBucketKey;
          const color = resolveTone(bucket.tone, bucket.leftPct);
          const subtleBg = resolveSubtleBg(bucket.tone, bucket.leftPct);
          const shortRunsOut = bucket.runsOutText ? bucket.runsOutText.replace(/^按当前速率/, "") : null;
          const paceNote =
            !shortRunsOut && typeof bucket.paceDelta === "number"
              ? bucket.paceDelta >= 0
                ? `较匀速充裕 +${Math.round(bucket.paceDelta)}%`
                : `快于匀速 ${Math.round(bucket.paceDelta)}%`
              : null;

          return (
            <button
              key={bucket.key}
              type="button"
              className={`va-ring-btn${isActive ? " is-active" : ""}`}
              onClick={() => onSelectBucket(bucket.key)}
              title={`点击查看 ${bucket.fullTitle || bucket.label} 消耗趋势`}
            >
              {isActive ? <span className="va-ring-ind" style={{ background: color }} /> : null}
              {Donut ? (
                <Donut
                  leftPct={bucket.leftPct}
                  label={bucket.groupTitle || bucket.shortGroup}
                  sublabel={bucket.label}
                  countdown={bucket.countdown}
                  resetLabel={bucket.resetLabel}
                  tone={bucket.tone}
                  active={isActive}
                  size={98}
                  strokeWidth={8}
                />
              ) : (
                <div className="va-tnum" style={{ width: 98, height: 98, borderRadius: 999, border: `7px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 650 }}>
                  {formatPct(bucket.leftPct)}
                </div>
              )}
              {shortRunsOut ? (
                <div className="va-pace-pill va-tnum va-trunc" style={{ color, background: subtleBg }}>{shortRunsOut}</div>
              ) : paceNote ? (
                <div className="va-pace-note va-tnum">{paceNote}</div>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  // =========================================================================
  // 4. 分段视图切换（配额分组 / 模型网格）+ 紧凑搜索框
  // =========================================================================
  function ControlBar({ viewMode, onViewMode, totalModels, search, onSearch, panelWidth }) {
    const compact = panelWidth < 400;
    return (
      <div className="va-controls">
        <div className="va-seg" role="tablist" aria-label="视图切换">
          <button type="button" role="tab" aria-selected={viewMode === "grouped"} className={`va-seg-item${viewMode === "grouped" ? " is-active" : ""}`} onClick={() => onViewMode("grouped")}>
            配额分组
          </button>
          <button type="button" role="tab" aria-selected={viewMode === "grid"} className={`va-seg-item va-tnum${viewMode === "grid" ? " is-active" : ""}`} onClick={() => onViewMode("grid")}>
            {compact ? `模型 · ${totalModels}` : `模型网格 · ${totalModels}`}
          </button>
        </div>

        <div className="va-search-wrap">
          {renderIcon("search", 12, "var(--agy-muted)")}
          <input type="text" className="va-search-input" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={compact ? "搜索模型" : "搜索模型名称或 ID"} aria-label="搜索模型名称或 ID" />
          {search ? <button type="button" className="va-search-clear" onClick={() => onSearch("")} aria-label="清空搜索">×</button> : null}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5A. 无冗余边框家族分组视图（配额分组模式）
  // =========================================================================
  function GroupedView({ groups, activeBucketKey, onSelectBucket, expandedMap, onToggleGroup, forceExpand, showPaceTick, copiedId, onCopyModel }) {
    if (!groups.length) return <div className="va-empty">未找到匹配的模型或配额分组</div>;

    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {groups.map((group, idx) => {
          const models = Array.isArray(group.models) ? group.models : [];
          const totalCount = group.modelCount || group.totalCount || models.length;
          const expanded = forceExpand || Boolean(expandedMap[group.key]);
          const preview = buildGroupPreview(group);
          const isGemini = String(group.family || group.key || "").toLowerCase().includes("gem");

          return (
            <React.Fragment key={group.key}>
              {idx > 0 ? <div className="va-divider" style={{ margin: "10px 0" }} /> : null}
              <div className="va-group">
                <div className="va-group-head">
                  {renderIcon(isGemini ? "sparkle" : "bot", 14, "var(--agy-accent)")}
                  <span className="va-group-title">{group.title}</span>
                  {preview ? <span className="va-group-preview va-trunc">{preview}</span> : null}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {(group.buckets || []).map((b) => {
                    const isSelected = b.key === activeBucketKey;
                    const color = resolveTone(b.tone, b.leftPct);
                    const subtleBg = resolveSubtleBg(b.tone, b.leftPct);
                    const fastBurn = typeof b.paceDelta === "number" && b.paceDelta <= -20;

                    return (
                      <div
                        key={b.key}
                        role="button"
                        tabIndex={0}
                        className={`va-bucket-row${isSelected ? " is-active" : ""}`}
                        onClick={() => onSelectBucket(b.key)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectBucket(b.key); } }}
                      >
                        <div className="va-bucket-meta">
                          <span className="va-bucket-win" style={{ color: isSelected ? "var(--agy-accent)" : "var(--agy-text)" }}>{b.label}</span>
                          {fastBurn ? (
                            <span className="va-fast-tag va-tnum" style={{ color, background: subtleBg }}>{b.leftPct <= 0 ? "已耗尽" : "偏快"}</span>
                          ) : null}
                          <div style={{ flex: 1 }} />
                          <span className="va-reset-text va-tnum va-trunc">
                            {renderIcon("clock", 10, "var(--agy-muted)")}
                            <span>{formatResetPair(b)}</span>
                          </span>
                          <span className="va-pct-val va-tnum" style={{ color }}>{formatPct(b.leftPct)}</span>
                        </div>
                        {renderPaceBar(b, showPaceTick, 6)}
                      </div>
                    );
                  })}
                </div>

                {models.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 1 }}>
                    {expanded ? (
                      <div className="va-chips">
                        {models.map((m) => {
                          const isCopied = copiedId === m.id;
                          return (
                            <button key={m.id} type="button" className={`va-chip${isCopied ? " is-copied" : ""}`} title={`${m.displayName || m.id} (${m.id}) — 点击复制 ID`} onClick={() => onCopyModel(m.id)}>
                              {isCopied ? renderIcon("check", 10, "var(--agy-accent-text)") : null}
                              <span>{shortModelLabel(m)}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    {!forceExpand ? (
                      <div>
                        <button type="button" className="va-drawer-toggle va-tnum" onClick={() => onToggleGroup(group.key)}>
                          {renderIcon(expanded ? "chevronDown" : "chevronRight", 11, "currentColor")}
                          <span>{expanded ? "收起模型列表" : `展开全部 ${totalCount} 个模型`}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // =========================================================================
  // 5B. 双列紧凑模型网格视图（模型网格模式）
  // =========================================================================
  function ModelGridView({ models, panelWidth, showPaceTick, copiedId, onCopyModel }) {
    if (!models.length) return <div className="va-empty">未找到匹配的模型</div>;
    const cols = panelWidth < 385 ? "1fr" : "1fr 1fr";

    return (
      <div className="va-model-grid" style={{ gridTemplateColumns: cols }}>
        {models.map((m) => {
          const isCopied = copiedId === m.id;
          const color = resolveTone(m.tone, m.leftPct);
          const isGemini = m.isPrimary || String(m.family || m.id || "").toLowerCase().includes("gem");
          const tag = m.recommended ? "推荐" : m.isUtility ? "工具" : m.windowLabel || null;

          return (
            <button key={m.id} type="button" className={`va-model-card${isCopied ? " is-copied" : ""}`} onClick={() => onCopyModel(m.id)} title={`点击复制 ${m.id}`}>
              <div className="va-model-head">
                {renderIcon(isGemini ? "sparkle" : "bot", 13, isCopied ? "var(--agy-accent)" : "var(--agy-muted)")}
                <span className="va-model-name va-trunc" style={{ color: isCopied ? "var(--agy-accent)" : "var(--agy-text)" }}>{m.displayName || m.id}</span>
                <span className="va-tnum" style={{ fontSize: 11, fontWeight: 650, color, flexShrink: 0 }}>{formatPct(m.leftPct)}</span>
              </div>
              <div className="va-model-tags">
                {tag ? <span className="va-tier-tag">{tag}</span> : null}
                <span className="va-id-pill va-trunc">{isCopied ? `已复制 ${m.id}` : m.id}</span>
              </div>
              {renderPaceBar(m, showPaceTick, 5)}
              <div className="va-model-foot va-tnum">
                {renderIcon("clock", 10, "var(--agy-muted)")}
                <span className="va-trunc" style={{ flex: 1 }}>{m.resetStamp || m.resetLabel || "—"}</span>
                <span style={{ fontWeight: 500, flexShrink: 0 }}>{m.countdown || ""}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // =========================================================================
  // 6. 交互式消耗节奏与趋势预测区（与双环仪表双向联动）
  // =========================================================================
  function TrendForecastSection({ buckets, activeBucket, onSelectBucket, showPaceTick, showPastCycles }) {
    const { TrendChartSVG: TrendChart, PastCyclesSVG: PastCycles } = getShared();
    if (!activeBucket) return null;

    const color = resolveTone(activeBucket.tone, activeBucket.leftPct);
    const elapsedText = typeof activeBucket.elapsedPct === "number" ? `时段已过 ${Math.round(activeBucket.elapsedPct)}%` : "";
    const paceStatus = activeBucket.runsOutText
      ? activeBucket.runsOutText
      : typeof activeBucket.paceDelta === "number"
        ? activeBucket.paceDelta >= 0 ? `高于匀速 +${Math.round(activeBucket.paceDelta)}%` : `低于匀速 ${Math.round(activeBucket.paceDelta)}%`
        : "";

    return (
      <div className="va-trend">
        <div className="va-trend-head">
          <span style={{ fontSize: 12, fontWeight: 650, whiteSpace: "nowrap" }}>消耗节奏与趋势</span>
          {buckets.length > 1 ? (
            <div className="va-seg va-seg-sm" role="tablist" aria-label="趋势窗口切换">
              {buckets.map((b) => (
                <button key={b.key} type="button" role="tab" aria-selected={b.key === activeBucket.key} className={`va-seg-item${b.key === activeBucket.key ? " is-active" : ""}`} onClick={() => onSelectBucket(b.key)}>
                  {formatBucketChip(b)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="va-trend-sub va-tnum">
          <span className="va-trunc">
            <strong style={{ color, fontWeight: 650, marginRight: 5 }}>{formatPct(activeBucket.leftPct)}</strong>
            {[elapsedText, paceStatus].filter(Boolean).join(" · ")}
          </span>
          <span style={{ flexShrink: 0, fontSize: 10.5 }}>{activeBucket.countdown || ""}</span>
        </div>

        {TrendChart ? <TrendChart bucket={activeBucket} height={106} showPace={showPaceTick} showForecast={true} /> : <div style={{ height: 106, borderRadius: 8, background: "var(--agy-surface)", border: "1px solid var(--agy-border)" }} />}

        {showPastCycles && Array.isArray(activeBucket.pastCycles) && activeBucket.pastCycles.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 2 }}>
            <div className="va-past-head">
              <span>历史周期期末余量</span>
              <span className="va-tnum" style={{ fontSize: 10 }}>近 {activeBucket.pastCycles.length} 期</span>
            </div>
            {PastCycles ? <PastCycles pastCycles={activeBucket.pastCycles} height={54} /> : null}
          </div>
        ) : null}
      </div>
    );
  }

  // =========================================================================
  // 7. 极简页脚
  // =========================================================================
  function Footer({ snapshot, inflight, error }) {
    const host = (snapshot && snapshot.origin && String(snapshot.origin).replace(/^https?:\/\//, "")) || "daily-cloudcode-pa.googleapis.com";
    const interval = (snapshot && snapshot.refreshInterval) || "15m";
    const statusText = snapshot ? `${snapshot.updatedText || "刚刚更新"} · ${interval}` : error ? "同步异常" : inflight ? "正在拉取配额…" : "等待同步";

    return (
      <div className="va-footer va-tnum">
        <span className="va-trunc">{host}</span>
        <span style={{ flexShrink: 0 }}>{statusText}</span>
      </div>
    );
  }

  // =========================================================================
  // 主导出组件：VariantAGauges
  // =========================================================================
  function VariantAGauges({ data, settings, onCopy }) {
    ensureScopedStyles();

    const safeData = data || {};
    const safeSettings = settings || {};
    const snapshot = safeData.snapshot || null;
    const inflight = Boolean(safeData.inflight);
    const error = safeData.error || "";
    const panelWidth = Number(safeSettings.panelWidth) || 420;
    const showPaceTick = safeSettings.showPaceTick !== false;
    const showPastCycles = Boolean(safeSettings.showPastCycles);

    const [viewMode, setViewMode] = useState("grouped");
    const [search, setSearch] = useState("");
    const [accountIdx, setAccountIdx] = useState(0);
    const [selectedBucketKey, setSelectedBucketKey] = useState(null);
    const [expandedMap, setExpandedMap] = useState({});
    const [copiedId, setCopiedId] = useState(null);
    const [copiedSummary, setCopiedSummary] = useState(false);
    const [spinning, setSpinning] = useState(false);

    // 场景切换时重置聚焦窗口与账号下标，对齐当前场景默认焦点
    useEffect(() => {
      setSelectedBucketKey(null);
      setAccountIdx(0);
    }, [safeData.scenarioKey]);

    const buckets = useMemo(() => (snapshot && Array.isArray(snapshot.buckets) ? snapshot.buckets : []), [snapshot]);
    const heroBuckets = useMemo(() => pickHeroBuckets(buckets), [buckets]);
    const activeBucket = useMemo(
      () => (!buckets.length ? null : buckets.find((b) => b.key === selectedBucketKey) || heroBuckets[0] || buckets[0]),
      [buckets, heroBuckets, selectedBucketKey]
    );

    const query = search.trim().toLowerCase();
    const filteredModels = useMemo(() => {
      const list = snapshot && Array.isArray(snapshot.models) ? snapshot.models : [];
      return query ? list.filter((m) => `${m.displayName || ""} ${m.id || ""}`.toLowerCase().includes(query)) : list;
    }, [snapshot, query]);

    const filteredGroups = useMemo(() => {
      const list = snapshot && Array.isArray(snapshot.groups) ? snapshot.groups : [];
      if (!query) return list;
      return list
        .map((g) => {
          const ms = (g.models || []).filter((m) => `${m.displayName || ""} ${m.id || ""}`.toLowerCase().includes(query));
          const hit = `${g.title || ""} ${(g.buckets || []).map((b) => b.label).join(" ")}`.toLowerCase().includes(query);
          return ms.length || hit ? { ...g, models: ms.length ? ms : g.models } : null;
        })
        .filter(Boolean);
    }, [snapshot, query]);

    const totalModels = (snapshot && (snapshot.totalModels || (Array.isArray(snapshot.models) ? snapshot.models.length : 0))) || 0;

    function handleCopyModel(modelId) {
      setCopiedId(modelId);
      if (typeof onCopy === "function") onCopy(modelId);
      window.setTimeout(() => setCopiedId((prev) => (prev === modelId ? null : prev)), 1400);
    }

    function handleCopySummary() {
      if (!snapshot) return;
      setCopiedSummary(true);
      if (typeof onCopy === "function") onCopy(buildSummaryText(snapshot));
      window.setTimeout(() => setCopiedSummary(false), 1400);
    }

    function handleRefresh() {
      setSpinning(true);
      window.setTimeout(() => setSpinning(false), 750);
    }

    const handleToggleGroup = (groupKey) => setExpandedMap((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));

    return (
      <div className="va-root">
        <Header
          snapshot={snapshot}
          inflight={inflight}
          accountIdx={accountIdx}
          onSelectAccount={setAccountIdx}
          copiedSummary={copiedSummary}
          onCopySummary={handleCopySummary}
          spinning={spinning}
          onRefresh={handleRefresh}
        />
        <div className="va-divider" />

        {!snapshot ? (
          error ? <ErrorProblem detail={error} onRetry={handleRefresh} retrying={spinning} /> : <LoadingSkeleton />
        ) : (
          <div className="va-body">
            {error ? (
              <div className="va-banner">
                {renderIcon("alert", 13, "var(--agy-danger)")}
                <span style={{ flex: 1, minWidth: 0 }}>{error}</span>
              </div>
            ) : null}

            <HeroDualRings heroBuckets={heroBuckets} activeBucketKey={activeBucket ? activeBucket.key : null} onSelectBucket={setSelectedBucketKey} />
            <ControlBar viewMode={viewMode} onViewMode={setViewMode} totalModels={totalModels} search={search} onSearch={setSearch} panelWidth={panelWidth} />

            {viewMode === "grid" ? (
              <ModelGridView models={filteredModels} panelWidth={panelWidth} showPaceTick={showPaceTick} copiedId={copiedId} onCopyModel={handleCopyModel} />
            ) : (
              <GroupedView
                groups={filteredGroups}
                activeBucketKey={activeBucket ? activeBucket.key : null}
                onSelectBucket={setSelectedBucketKey}
                expandedMap={expandedMap}
                onToggleGroup={handleToggleGroup}
                forceExpand={Boolean(query)}
                showPaceTick={showPaceTick}
                copiedId={copiedId}
                onCopyModel={handleCopyModel}
              />
            )}

            {!query && activeBucket ? (
              <>
                <div className="va-divider" style={{ marginTop: 2 }} />
                <TrendForecastSection buckets={buckets} activeBucket={activeBucket} onSelectBucket={setSelectedBucketKey} showPaceTick={showPaceTick} showPastCycles={showPastCycles} />
              </>
            ) : null}
          </div>
        )}

        <div className="va-divider" />
        <Footer snapshot={snapshot} inflight={inflight} error={error} />
      </div>
    );
  }

  window.VariantAGauges = VariantAGauges;
})();
