/**
 * [INPUT]: 依赖 node:fs 与 node:assert/strict，契约定义对齐 types/metrixbar-runtime.d.ts（Metrix.Bar Protocol v0）
 * [OUTPUT]: 导出 extractBarScript、flatten、textOf、validatePanelTree、validateWidgetTree、validateTrayContent、validateViewContract
 * [POS]: test-utils 的唯一共享契约断言库，供 dashboards/* 离线回归测试复用，统一约束多表面渲染契约
 * [PROTOCOL]: Update this header on change, then check GEMINI.md
 */
'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

// -- 常量与组件契约表 --
const PANEL_TYPES = new Set((
  'Accordion AccordionItem AlertDialog Autocomplete Avatar BackButton Badge Box Breadcrumbs ' +
  'Button ButtonBase Calendar Canvas Chart Checkbox CheckboxBase CheckboxGroup Collapsible ' +
  'CollapsibleBase ColorPicker ColorWell Column Combobox ComboboxBase DateInput DecimalInput ' +
  'DialogBase DiffView Divider EditableText Editor Field Fieldset FindBar Form ForwardButton ' +
  'Grid GridView Icon Image Link List Loading Markdown MarkdownStream MenuButton Meter Modal ' +
  'NumberInput Outline OutlineTable Overlay Part Popover PopoverBase PopoverMenuButton ' +
  'PrimaryButton PrimarySplitButton Progress Radio RadioBase RadioGroup RangeSlider Rating ' +
  'RichText RichTextEditor Route Router Row Scroll ScrollBoth ScrollHorizontal SearchField ' +
  'Segmented SegmentedBase Select SelectBase Sidebar SidebarItem SidebarSection Slider ' +
  'SliderBase Spacer Spinner Split SplitButton SplitPercent SplitVertical SplitVerticalPercent ' +
  'StepSlider Stepper Switch SwitchBase Table Tabs TabsBase Text TextArea TextAreaBase ' +
  'TextAreaBuffer TextAreaBufferBase TextInput TextInputBase TextInputBuffer ' +
  'TextInputBufferBase Themed TimeInput Toast ToastBase ToastViewportBase Toggle ToggleBase ' +
  'ToggleGroup TokenField Toolbar TooltipBase Tree TreeItem'
).split(' '));
const STATE_OVERLAY_KEYS = ['hover', 'pressed', 'focused', 'focusVisible', 'focusWithin', 'disabled', 'highlighted'];

const WIDGET_BASE = ['key', 'padding'];
const WIDGET_LAYOUT = [...WIDGET_BASE, 'gap', 'width', 'height', 'radius', 'background', 'alignItems'];
const WIDGET_TEXT = [...WIDGET_BASE, 'color', 'textColor', 'bold', 'italic', 'fontSize', 'fontWeight'];
const WIDGET_ALLOWED_PROPS = {
  Column: new Set(WIDGET_LAYOUT),
  Row: new Set(WIDGET_LAYOUT),
  Box: new Set(WIDGET_LAYOUT),
  Grid: new Set([...WIDGET_LAYOUT, 'columns']),
  Text: new Set([...WIDGET_TEXT, 'text', 'maxLines', 'textAlign']),
  RichText: new Set([...WIDGET_TEXT, 'spans', 'maxLines', 'textAlign']),
  Badge: new Set([...WIDGET_TEXT, 'text', 'background']),
  Avatar: new Set([...WIDGET_BASE, 'name', 'src', 'size', 'color', 'textColor', 'background']),
  Icon: new Set([...WIDGET_BASE, 'svg', 'size', 'color', 'textColor']),
  Image: new Set([...WIDGET_BASE, 'src', 'width', 'height', 'radius']),
  Progress: new Set([...WIDGET_BASE, 'value', 'color', 'textColor']),
  Meter: new Set([...WIDGET_BASE, 'value', 'min', 'max', 'levels', 'color', 'textColor']),
  Chart: new Set([...WIDGET_BASE, 'type', 'width', 'height', 'series', 'data', 'innerRadius', 'yDomain', 'strokeWidth']),
  Spacer: new Set(['key']),
  Divider: new Set(['key', 'orientation']),
};
const WIDGET_FORBIDDEN_PROPS = new Set([
  'absolute', 'fillWidth', 'grow', 'shrink', 'minWidth', 'singleLine', 'fontFeatures',
  'wrap', 'hover', 'xKind', 'legend', 'appear', 'tooltip', 'onClick', 'tw', 'safeArea',
]);
const WIDGET_COLORS = new Set(['primary', 'secondary', 'accent', 'success', 'warning', 'error']);
const WIDGET_ALIGN = new Set(['start', 'center', 'end']);
const WIDGET_CHART_TYPES = new Set(['line', 'area', 'bar', 'pie']);
const isValidWidgetColor = c => typeof c === 'string' && (WIDGET_COLORS.has(c) || /^#[0-9a-fA-F]{3,8}$/.test(c));

const TRAY_LAYOUT = ['width', 'height', 'gap', 'padding', 'paddingX', 'paddingY', 'alignItems', 'justify'];
const TRAY_ALLOWED_PROPS = {
  Row: new Set(TRAY_LAYOUT),
  Column: new Set(TRAY_LAYOUT),
  Spacer: new Set(TRAY_LAYOUT),
  Text: new Set([...TRAY_LAYOUT, 'text', 'fontSize', 'fontWeight']),
  Icon: new Set([...TRAY_LAYOUT, 'svg', 'fontSize']),
  Chart: new Set([...TRAY_LAYOUT, 'type', 'series', 'strokeWidth']),
};
const TRAY_FORBIDDEN_PROPS = new Set([
  'textColor', 'color', 'background', 'singleLine', 'fontFeatures', 'onClick', 'tw',
  'safeArea', 'hover', 'tooltip', 'fillWidth', 'grow', 'shrink', 'wrap', 'border', 'radius',
]);
const TRAY_ALIGN = new Set(['start', 'center', 'end', 'stretch']);
const TRAY_JUSTIFY = new Set(['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly']);
const TRAY_CHART_TYPES = new Set(['line', 'area']);
const TRAY_LIMITS = {
  rootHeight: 22, minWidth: 16, maxWidth: 240, minFontSize: 8, maxFontSize: 22,
  maxSvgBytes: 2048, maxNodes: 64, maxDepth: 12, maxPayloadBytes: 4096,
};

// -- .bar 脚本提取与基础树工具 --
function extractBarScript(barPath) {
  assert.equal(typeof barPath, 'string', 'barPath must be a string');
  const rawXml = fs.readFileSync(barPath, 'utf8');
  assert(/<bar\b[^>]*\bprotocol-version="0"/.test(rawXml), `${barPath}: root <bar> must declare protocol-version="0"`);
  const match = rawXml.match(/<script[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/script>/)
    || rawXml.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  assert(match && match[1] != null, `${barPath}: missing <script> block`);
  return { rawXml, script: match[1] };
}

function flatten(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const item of node) flatten(item, out); return out; }
  out.push(node);
  if (Array.isArray(node.children)) for (const child of node.children) flatten(child, out);
  return out;
}

function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node !== 'object') return '';
  let text = '';
  if (typeof node.text === 'string' || typeof node.text === 'number') text += String(node.text);
  if (node.props && (typeof node.props.text === 'string' || typeof node.props.text === 'number')) {
    text += String(node.props.text);
  }
  if (Array.isArray(node.children)) for (const child of node.children) text += textOf(child);
  return text;
}

// -- Panel / Notch 树校验 --
function validatePanelTree(node, trace = 'panel') {
  if (node == null || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return;
  assert(typeof node === 'object' && !Array.isArray(node), `${trace}: must be a vnode object or primitive`);
  if (!('type' in node) && typeof node.text === 'string') return;
  assert.equal(typeof node.type, 'string', `${trace}: ComponentNode requires string type`);
  assert(PANEL_TYPES.has(node.type), `${trace}: unknown Panel ComponentType "${node.type}"`);
  const props = node.props || {};
  assert(typeof props === 'object' && !Array.isArray(props), `${trace}.${node.type}: props must be an object`);
  for (const stateKey of STATE_OVERLAY_KEYS) {
    const overlay = props[stateKey];
    if (overlay && typeof overlay === 'object' && !Array.isArray(overlay)) {
      assert(overlay.tw === undefined, `${trace}.${node.type}.${stateKey}: state overlay must not contain "tw"`);
      assert(overlay.safeArea === undefined, `${trace}.${node.type}.${stateKey}: state overlay must not contain "safeArea"`);
    }
  }
  if (node.children !== undefined) {
    assert(Array.isArray(node.children), `${trace}.${node.type}: children must be an array`);
    for (let i = 0; i < node.children.length; i++) validatePanelTree(node.children[i], `${trace}.${node.type}[${i}]`);
  }
}

// -- Widget 严格子集校验 --
function validateWidgetTree(node, trace = 'widget') {
  if (node == null || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return;
  assert(typeof node === 'object' && !Array.isArray(node), `${trace}: must be an object or primitive`);
  if (!('type' in node) && typeof node.text === 'string') return;
  const allowed = WIDGET_ALLOWED_PROPS[node.type];
  assert(allowed, `${trace}: forbidden WidgetComponentType "${node.type}"`);
  const props = node.props || {};
  assert(typeof props === 'object' && !Array.isArray(props), `${trace}.${node.type}: props must be an object`);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue;
    assert(!WIDGET_FORBIDDEN_PROPS.has(k), `${trace}.${node.type}: forbidden panel-only prop "${k}"`);
    assert(allowed.has(k), `${trace}.${node.type}: disallowed Widget prop "${k}"`);
    if (k === 'color' || k === 'textColor' || k === 'background') {
      assert(isValidWidgetColor(v), `${trace}.${node.type}.${k}: invalid WidgetColor "${v}"`);
    }
    if (k === 'alignItems' || k === 'textAlign') assert(WIDGET_ALIGN.has(v), `${trace}.${node.type}.${k}: invalid "${v}"`);
    if (k === 'orientation') assert(v === 'horizontal' || v === 'vertical', `${trace}.${node.type}.orientation: invalid "${v}"`);
  }
  if (node.type === 'Icon') assert(typeof props.svg === 'string' && props.svg.length > 0, `${trace}.Icon requires svg`);
  if (node.type === 'Image') assert(typeof props.src === 'string' && props.src.length > 0, `${trace}.Image requires src`);
  if (node.type === 'RichText' && Array.isArray(props.spans)) {
    for (const sp of props.spans) if (sp && sp.color !== undefined) assert(isValidWidgetColor(sp.color), `${trace}.RichText.spans: invalid color "${sp.color}"`);
  }
  if (node.type === 'Chart') {
    if (props.type !== undefined) assert(WIDGET_CHART_TYPES.has(props.type), `${trace}.Chart: invalid type "${props.type}"`);
    for (const d of props.data || []) if (d && d.color !== undefined) assert(isValidWidgetColor(d.color), `${trace}.Chart.data: invalid color "${d.color}"`);
    for (const s of props.series || []) if (s && s.color !== undefined) assert(isValidWidgetColor(s.color), `${trace}.Chart.series: invalid color "${s.color}"`);
  }
  if (node.children !== undefined) {
    assert(Array.isArray(node.children), `${trace}.${node.type}: children must be an array`);
    for (let i = 0; i < node.children.length; i++) validateWidgetTree(node.children[i], `${trace}.${node.type}[${i}]`);
  }
}

// -- TrayContent 原生富托盘校验 --
function validateTrayContent(node, options = {}, trace = 'tray.content') {
  const opts = typeof options === 'string' ? {} : (options || {});
  const rootTrace = typeof options === 'string' ? options : trace;
  const allowIcon = opts.allowIcon !== false;
  const budget = { nodes: 0, payloadBytes: 0 };

  function walk(cur, pathTrace, depth, isRoot) {
    assert(cur && typeof cur === 'object' && !Array.isArray(cur), `${pathTrace}: must be an object`);
    budget.nodes += 1;
    assert(budget.nodes <= TRAY_LIMITS.maxNodes, `${pathTrace}: node count exceeds ${TRAY_LIMITS.maxNodes}`);
    assert(depth <= TRAY_LIMITS.maxDepth, `${pathTrace}: depth exceeds ${TRAY_LIMITS.maxDepth}`);
    if (cur.type === 'Icon') assert(allowIcon, `${pathTrace}: Icon is disallowed when allowIcon is false`);
    const allowed = TRAY_ALLOWED_PROPS[cur.type];
    assert(allowed, `${pathTrace}: disallowed TrayContentNode type "${cur.type}"`);
    const props = cur.props || {};
    assert(typeof props === 'object' && !Array.isArray(props), `${pathTrace}.${cur.type}: props must be an object`);
    if (isRoot) {
      assert.equal(props.height, TRAY_LIMITS.rootHeight, `${pathTrace}: root height must equal ${TRAY_LIMITS.rootHeight}`);
      assert(
        Number.isInteger(props.width) && props.width >= TRAY_LIMITS.minWidth && props.width <= TRAY_LIMITS.maxWidth,
        `${pathTrace}: root width must be an integer in ${TRAY_LIMITS.minWidth}..${TRAY_LIMITS.maxWidth}`
      );
    }
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined) continue;
      assert(!TRAY_FORBIDDEN_PROPS.has(k), `${pathTrace}.${cur.type}: forbidden panel-only prop "${k}"`);
      assert(allowed.has(k), `${pathTrace}.${cur.type}: disallowed Tray prop "${k}"`);
      if (k === 'fontWeight') assert(Number.isInteger(v) && v >= 100 && v <= 900 && v % 100 === 0, `${pathTrace}: invalid fontWeight ${v}`);
      if (k === 'fontSize' && cur.type === 'Text') {
        assert(typeof v === 'number' && Number.isFinite(v) && v >= TRAY_LIMITS.minFontSize && v <= TRAY_LIMITS.maxFontSize, `${pathTrace}.Text: fontSize out of range ${v}`);
      }
      if (k === 'alignItems') assert(TRAY_ALIGN.has(v), `${pathTrace}: invalid alignItems "${v}"`);
      if (k === 'justify') assert(TRAY_JUSTIFY.has(v), `${pathTrace}: invalid justify "${v}"`);
    }
    if (cur.type === 'Icon') {
      assert(typeof props.svg === 'string' && props.svg.includes('<svg'), `${pathTrace}.Icon requires inline <svg>`);
      const svgBytes = Buffer.byteLength(props.svg, 'utf8');
      assert(svgBytes <= TRAY_LIMITS.maxSvgBytes, `${pathTrace}.Icon: svg exceeds ${TRAY_LIMITS.maxSvgBytes} bytes`);
      budget.payloadBytes += svgBytes;
    }
    if (cur.type === 'Chart') {
      assert(TRAY_CHART_TYPES.has(props.type), `${pathTrace}.Chart: type must be "line" or "area"`);
      assert(Array.isArray(props.series), `${pathTrace}.Chart: series must be an array`);
    }
    if (cur.type === 'Text' && props.text !== undefined) {
      assert.equal(typeof props.text, 'string', `${pathTrace}.Text: props.text must be a string`);
      budget.payloadBytes += Buffer.byteLength(props.text, 'utf8');
    }
    if (cur.children !== undefined) {
      assert(Array.isArray(cur.children), `${pathTrace}.${cur.type}: children must be an array`);
      if (cur.type === 'Text') {
        for (const ch of cur.children) {
          assert(typeof ch === 'string' || typeof ch === 'number', `${pathTrace}.Text child must be string|number`);
          budget.payloadBytes += Buffer.byteLength(String(ch), 'utf8');
        }
      } else if (cur.type === 'Row' || cur.type === 'Column') {
        for (let i = 0; i < cur.children.length; i++) walk(cur.children[i], `${pathTrace}.${cur.type}[${i}]`, depth + 1, false);
      } else {
        assert.equal(cur.children.length, 0, `${pathTrace}.${cur.type}: leaf node cannot have children`);
      }
    }
    assert(budget.payloadBytes <= TRAY_LIMITS.maxPayloadBytes, `${pathTrace}: payload exceeds ${TRAY_LIMITS.maxPayloadBytes} bytes`);
  }

  walk(node, rootTrace, 1, true);
}

// -- 多表面综合视图契约校验 --
function validateViewContract(view, options = {}) {
  assert(view && typeof view === 'object' && !Array.isArray(view), 'view must be an object');
  if (view.panel != null) validatePanelTree(view.panel, 'panel');
  if (view.tray != null) {
    assert(typeof view.tray === 'object' && !Array.isArray(view.tray), 'view.tray must be an object');
    if (view.tray.content != null) validateTrayContent(view.tray.content, { allowIcon: options.allowTrayIcon }, 'tray.content');
  }
  if (options.requireNotch) assert(view.notch && typeof view.notch === 'object', 'view.notch is required');
  if (view.notch != null) {
    assert(typeof view.notch === 'object' && !Array.isArray(view.notch), 'view.notch must be an object');
    if (view.notch.compact != null) {
      assert(typeof view.notch.compact === 'object', 'view.notch.compact must be an object');
      if (view.notch.compact.leading != null) validatePanelTree(view.notch.compact.leading, 'notch.compact.leading');
      if (view.notch.compact.trailing != null) validatePanelTree(view.notch.compact.trailing, 'notch.compact.trailing');
    }
    if (view.notch.minimal != null) validatePanelTree(view.notch.minimal, 'notch.minimal');
    if (view.notch.expanded != null) validatePanelTree(view.notch.expanded, 'notch.expanded');
  }
  if (options.requireWidget) {
    assert(view.widget && typeof view.widget === 'object', 'view.widget is required');
    assert(view.widget.small != null || view.widget.medium != null || view.widget.large != null, 'view.widget must define at least one family');
  }
  if (view.widget != null) {
    assert(typeof view.widget === 'object' && !Array.isArray(view.widget), 'view.widget must be an object');
    for (const family of ['small', 'medium', 'large']) {
      if (view.widget[family] != null) validateWidgetTree(view.widget[family], `widget.${family}`);
    }
  }
  const secrets = (options.forbidSecrets || []).filter(s => typeof s === 'string' && s.length > 0);
  if (secrets.length > 0) {
    const serialized = JSON.stringify(view);
    for (const secret of secrets) assert(!serialized.includes(secret), 'view leaked a forbidden secret');
  }
}

module.exports = {
  extractBarScript,
  flatten,
  textOf,
  validatePanelTree,
  validateWidgetTree,
  validateTrayContent,
  validateViewContract,
};
