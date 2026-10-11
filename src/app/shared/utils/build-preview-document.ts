// Content-Security-Policy placed inside the preview document.
// It limits what the generated page can load or send, even though the sandbox already isolates it.
export const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'", // generated JS is inlined; external scripts are blocked
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com data:',
  'img-src https: data:',
  'media-src https: data:',
  "connect-src 'none'", // no fetch / XHR / WebSocket to anywhere
  "form-action 'none'",
  "base-uri 'none'",
  "frame-src 'none'",
].join('; ');

// Combines the three project files into one HTML document for the sandboxed iframe.
export function buildPreviewDocument(html: string, css: string, js: string): string {
  const style = `<style>\n${css.replace(/<\/style/gi, '<\\/style')}\n</style>`;
  const script = `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`;

  const linkTag = /<link[^>]*href=["']\.?\/?style\.css["'][^>]*>/i;
  const scriptTag = /<script[^>]*src=["']\.?\/?script\.js["'][^>]*>\s*<\/script>/i;

  let doc = html;
  // Function replacers avoid special "$" handling in the replacement text.
  doc = linkTag.test(doc) ? doc.replace(linkTag, () => style) : injectBefore(doc, '</head>', style);
  doc = scriptTag.test(doc) ? doc.replace(scriptTag, () => script) : injectBefore(doc, '</body>', script);
  return injectCsp(doc);
}

// The CSP must be the FIRST thing in <head>: a meta policy only applies to content after it.
// If the generated HTML adds its own CSP, the browser applies both, so it can only get stricter.
function injectCsp(doc: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`;

  const head = /<head(?:\s[^>]*)?>/i; // does not match <header>
  if (head.test(doc)) return doc.replace(head, (m) => m + meta);

  const htmlTag = /<html(?:\s[^>]*)?>/i;
  if (htmlTag.test(doc)) return doc.replace(htmlTag, (m) => `${m}<head>${meta}</head>`);

  return `<!DOCTYPE html><html><head>${meta}</head><body>${doc}</body></html>`;
}

function injectBefore(doc: string, closingTag: string, content: string): string {
  const index = doc.toLowerCase().lastIndexOf(closingTag);
  return index === -1 ? doc + content : doc.slice(0, index) + content + doc.slice(index);
}