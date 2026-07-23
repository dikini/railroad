export function targetWidth(availableWidth, minContentWidth) {
  return Math.max(1, Math.floor(availableWidth), Math.ceil(minContentWidth));
}

export function viewBoxFor({ x, y, width, height }) {
  return `${x} ${y} ${width} ${height}`;
}

function decodeRrd(encoded) {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function renderError(host, error) {
  host.replaceChildren();
  const message = document.createElement('pre');
  message.className = 'rrd-error';
  message.textContent = `RRD diagram error: ${error instanceof Error ? error.message : String(error)}`;
  host.append(message);
}

function renderDiagram(host, librrd, stylesheet) {
  try {
    const diagram = decodeRrd(host.dataset.rrd ?? '');
    const parsedDiagram = librrd.parseDiagram(diagram);
    const parsedStylesheet = librrd.parseStylesheet(stylesheet);
    const minContent = librrd.minMaxContent(parsedDiagram, parsedStylesheet).minContent;
    const width = targetWidth(host.clientWidth, minContent);
    const svg = librrd.layOutToSVG(parsedDiagram, parsedStylesheet, width);

    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Railroad diagram');
    host.replaceChildren(svg);
    const bounds = svg.getBBox();
    svg.setAttribute('viewBox', viewBoxFor(bounds));
    svg.setAttribute('width', String(bounds.width));
    svg.setAttribute('height', String(bounds.height));
  } catch (error) {
    renderError(host, error);
  }
}

export function initializeRrdPreview(librrd, stylesheet) {
  const hosts = document.querySelectorAll('.rrd-diagram[data-rrd]');
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) renderDiagram(entry.target, librrd, stylesheet);
  });

  for (const host of hosts) {
    observer.observe(host);
    renderDiagram(host, librrd, stylesheet);
  }
}
