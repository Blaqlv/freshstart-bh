/**
 * Renders plain-text content as paragraphs, splitting on blank lines.
 * Phase A: bodies are plain text (no HTML). Phase B replaces this with
 * sanitized TinyMCE HTML — block field shapes stay the same.
 */
export function Paragraphs({
  text,
  className = "space-y-4 text-ink-soft",
}: {
  text?: string;
  className?: string;
}) {
  if (!text || !text.trim()) return null;
  return (
    <div className={className}>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
