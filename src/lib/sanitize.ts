import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize TinyMCE HTML before rendering via dangerouslySetInnerHTML. Allowlist
 * matches the editor's formatting capabilities; everything else is stripped.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
      "h2", "h3", "h4", "blockquote", "pre", "code", "span", "div", "hr", "img",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "src", "alt", "width", "height"],
  });
}
