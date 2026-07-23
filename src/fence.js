export function isRrdFence(info) {
  return /^rrd(?:\s|$)/.test(info.trim());
}

export function renderRrdPlaceholder(source) {
  const encoded = Buffer.from(source, 'utf8').toString('base64url');
  return `<div class="rrd-diagram" data-rrd="${encoded}"></div>`;
}
