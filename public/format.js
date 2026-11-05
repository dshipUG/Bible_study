const markdown = window.markdownit({html: false, breaks: true, linkify: false});
// Remote images are unnecessary in study answers. Keep raw HTML inert.
markdown.disable('image');
const defaultLink = markdown.renderer.rules.link_open || ((tokens, index, options, env, renderer) => renderer.renderToken(tokens, index, options));
markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  tokens[index].attrSet('target', '_blank');
  tokens[index].attrSet('rel', 'noopener noreferrer');
  return defaultLink(tokens, index, options, env, renderer);
};
export function messageBody(role, content) {
  const body = document.createElement('div');
  body.className = 'message-body';
  if (role === 'assistant') body.innerHTML = markdown.render(content);
  else body.textContent = content;
  return body;
}
