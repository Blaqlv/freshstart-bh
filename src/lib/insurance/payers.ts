// src/lib/insurance/payers.ts
import "server-only";
import { db } from "@/lib/db";

export type Payer = { id: string; name: string; payerCode: string; isActive: boolean };

export async function listActivePayers(): Promise<Payer[]> {
  return db.insurancePayer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}
export async function listAllPayers(): Promise<Payer[]> {
  return db.insurancePayer.findMany({ orderBy: { name: "asc" } });
}
/** Active payer code for an insurer display name; null if not found/inactive. */
export async function payerCodeFor(insurerName: string): Promise<string | null> {
  const p = await db.insurancePayer.findFirst({ where: { name: insurerName, isActive: true } });
  return p?.payerCode ?? null;
}
