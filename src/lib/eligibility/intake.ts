// src/lib/eligibility/intake.ts
import "server-only";
import { db } from "@/lib/db";
import { decryptJson } from "@/lib/crypto";
import { checkEligibility } from "./adapter";
import { payerCodeFor } from "@/lib/insurance/payers";

/**
 * Post-response (Next after()) eligibility check for an intake. Best-effort — never
 * throws into the request. Reads the encrypted intake data, resolves the payer, runs
 * the check, and writes a PII-free VerificationAttempt linked to the intake.
 */
export async function runIntakeEligibility(intakeId: string): Promise<void> {
  try {
    const intake = await db.intakeSubmission.findUnique({ where: { id: intakeId } });
    if (!intake) return;
    const data = decryptJson<Record<string, string>>(intake.dataEncrypted);
    const provider = data.insuranceProvider?.trim();
    const memberId = data.memberId?.trim();
    if (!provider || !memberId) return; // self-pay / no insurance entered
    const payerCode = await payerCodeFor(provider);
    const [first, ...rest] = (data.fullName ?? "").trim().split(/\s+/);
    let resultStatus = "unknown";
    let rawResponseHash = "";
    if (payerCode) {
      const r = await checkEligibility({
        patientFirstName: first ?? "",
        patientLastName: rest.join(" "),
        patientDob: data.dob ?? "",
        memberId,
        insurancePayerCode: payerCode,
      });
      resultStatus = r.status;
      rawResponseHash = r.rawResponseHash;
    }
    await db.verificationAttempt.create({
      data: { insurerName: provider, payerCode: payerCode ?? "", resultStatus, rawResponseHash, source: "intake", intakeId },
    });
  } catch (e) {
    console.error("intake eligibility failed", e);
  }
}
