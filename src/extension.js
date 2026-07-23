import { isEbnfFence, isRrdFence, renderEbnfPlaceholders, renderRrdPlaceholder } from './fence.js';

export function configureMarkdownIt(md) {
  const fallback = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, environment, self) => {
    const token = tokens[index];
    if (isEbnfFence(token.info)) return renderEbnfPlaceholders(token.content);
    if (!isRrdFence(token.info)) return fallback(tokens, index, options, environment, self);
    return renderRrdPlaceholder(token.content);
  };
  return md;
}

export function activate() {
  return { extendMarkdownIt: configureMarkdownIt };
}
