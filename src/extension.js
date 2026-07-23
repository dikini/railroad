import { isRrdFence, renderRrdPlaceholder } from './fence.js';

export function configureMarkdownIt(md) {
  const fallback = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, environment, self) => {
    const token = tokens[index];
    if (!isRrdFence(token.info)) return fallback(tokens, index, options, environment, self);
    return renderRrdPlaceholder(token.content);
  };
  return md;
}

export function activate() {
  return { extendMarkdownIt: configureMarkdownIt };
}
