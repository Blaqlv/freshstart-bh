import { sanitizeHtml } from "@/lib/sanitize";

// Color-agnostic element styling so sanitized HTML reads well on both light and
// dark backgrounds (callers control text color via className). Links inherit
// color and just underline; lists get markers + indent.
const HTML_EXTRAS =
  "[&_a]:underline [&_a]:font-medium [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5";

const HAS_TAG = /<[a-z][\s\S]*>/i;

/**
 * Renders a block body. If it contains HTML tags (TinyMCE output) it is
 * sanitized and rendered as HTML; otherwise it is treated as legacy plain text
 * and split on blank lines into paragraphs. Empty input renders nothing.
 */
export function RichBody({
  text,
  className = "space-y-4 text-ink-soft",
}: {
  text?: string;
  className?: string;
}) {
  if (!text || !text.trim()) return null;

  if (HAS_TAG.test(text)) {
    return (
      <div
        className={`${className} ${HTML_EXTRAS}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
      />
    );
  }

  return (
    <div className={className}>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
