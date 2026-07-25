import { parseHTML } from 'linkedom';

import { compileEbnf } from './ebnf.js';

export const defaultLayoutStylesheet = `
terminal, nonterminal {
  font: monospace normal normal 14px;
}

:root {
  align-items: top;
  justify-content: space-between;
  flex-absorb: 0.3;
}`;

const domGlobals = ['document', 'window', 'Node', 'Element', 'SVGElement'];
let librrd;

function sourceText(node) {
  if (node.type === 'text') return node.value;
  return (node.children ?? []).map(sourceText).join('');
}

function codeLanguage(node) {
  const classes = node.properties?.className;
  const classNames = Array.isArray(classes) ? classes : typeof classes === 'string' ? classes.split(/\s+/) : [];
  if (classNames.includes('language-rrd')) return 'rrd';
  if (classNames.includes('language-ebnf')) return 'ebnf';
  return undefined;
}

function domToHast(node) {
  if (node.nodeType === 3) return { type: 'text', value: node.data };
  if (node.nodeType !== 1) return undefined;

  const properties = {};
  for (const attribute of node.attributes) {
    if (attribute.name === 'class') {
      properties.className = attribute.value.split(/\s+/).filter(Boolean);
    } else {
      properties[attribute.name] = attribute.value;
    }
  }

  return {
    type: 'element',
    tagName: node.localName,
    properties,
    children: [...node.childNodes].map(domToHast).filter(Boolean)
  };
}

function withDom(callback) {
  const { document, window } = parseHTML('<!doctype html><html><body></body></html>');
  const previous = domGlobals.map((name) => ({ name, exists: Object.hasOwn(globalThis, name), value: globalThis[name] }));

  try {
    Object.assign(globalThis, {
      document,
      window,
      Node: window.Node,
      Element: window.Element,
      SVGElement: window.SVGElement
    });
    return callback();
  } finally {
    for (const { name, exists, value } of previous) {
      if (exists) globalThis[name] = value;
      else delete globalThis[name];
    }
  }
}

async function loadLibrrd() {
  if (!librrd) librrd = import('../vendor/librrd-main/api/librrd.js').then(({ LibRRD }) => LibRRD);
  return librrd;
}

async function renderSvg(rrd, { stylesheet, width }) {
  const LibRRD = await loadLibrrd();
  const svg = withDom(() => LibRRD.layOutToSVG(rrd, stylesheet, width));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Railroad diagram');
  svg.setAttribute('width', String(width));
  return domToHast(svg);
}

function errorNode(error) {
  return {
    type: 'element',
    tagName: 'pre',
    properties: { className: ['rrd-error'] },
    children: [{ type: 'text', value: `Railroad diagram error: ${error instanceof Error ? error.message : String(error)}` }]
  };
}

function figure(svg, name) {
  return {
    type: 'element',
    tagName: 'figure',
    properties: { className: ['rrd-diagram'] },
    children: [
      ...(name ? [{
        type: 'element',
        tagName: 'figcaption',
        properties: {},
        children: [{ type: 'text', value: name }]
      }] : []),
      svg
    ]
  };
}

function isFence(node) {
  return node?.type === 'element'
    && node.tagName === 'pre'
    && node.children?.length === 1
    && node.children[0].type === 'element'
    && node.children[0].tagName === 'code';
}

async function transformChildren(parent, settings, file) {
  if (!parent.children) return;

  for (let index = 0; index < parent.children.length; index++) {
    const node = parent.children[index];
    if (!isFence(node)) {
      await transformChildren(node, settings, file);
      continue;
    }

    const code = node.children[0];
    const language = codeLanguage(code);
    if (!language) continue;

    try {
      const diagrams = language === 'rrd'
        ? [{ rrd: sourceText(code) }]
        : compileEbnf(sourceText(code));
      const figures = [];
      for (const diagram of diagrams) {
        const svg = await settings.renderer(diagram.rrd, settings);
        figures.push(figure(svg, diagram.name));
      }
      parent.children.splice(index, 1, ...figures);
      index += figures.length - 1;
    } catch (error) {
      const message = `Railroad diagram error: ${error instanceof Error ? error.message : String(error)}`;
      file.message(message, node);
      parent.children.splice(index, 1, errorNode(error));
    }
  }
}

export function rehypeRailroad(options = {}) {
  const settings = {
    width: options.width ?? 800,
    stylesheet: options.stylesheet ?? defaultLayoutStylesheet,
    renderer: options.renderer ?? renderSvg
  };

  return async function transform(tree, file) {
    await transformChildren(tree, settings, file);
  };
}

export default rehypeRailroad;
