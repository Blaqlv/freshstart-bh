export type PermissionSeed = { key: string; label: string; description: string; moduleKey: string };

export const PERMISSIONS: PermissionSeed[] = [
  // appointment_requests
  { key: "appointments.view_requests", label: "View appointment requests", description: "", moduleKey: "appointment_requests" },
  { key: "appointments.manage_requests", label: "Manage appointment requests", description: "", moduleKey: "appointment_requests" },
  { key: "appointments.manage_slots", label: "Manage appointment slots", description: "", moduleKey: "appointment_requests" },
  { key: "forms.manage", label: "Manage forms", description: "", moduleKey: "appointment_requests" },
  // patient_portal
  { key: "patient_portal.view_messages", label: "View messages", description: "", moduleKey: "patient_portal" },
  { key: "patient_portal.send_messages", label: "Send messages", description: "", moduleKey: "patient_portal" },
  { key: "patient_portal.view_documents", label: "View documents", description: "", moduleKey: "patient_portal" },
  { key: "patient_portal.manage_documents", label: "Manage documents", description: "", moduleKey: "patient_portal" },
  { key: "patient_portal.view_billing", label: "View billing", description: "", moduleKey: "patient_portal" },
  { key: "patient_portal.manage_billing", label: "Manage billing", description: "", moduleKey: "patient_portal" },
  { key: "patients.view", label: "View patient records", description: "", moduleKey: "patient_portal" },
  { key: "patients.manage", label: "Manage patient records", description: "", moduleKey: "patient_portal" },
  // cms
  { key: "cms.view_pages", label: "View pages", description: "", moduleKey: "cms" },
  { key: "cms.edit_pages", label: "Edit pages", description: "", moduleKey: "cms" },
  { key: "cms.publish_pages", label: "Publish pages", description: "", moduleKey: "cms" },
  { key: "cms.delete_pages", label: "Delete pages", description: "", moduleKey: "cms" },
  { key: "cms.manage_media", label: "Manage media", description: "", moduleKey: "cms" },
  // provider_profiles
  { key: "providers.manage", label: "Manage provider profiles", description: "", moduleKey: "provider_profiles" },
  // reviews_moderation
  { key: "reviews.moderate", label: "Moderate reviews/testimonials", description: "", moduleKey: "reviews_moderation" },
  // analytics_dashboard
  { key: "analytics.view", label: "View analytics dashboard", description: "", moduleKey: "analytics_dashboard" },
  // billing_statements
  { key: "billing.manage", label: "Manage billing statements", description: "", moduleKey: "billing_statements" },
  // user_management
  { key: "users.view", label: "View users", description: "", moduleKey: "user_management" },
  { key: "users.create", label: "Create users", description: "", moduleKey: "user_management" },
  { key: "users.edit", label: "Edit users", description: "", moduleKey: "user_management" },
  { key: "users.deactivate", label: "Deactivate users", description: "", moduleKey: "user_management" },
  { key: "users.manage", label: "Full user management", description: "", moduleKey: "user_management" },
  { key: "roles.view", label: "View roles", description: "", moduleKey: "user_management" },
  { key: "roles.edit", label: "Edit roles", description: "", moduleKey: "user_management" },
  // audit_log
  { key: "audit_log.view", label: "View audit log", description: "", moduleKey: "audit_log" },
  // incident_reporting
  { key: "incident_reporting.view", label: "View incidents", description: "", moduleKey: "incident_reporting" },
  { key: "incident_reporting.create", label: "Create incidents", description: "", moduleKey: "incident_reporting" },
  { key: "incident_reporting.manage", label: "Manage incidents", description: "", moduleKey: "incident_reporting" },
  // ehr_integration
  { key: "ehr.view_patient_data", label: "View EHR patient data", description: "", moduleKey: "ehr_integration" },
  { key: "ehr.link_patients", label: "Link EHR patients", description: "", moduleKey: "ehr_integration" },
  // medicaid_enrollment
  { key: "medicaid_enrollment.view", label: "View enrollments", description: "", moduleKey: "medicaid_enrollment" },
  { key: "medicaid_enrollment.create", label: "Create enrollments", description: "", moduleKey: "medicaid_enrollment" },
  { key: "medicaid_enrollment.manage", label: "Manage enrollments", description: "", moduleKey: "medicaid_enrollment" },
  { key: "medicaid_enrollment.view_documents", label: "View enrollment documents", description: "", moduleKey: "medicaid_enrollment" },
  { key: "medicaid_enrollment.upload_documents", label: "Upload enrollment documents", description: "", moduleKey: "medicaid_enrollment" },
  // insurance_verification_auto
  { key: "insurance_verification_auto.use", label: "Run automated eligibility", description: "", moduleKey: "insurance_verification_auto" },
  // system_control
  { key: "system.manage_modules", label: "Manage modules", description: "", moduleKey: "system_control" },
  { key: "system.manage_roles", label: "Manage roles", description: "", moduleKey: "system_control" },
  { key: "system.manage_permissions", label: "Manage permissions", description: "", moduleKey: "system_control" },
  { key: "system.view_system_config", label: "View system config", description: "", moduleKey: "system_control" },
];
