// src/lib/medicaid/mco.ts
/** Ohio Medicaid managed-care organizations a BH provider must separately enroll with. */
export const MCO_NAMES = [
  "Buckeye",
  "CareSource",
  "Paramount",
  "Molina",
  "Anthem",
  "AmeriHealth",
  "Aetna Better Health",
] as const;
export type McoName = (typeof MCO_NAMES)[number];
