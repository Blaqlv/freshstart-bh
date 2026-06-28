export type ModuleSeed = {
  key: string;
  label: string;
  description: string;
  group: "public_site" | "portals" | "admin" | "compliance" | "integrations";
  canDisable: boolean;
};

export const MODULES: ModuleSeed[] = [
  { key: "cms", label: "Content Management System", description: "Page authoring, blocks, media.", group: "admin", canDisable: false },
  { key: "public_site", label: "Public Marketing Site", description: "Public-facing website.", group: "public_site", canDisable: false },
  { key: "patient_portal", label: "Patient Portal", description: "Patient-facing portal.", group: "portals", canDisable: true },
  { key: "intake_portal", label: "New Patient Intake Portal", description: "Patient intake flow.", group: "portals", canDisable: true },
  { key: "appointment_requests", label: "Appointment Request Forms", description: "Public/staff appointment requests & forms.", group: "portals", canDisable: true },
  { key: "insurance_verification", label: "Insurance Verification (Manual)", description: "Manual insurance checks.", group: "portals", canDisable: true },
  { key: "insurance_verification_auto", label: "Automated Insurance Eligibility", description: "Automated eligibility checks.", group: "integrations", canDisable: true },
  { key: "secure_messaging", label: "Secure Messaging (Patient ↔ Staff)", description: "Encrypted messaging.", group: "portals", canDisable: true },
  { key: "document_upload", label: "Secure Document Upload", description: "Patient document upload.", group: "portals", canDisable: true },
  { key: "billing_statements", label: "Billing Statements", description: "Patient billing statements.", group: "portals", canDisable: true },
  { key: "provider_profiles", label: "Provider / Staff Profiles", description: "Public provider profiles.", group: "public_site", canDisable: true },
  { key: "blog_resources", label: "Blog & Resources", description: "Blog and resource articles.", group: "public_site", canDisable: true },
  { key: "careers", label: "Careers Module", description: "Careers/jobs.", group: "public_site", canDisable: true },
  { key: "reviews_moderation", label: "Review / Testimonial Moderation", description: "Moderate reviews & testimonials.", group: "admin", canDisable: true },
  { key: "audit_log", label: "Audit Log", description: "Immutable audit trail.", group: "admin", canDisable: false },
  { key: "user_management", label: "User & Role Management", description: "Manage users and roles.", group: "admin", canDisable: false },
  { key: "incident_reporting", label: "Incident Reporting", description: "Compliance incidents.", group: "compliance", canDisable: true },
  { key: "analytics_dashboard", label: "Analytics Dashboard", description: "Admin analytics.", group: "admin", canDisable: true },
  { key: "ehr_integration", label: "EHR Integration (FHIR)", description: "Read-only FHIR integration.", group: "integrations", canDisable: true },
  { key: "sms_notifications", label: "SMS Notifications (Telnyx)", description: "Outbound SMS.", group: "integrations", canDisable: true },
  { key: "medicaid_enrollment", label: "Medicaid Enrollment Module", description: "Medicaid enrollment cases.", group: "compliance", canDisable: true },
  { key: "cookie_consent", label: "Cookie Consent Manager", description: "Consent banner.", group: "public_site", canDisable: false },
  { key: "multilingual", label: "Multi-Language (Spanish)", description: "Spanish translations.", group: "public_site", canDisable: true },
  { key: "gbp_sync", label: "Google Business Profile Sync", description: "GBP sync.", group: "integrations", canDisable: true },
  { key: "statuspage", label: "Status Page Integration", description: "Status page.", group: "admin", canDisable: true },
  { key: "system_control", label: "System Control Panel", description: "Super Admin control panel.", group: "admin", canDisable: false },
];
