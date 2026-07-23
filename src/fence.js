import { compileEbnf } from './ebnf.js';

export function isRrdFence(info) {
  return /^rrd(?:\s|$)/.test(info.trim());
}

export function isEbnfFence(info) {
  return /^ebnf(?:\s|$)/.test(info.trim());
}

export function renderRrdPlaceholder(source) {
  const encoded = Buffer.from(source, 'utf8').toString('base64url');
  return `<div class="rrd-diagram" data-rrd="${encoded}"></div>`;
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function renderEbnfPlaceholders(source) {
  try {
    return compileEbnf(source)
      .map(({ name, rrd }) => `<section class="rrd-production"><h4>${escapeHtml(name)}</h4>${renderRrdPlaceholder(rrd)}</section>`)
      .join('');
  } catch (error) {
    return `<pre class="rrd-error">${escapeHtml(error instanceof Error ? error.message : String(error))}</pre>`;
  }
}
