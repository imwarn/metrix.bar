/**
 * [INPUT]: 依赖 window.DesignCanvas/DCSection/DCArtboard、window.AGY_SHARED 与 window.VariantAGauges/VariantBLinear/VariantCCockpit
 * [OUTPUT]: 渲染 Antigravity UI Options 交互式画布应用并挂载至 #root（含 Tweaks 控制浮层与复制 Toast）
 * [POS]: designs/antigravity-ui 的顶层状态与画布编排入口，由 Antigravity UI Options.html 最后加载执行
 * [PROTOCOL]: Update this header on change, then check GEMINI.md
 */

(function mountAntigravityCanvasApp() {
  const { useState, useEffect, useCallback, useRef } = React;

  class VariantErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
      return { error };
    }
    render() {
      if (this.state.error) {
        return (
          <div style={{ padding: 24, color: 'var(--agy-danger)', fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 650, marginBottom: 4 }}>{this.props.name} 渲染异常</div>
            <div style={{ opacity: 0.85, fontFamily: 'monospace', wordBreak: 'break-word' }}>
              {String(this.state.error.message || this.state.error)}
            </div>
          </div>
        );
      }
      return this.props.children;
    }
  }

  function VariantSlot({ name, component, data, settings, onCopy, screenLabel }) {
    const Comp = component;
    return (
      <div
        className="agy-panel-shell"
        data-theme={settings.theme}
        data-screen-label={screenLabel}
      >
        <VariantErrorBoundary name={name}>
          {typeof Comp === 'function' ? (
            <Comp data={data} settings={settings} onCopy={onCopy} />
          ) : (
            <div style={{ padding: 28, color: 'var(--agy-muted)', fontSize: 12, textAlign: 'center' }}>
              等待组件 {name} 加载…
            </div>
          )}
        </VariantErrorBoundary>
      </div>
    );
  }

  function TweaksDrawer({ open, onToggle, settings, onUpdate }) {
    const pillBtn = (active) => ({
      border: active ? '1px solid var(--agy-accent)' : '1px solid var(--agy-border)',
      background: active ? 'var(--agy-accent-subtle)' : 'var(--agy-surface)',
      color: active ? 'var(--agy-accent)' : 'var(--agy-text)',
      borderRadius: 7,
      padding: '5px 9px',
      fontSize: 11.5,
      fontWeight: active ? 650 : 500,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 120ms ease',
    });

    const togglePill = (active) => ({
      border: active ? '1px solid var(--agy-accent)' : '1px solid var(--agy-border)',
      background: active ? 'var(--agy-accent)' : 'var(--agy-surface)',
      color: active ? '#fff' : 'var(--agy-muted)',
      borderRadius: 999,
      padding: '3px 10px',
      fontSize: 11,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'inherit',
    });

    const { AgyIcon } = window.AGY_SHARED || {};

    return (
      <div
        data-theme={settings.theme}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 10,
          fontFamily: 'var(--agy-font-sans)',
        }}
      >
        {open && (
          <div
            style={{
              width: 312,
              borderRadius: 14,
              padding: 14,
              background: 'var(--agy-bg)',
              color: 'var(--agy-text)',
              border: '1px solid var(--agy-border-strong)',
              boxShadow: 'var(--agy-panel-shadow)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {AgyIcon && <AgyIcon name="mark" size={14} color="var(--agy-accent)" />}
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>Tweaks · 实时状态调试</span>
              </div>
              <button
                type="button"
                onClick={onToggle}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--agy-muted)',
                  cursor: 'pointer',
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 5,
                }}
              >
                收起
              </button>
            </div>

            {/* Theme */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--agy-muted)' }}>外观主题</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button type="button" style={pillBtn(settings.theme === 'dark')} onClick={() => onUpdate({ theme: 'dark' })}>
                  macOS Glass Dark
                </button>
                <button type="button" style={pillBtn(settings.theme === 'light')} onClick={() => onUpdate({ theme: 'light' })}>
                  macOS Glass Light
                </button>
              </div>
            </div>

            {/* Scenario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--agy-muted)' }}>配额数据场景</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { key: 'urgent', label: '15% 真实紧迫态' },
                  { key: 'healthy', label: '充裕态' },
                  { key: 'exhausted', label: '0% 耗尽态' },
                  { key: 'loading', label: '骨架态' },
                  { key: 'error', label: '异常态' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    style={pillBtn(settings.scenario === item.key)}
                    onClick={() => onUpdate({ scenario: item.key })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Width */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--agy-muted)' }}>面板宽度</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[380, 420, 460].map((w) => (
                  <button
                    key={w}
                    type="button"
                    className="agy-tnum"
                    style={pillBtn(settings.panelWidth === w)}
                    onClick={() => onUpdate({ panelWidth: w })}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 2, borderTop: '1px solid var(--agy-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Pace Tick（匀速刻度）</div>
                  <div style={{ fontSize: 10.5, color: 'var(--agy-muted)' }}>进度条与趋势图显示当前时间匀速线</div>
                </div>
                <button
                  type="button"
                  style={togglePill(settings.showPaceTick)}
                  onClick={() => onUpdate({ showPaceTick: !settings.showPaceTick })}
                >
                  {settings.showPaceTick ? 'ON' : 'OFF'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Past Cycles（历史周期）</div>
                  <div style={{ fontSize: 10.5, color: 'var(--agy-muted)' }}>展示过去 4 个周期结余柱状对比</div>
                </div>
                <button
                  type="button"
                  style={togglePill(settings.showPastCycles)}
                  onClick={() => onUpdate({ showPastCycles: !settings.showPastCycles })}
                >
                  {settings.showPastCycles ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            height: 36,
            padding: '0 14px',
            borderRadius: 999,
            border: '1px solid var(--agy-border-strong)',
            background: 'var(--agy-bg)',
            color: 'var(--agy-text)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.24)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 12.5,
            fontWeight: 650,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              background: 'var(--agy-accent)',
              display: 'inline-block',
            }}
          />
          <span>{open ? 'Hide Tweaks' : 'Tweaks'}</span>
          <span
            className="agy-tnum"
            style={{
              fontSize: 10.5,
              padding: '1px 6px',
              borderRadius: 999,
              background: 'var(--agy-surface-hover)',
              color: 'var(--agy-muted)',
            }}
          >
            {settings.theme === 'dark' ? 'Dark' : 'Light'} · {settings.panelWidth}px
          </span>
        </button>
      </div>
    );
  }

  function App() {
    const [settings, setSettings] = useState({
      theme: 'dark',
      scenario: 'urgent',
      panelWidth: 420,
      showPaceTick: true,
      showPastCycles: true,
    });
    const [tweaksOpen, setTweaksOpen] = useState(false);
    const [toastText, setToastText] = useState('');
    const toastTimer = useRef(null);

    useEffect(() => {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }, [settings.theme]);

    const handleUpdateSettings = useCallback((patch) => {
      setSettings((prev) => ({ ...prev, ...patch }));
    }, []);

    const handleCopy = useCallback((text) => {
      const value = String(text || '').trim();
      if (!value) return;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(value).catch(() => {});
      }
      setToastText(`已复制：${value}`);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastText(''), 2200);
    }, []);

    useEffect(() => {
      return () => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
      };
    }, []);

    const shared = window.AGY_SHARED || {};
    const scenarios = shared.SCENARIOS || {};
    const data = scenarios[settings.scenario] || scenarios.urgent || {
      scenarioKey: 'urgent',
      snapshot: null,
      inflight: false,
      error: '',
    };
    const SurfaceShowcase = shared.SurfaceShowcase;
    const AgyIcon = shared.AgyIcon;

    const panelArtboardStyle = {
      height: 'auto',
      borderRadius: 14,
      background: 'var(--agy-bg)',
      boxShadow: 'var(--agy-panel-shadow)',
    };

    const surfaceArtboardStyle = {
      height: 'auto',
      borderRadius: 14,
      background: 'var(--agy-bg)',
      boxShadow: 'var(--agy-panel-shadow)',
    };

    return (
      <>
        <DesignCanvas>
          <DCSection
            id="panel-variants"
            title="Antigravity 主面板布局探索（原生精简仪表风 · 3 套变体）"
            subtitle="移除冗余三格统计 · 引入 5H/WEEKLY 时间进度刻度（Pace Tick）与可切换预测趋势图 · 点击任意卡片可复制模型 ID 或切换交互状态"
          >
            <DCArtboard
              id="var-a"
              label="方案 A · 官方双环仪表风 (Recommended)"
              width={settings.panelWidth}
              height={760}
              style={panelArtboardStyle}
            >
              <VariantSlot
                name="VariantAGauges"
                component={window.VariantAGauges}
                data={data}
                settings={settings}
                onCopy={handleCopy}
                screenLabel="方案 A · 官方双环仪表风"
              />
            </DCArtboard>

            <DCArtboard
              id="var-b"
              label="方案 B · 极简线性节奏风 (Linear Pace)"
              width={settings.panelWidth}
              height={760}
              style={panelArtboardStyle}
            >
              <VariantSlot
                name="VariantBLinear"
                component={window.VariantBLinear}
                data={data}
                settings={settings}
                onCopy={handleCopy}
                screenLabel="方案 B · 极简线性节奏风"
              />
            </DCArtboard>

            <DCArtboard
              id="var-c"
              label="方案 C · 2×2 矩阵聚焦驾驶舱 (Cockpit)"
              width={settings.panelWidth}
              height={760}
              style={panelArtboardStyle}
            >
              <VariantSlot
                name="VariantCCockpit"
                component={window.VariantCCockpit}
                data={data}
                settings={settings}
                onCopy={handleCopy}
                screenLabel="方案 C · 2×2 矩阵聚焦驾驶舱"
              />
            </DCArtboard>
          </DCSection>

          <DCSection
            id="companion-surfaces"
            title="全表面协同设计（Menu Bar · Notch 刘海岛 · 桌面大中小组件）"
            subtitle="对齐官方 claude-code / codex 规范：托盘极简图标+最低百分比，刘海支持展开趋势，Widget 适配 Small / Medium / Large"
          >
            <DCArtboard
              id="surface-menubar"
              label="Menu Bar 托盘 · 图标 + 最低余量"
              width={380}
              height={260}
              style={surfaceArtboardStyle}
            >
              <div
                className="agy-panel-shell"
                data-theme={settings.theme}
                data-screen-label="伴生表面 · Menu Bar 托盘"
              >
                {SurfaceShowcase && <SurfaceShowcase data={data} settings={settings} surface="menubar" />}
              </div>
            </DCArtboard>

            <DCArtboard
              id="surface-notch"
              label="macOS Notch 刘海岛（Compact / Minimal / Expanded）"
              width={420}
              height={340}
              style={surfaceArtboardStyle}
            >
              <div
                className="agy-panel-shell"
                data-theme={settings.theme}
                data-screen-label="伴生表面 · Notch 刘海岛"
              >
                {SurfaceShowcase && <SurfaceShowcase data={data} settings={settings} surface="notch" />}
              </div>
            </DCArtboard>

            <DCArtboard
              id="surface-widgets"
              label="macOS 桌面小组件（Small · Medium · Large）"
              width={580}
              height={610}
              style={surfaceArtboardStyle}
            >
              <div
                className="agy-panel-shell"
                data-theme={settings.theme}
                data-screen-label="伴生表面 · 桌面小组件"
              >
                {SurfaceShowcase && <SurfaceShowcase data={data} settings={settings} surface="widgets" />}
              </div>
            </DCArtboard>
          </DCSection>
        </DesignCanvas>

        <TweaksDrawer
          open={tweaksOpen}
          onToggle={() => setTweaksOpen((o) => !o)}
          settings={settings}
          onUpdate={handleUpdateSettings}
        />

        {toastText && (
          <div
            data-theme={settings.theme}
            role="status"
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 24,
              transform: 'translateX(-50%)',
              zIndex: 95,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 999,
              background: 'var(--agy-bg)',
              color: 'var(--agy-text)',
              border: '1px solid var(--agy-border-strong)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.32)',
              fontFamily: 'var(--agy-font-sans)',
              fontSize: 12,
              fontWeight: 550,
              maxWidth: 'min(480px, 86vw)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {AgyIcon && <AgyIcon name="check" size={13} color="var(--agy-success)" />}
            <span>{toastText}</span>
          </div>
        )}
      </>
    );
  }

  const rootEl = document.getElementById('root');
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(<App />);
  }
})();
