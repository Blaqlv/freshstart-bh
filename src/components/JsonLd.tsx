/**
 * Renders a JSON-LD structured-data block (A3).
 *
 * Safe to use dangerouslySetInnerHTML here: the schema is built from our own CMS
 * / database records, never from user input. JSON.stringify also escapes the
 * payload. Rendered as a <script type="application/ld+json"> which Google reads
 * wherever it appears in the document.
 */
export function JsonLd({ schema }: { schema: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
    />
  );
}
