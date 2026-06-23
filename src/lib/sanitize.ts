import sanitizeHtmlLib from "sanitize-html";

/**
 * Sanitize TinyMCE HTML before rendering via dangerouslySetInnerHTML. Allowlist
 * matches the editor's formatting capabilities; everything else is stripped.
 *
 * Uses sanitize-html (pure JS, no jsdom) rather than DOMPurify so it loads
 * cleanly in the Vercel serverless bundle — isomorphic-dompurify pulled in jsdom,
 * whose dependency tree threw ERR_REQUIRE_ESM at runtime on every CMS page.
 */
export function sanitizeHtml(dirty: string): string {
  return sanitizeHtmlLib(dirty, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
      "h2", "h3", "h4", "blockquote", "pre", "code", "span", "div", "hr", "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "class"],
      img: ["src", "alt", "width", "height", "class"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    // Drop tag contents (don't leak text) for clearly unsafe elements.
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "noscript"],
  });
}
