// src/lib/fhir/client.ts
import "server-only";
import { audit } from "@/lib/audit";
import { ehrEnv, hashPatientId } from "./config";
import { FhirError, type OperationOutcome } from "./types";

type AuditImpl = (action: string, entity: string, meta: Record<string, unknown>) => void | Promise<void>;

export interface FhirGetOptions {
  patientFhirId: string;
  resourceType: string;
  // Injectable for tests; default to global fetch and the real audit logger.
  fetchImpl?: typeof fetch;
  auditImpl?: AuditImpl;
  baseUrl?: string;
}

/**
 * GET a FHIR resource/bundle. Sets bearer auth + fhir+json accept, throws a typed
 * FhirError on non-2xx, and writes exactly one audit row per call carrying only
 * the resource type, a hashed patient id, and the HTTP status — never the body.
 */
export async function fhirGet<T>(
  path: string,
  accessToken: string,
  opts: FhirGetOptions,
): Promise<T> {
  const doFetch = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl ?? ehrEnv().baseUrl ?? "";
  const url = path.startsWith("http") ? path : `${base}${path}`;

  const writeAudit: AuditImpl =
    opts.auditImpl ??
    // entityId is intentionally omitted (undefined) so no raw FHIR id is stored;
    // the hashed id lives in metadata.
    ((action, entity, meta) => audit(null, action, entity, undefined, meta));

  let res: Response;
  try {
    res = await doFetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/fhir+json" },
      cache: "no-store",
    });
  } catch (e) {
    await writeAudit("fhir.read", opts.resourceType, {
      patientIdHash: hashPatientId(opts.patientFhirId),
      status: 0,
    });
    throw new FhirError(0, null, `FHIR network error: ${(e as Error).message}`);
  }

  await writeAudit("fhir.read", opts.resourceType, {
    patientIdHash: hashPatientId(opts.patientFhirId),
    status: res.status,
  });

  if (!res.ok) {
    let outcome: OperationOutcome | null = null;
    try {
      outcome = (await res.json()) as OperationOutcome;
    } catch {
      outcome = null;
    }
    throw new FhirError(res.status, outcome);
  }
  return (await res.json()) as T;
}
