/**
 * Intake step definitions. Plain (non-server) module so both the patient-facing
 * step form and the admin review screen render from the same field labels.
 * Field `name`s are the keys in the encrypted intake payload JSON.
 */

export type IntakeFieldType = "text" | "email" | "tel" | "date" | "textarea" | "select" | "radio" | "checkbox";

export type IntakeField = {
  name: string;
  label: string;
  type: IntakeFieldType;
  required?: boolean;
  options?: string[];
  help?: string;
};

export type IntakeStep = {
  key: string;
  title: string;
  description?: string;
  fields: IntakeField[];
};

const US_STATE = { name: "state", label: "State", type: "text" as const };

export const INTAKE_STEPS: IntakeStep[] = [
  {
    key: "demographics",
    title: "Your information",
    description: "Tell us who you are. This becomes part of your medical record.",
    fields: [
      { name: "fullName", label: "Full legal name", type: "text", required: true },
      { name: "preferredName", label: "Preferred name", type: "text" },
      { name: "dob", label: "Date of birth", type: "date", required: true },
      { name: "phone", label: "Mobile phone", type: "tel", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "address1", label: "Street address", type: "text", required: true },
      { name: "city", label: "City", type: "text", required: true },
      US_STATE,
      { name: "zip", label: "ZIP", type: "text", required: true },
      { name: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Non-binary", "Prefer to self-describe", "Prefer not to say"] },
      {
        name: "smsConsent",
        label:
          "I consent to receive appointment reminders and scheduling updates by text message to the phone number provided. Message and data rates may apply. Reply STOP to unsubscribe.",
        type: "checkbox",
      },
    ],
  },
  {
    key: "insurance",
    title: "Insurance",
    description: "If you're using insurance, enter it here. You can also choose self-pay.",
    fields: [
      { name: "insuranceProvider", label: "Insurance provider", type: "text", help: "e.g. Aetna, Anthem, Medicaid, or 'Self-pay'" },
      { name: "memberId", label: "Member ID", type: "text" },
      { name: "groupNumber", label: "Group number", type: "text" },
      { name: "policyholderName", label: "Policyholder name (if not you)", type: "text" },
    ],
  },
  {
    key: "medical",
    title: "Medical history",
    fields: [
      { name: "primaryCare", label: "Primary care physician", type: "text" },
      { name: "medications", label: "Current medications & dosages", type: "textarea", help: "List one per line, or 'None'." },
      { name: "allergies", label: "Allergies", type: "textarea", help: "Medication or other allergies, or 'None'." },
      { name: "conditions", label: "Current/past medical conditions", type: "textarea" },
    ],
  },
  {
    key: "mental_health",
    title: "Mental health history",
    fields: [
      { name: "concerns", label: "What brings you in today?", type: "textarea", required: true },
      { name: "priorTreatment", label: "Have you received mental health treatment before?", type: "radio", options: ["Yes", "No"], required: true },
      { name: "priorTreatmentDetails", label: "If yes, briefly describe", type: "textarea" },
      { name: "hospitalizations", label: "Any prior psychiatric hospitalizations?", type: "radio", options: ["Yes", "No"] },
    ],
  },
  {
    key: "emergency",
    title: "Emergency contact",
    fields: [
      { name: "emergencyName", label: "Contact name", type: "text", required: true },
      { name: "emergencyRelationship", label: "Relationship to you", type: "text", required: true },
      { name: "emergencyPhone", label: "Contact phone", type: "tel", required: true },
    ],
  },
  {
    key: "consents",
    title: "Consents",
    description: "Please review and acknowledge the following.",
    fields: [
      { name: "consentTreatment", label: "I consent to evaluation and treatment at Fresh Start Behavioral Health.", type: "checkbox", required: true },
      { name: "consentHipaa", label: "I acknowledge receipt of the Notice of Privacy Practices (HIPAA).", type: "checkbox", required: true },
      { name: "consentFinancial", label: "I understand my financial responsibility for services not covered by insurance.", type: "checkbox", required: true },
      { name: "consentTelehealth", label: "I consent to telehealth visits where appropriate (optional).", type: "checkbox" },
    ],
  },
];

export const REVIEW_STEP_INDEX = INTAKE_STEPS.length; // signature/review is the final step
export const TOTAL_STEPS = INTAKE_STEPS.length + 1;

export function requiredFieldsFor(step: IntakeStep): string[] {
  return step.fields.filter((f) => f.required).map((f) => f.name);
}
