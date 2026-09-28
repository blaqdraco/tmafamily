export const ROLES = {
  MEMBER: "member",
  COMMUNICATION: "communication",
  HR: "hr",
  FINANCE: "finance",
  ADMIN: "admin",
};

export const WORKFLOW_STATUSES = {
  DRAFT: "draft",
  PENDING_COMMUNICATION: "pending_communication",
  PENDING_HR: "pending_hr",
  PENDING_FINANCE: "pending_finance",
  APPROVED: "approved",
  REJECTED: "rejected",
  ACTION_REQUIRED: "action_required",
};

export const STATUS_LABELS = {
  draft: "Draft",
  pending: "Pending communication",
  pending_communication: "Pending communication",
  pending_hr: "Pending HR review",
  pending_finance: "Pending finance verification",
  approved: "Approved",
  rejected: "Rejected",
  action_required: "Action required",
};

export function registrationLockMessage(application) {
  if (!application.id || ["draft", "action_required", "rejected"].includes(application.status)) return "";
  if (application.status === "approved") return "Your registration has been approved. No further submission is needed.";
  const stage = {
    pending: "Communication",
    pending_communication: "Communication",
    pending_hr: "HR",
    pending_finance: "Finance",
  }[application.status];
  return stage
    ? `Your registration has already been submitted and is awaiting ${stage} review. You do not need to submit it again.`
    : "Your registration cannot be edited at its current stage. Please check your registration status.";
}

export const WORKFLOW_STEPS = [
  { id: "applicant", label: "Applicant" },
  { id: "communication", label: "Communication" },
  { id: "hr", label: "HR" },
  { id: "finance", label: "Finance" },
];

export const ROLE_PORTALS = {
  communication: {
    title: "Communication Portal",
    badge: "Communication",
    description: "Review new submissions and forward complete applications to HR.",
    queueStatus: WORKFLOW_STATUSES.PENDING_COMMUNICATION,
    themeClass: "role-communication",
    forwardLabel: "Forward to HR",
    forwardStatus: WORKFLOW_STATUSES.PENDING_HR,
    notesField: "communication_notes",
    reviewedAtField: "communication_reviewed_at",
  },
  hr: {
    title: "HR Portal",
    badge: "HR",
    description: "Verify member details and forward approved applications to Finance.",
    queueStatus: WORKFLOW_STATUSES.PENDING_HR,
    themeClass: "role-hr",
    forwardLabel: "Forward to Finance",
    forwardStatus: WORKFLOW_STATUSES.PENDING_FINANCE,
    notesField: "hr_notes",
    reviewedAtField: "hr_reviewed_at",
  },
  finance: {
    title: "Finance Portal",
    badge: "Finance",
    description: "Verify payment receipts and approve membership registrations.",
    queueStatus: WORKFLOW_STATUSES.PENDING_FINANCE,
    themeClass: "role-finance",
    forwardLabel: "Verify payment & approve",
    forwardStatus: WORKFLOW_STATUSES.APPROVED,
    notesField: "finance_notes",
    reviewedAtField: "finance_reviewed_at",
  },
  admin: {
    title: "Admin Console",
    badge: "Admin",
    description: "Full visibility across the applicant → communication → HR → finance workflow.",
    queueStatus: null,
    themeClass: "role-admin",
    forwardLabel: "Forward",
    forwardStatus: null,
    notesField: "office_comments",
    reviewedAtField: "reviewed_at",
  },
};

export function isStaffRole(role) {
  return [ROLES.COMMUNICATION, ROLES.HR, ROLES.FINANCE, ROLES.ADMIN].includes(role);
}

export function activeWorkflowStep(status) {
  if (status === WORKFLOW_STATUSES.PENDING_COMMUNICATION || status === "pending") return "communication";
  if (status === WORKFLOW_STATUSES.PENDING_HR) return "hr";
  if (status === WORKFLOW_STATUSES.PENDING_FINANCE) return "finance";
  if (status === WORKFLOW_STATUSES.APPROVED) return "finance";
  return "applicant";
}

export function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

export function formatNida(value) {
  const digits = digitsOnly(value);
  if (digits.length !== 20) return digits;
  return `${digits.slice(0, 8)}-${digits.slice(8, 13)}-${digits.slice(13, 18)}-${digits.slice(18, 20)}`;
}

export function isValidTanzaniaNin(value) {
  return /^(?:[0-9]{20}|[0-9]{8}-[0-9]{5}-[0-9]{5}-[0-9]{2})$/.test(String(value || "").trim());
}

export function ageFromBirthdate(value, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  const [year, month, day] = value.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  if (year < 1 || birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return "";
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age >= 0 ? String(age) : "";
}

export function canReviewApplication(role, status) {
  const reviewStages = ["pending_communication", "pending_hr", "pending_finance"];
  return role === ROLES.ADMIN ? reviewStages.includes(status) : ROLE_PORTALS[role]?.queueStatus === status;
}

export function requiredReviewNote(fields, notesField) {
  return [fields.action_required_note, fields[notesField], fields.office_comments]
    .map((value) => String(value || "").trim()).find(Boolean) || "";
}

export function sortedHistory(application) {
  return [...(application.history || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || Number(b.id) - Number(a.id));
}

export function submissionLabel(application) {
  const event = sortedHistory(application).find((item) => ["submitted", "resubmitted"].includes(item.action));
  return event?.action === "resubmitted" ? "Resubmitted" : "Submitted";
}
