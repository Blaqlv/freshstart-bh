import "server-only";
import { generateSecret as otpGenerateSecret, generateURI, verifySync } from "otplib";

const ISSUER = "Fresh Start Admin";

export function generateSecret(): string {
  return otpGenerateSecret();
}

export function otpauthUrl(email: string, secret: string): string {
  return generateURI({ issuer: ISSUER, label: email, secret });
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    // epochTolerance is in seconds; 30 = ±1 time step of clock drift.
    const result = verifySync({ token: token.replace(/\s/g, ""), secret, epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}
