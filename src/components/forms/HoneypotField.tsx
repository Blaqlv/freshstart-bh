/**
 * Honeypot field (A8). Visually hidden + off the tab order + aria-hidden so real
 * users never see or focus it, but naive bots fill every input they find. The
 * server action treats any non-empty value as spam.
 *
 * Use the shared name via HONEYPOT_FIELD so the server check stays in sync.
 */
export const HONEYPOT_FIELD = "website";

export function HoneypotField() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
      <label>
        Do not fill this out
        <input
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
    </div>
  );
}
