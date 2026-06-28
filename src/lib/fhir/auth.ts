// src/lib/fhir/auth.ts
import "server-only";
import crypto from "crypto";
import { ehrEnv } from "./config";
import { getCachedToken, setCachedToken } from "./token-cache";

type TokenResponse = { access_token: string; expires_in?: number; patient?: string };

/**
 * Backend/system access token via OAuth2 client-credentials. Used for staff-side
 * reads (admin EHR summary). Cached in Upstash for `expires_in` seconds.
 */
export async function getSystemToken(): Promise<string> {
  const cached = await getCachedToken("system");
  if (cached) return cached;

  const { tokenUrl, clientId, clientSecret, scope } = ehrEnv();
  const res = await fetch(tokenUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId!,
      client_secret: clientSecret!,
      scope,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FHIR system token request failed (${res.status})`);
  const data = (await res.json()) as TokenResponse;
  await setCachedToken("system", data.access_token, data.expires_in ?? 300);
  return data.access_token;
}

// ---- Patient standalone launch (PKCE authorization-code) ----

export function makePkcePair() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function authorizeUrl(opts: { redirectUri: string; state: string; challenge: string }): string {
  const { baseUrl, clientId, scope } = ehrEnv();
  // SMART standalone launch authorize endpoint is conventionally <base>/authorize.
  const url = new URL(`${baseUrl}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId!);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", opts.state);
  url.searchParams.set("aud", baseUrl!);
  url.searchParams.set("code_challenge", opts.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/** Exchange an authorization code for a token; returns access token + the patient's FHIR id. */
export async function exchangeCode(opts: {
  code: string;
  redirectUri: string;
  verifier: string;
}): Promise<{ accessToken: string; patientFhirId: string | null; expiresIn: number }> {
  const { tokenUrl, clientId } = ehrEnv();
  const res = await fetch(tokenUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
      client_id: clientId!,
      code_verifier: opts.verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FHIR code exchange failed (${res.status})`);
  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    patientFhirId: data.patient ?? null,
    expiresIn: data.expires_in ?? 300,
  };
}
