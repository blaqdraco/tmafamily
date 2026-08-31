import { createClient } from "@supabase/supabase-js";
import {
  ROLE_PORTALS,
  ROLES,
  STATUS_LABELS,
  WORKFLOW_STATUSES,
  isStaffRole,
} from "./workflowConfig";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://example.supabase.co",
  supabaseAnonKey || "missing-anon-key",
);

const PAYMENT_RECEIPTS_BUCKET = "payment-receipts";

function authRedirectUrl() {
  if (typeof window === "undefined") return undefined;
  return window.location.origin;
}

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
}

function raise(error) {
  if (error) throw new Error(error.message || "Request failed");
}

function resolveRole(profile) {
  if (profile?.role && profile.role !== ROLES.MEMBER) return profile.role;
  if (profile?.is_admin) return ROLES.ADMIN;
  return ROLES.MEMBER;
}

function withStatusLabel(application) {
  if (!application) return application;
  return {
    ...application,
    status_label: STATUS_LABELS[application.status] || application.status,
  };
}

function cleanApplication(application) {
  const payload = {};
  [
    "full_name",
    "gender",
    "date_of_birth",
    "age",
    "phone_number",
    "email",
    "nida_number",
    "residential_address",
    "region",
    "district",
    "profession",
    "institution",
    "education_level",
    "work_experience_years",
    "marital_status",
    "member_group",
    "parents",
    "children",
    "emergency_name",
    "emergency_relationship",
    "emergency_phone",
    "emergency_address",
    "declaration_accepted",
    "payment_receipt_path",
    "payment_receipt_uploaded_at",
    "payment_verified",
    "payment_verified_at",
  ].forEach((field) => {
    if (application[field] !== undefined) payload[field] = application[field];
  });

  return {
    ...payload,
    age: payload.age === "" ? null : payload.age,
    work_experience_years: payload.work_experience_years === "" ? null : payload.work_experience_years,
    date_of_birth: payload.date_of_birth || null,
    office_received_at: payload.office_received_at || null,
  };
}

export async function getCurrentUser() {
  requireSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  raise(sessionError);

  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, username, is_admin, role")
    .eq("id", authUser.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") raise(profileError);

  const role = resolveRole(profile);

  return {
    id: authUser.id,
    email: authUser.email,
    username: profile?.username || authUser.email,
    first_name: profile?.first_name || authUser.user_metadata?.first_name || "",
    last_name: profile?.last_name || authUser.user_metadata?.last_name || "",
    role,
    is_staff: isStaffRole(role),
    is_admin: role === ROLES.ADMIN,
  };
}

export async function registerUser(form) {
  requireSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: form.email,
    password: form.password,
    options: {
      emailRedirectTo: authRedirectUrl(),
      data: {
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
      },
    },
  });
  raise(error);

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      username: form.username,
      first_name: form.first_name,
      last_name: form.last_name,
      is_admin: false,
      role: ROLES.MEMBER,
    });
  }

  return getCurrentUser();
}

export async function loginUser(form) {
  requireSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: form.email,
    password: form.password,
  });
  raise(error);
  return getCurrentUser();
}

export async function logoutUser() {
  requireSupabase();
  const { error } = await supabase.auth.signOut();
  raise(error);
}

export async function listMyApplications() {
  requireSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  raise(userError);
  const user = userData.user;
  if (!user) throw new Error("You must sign in first.");

  const { data, error } = await supabase
    .from("membership_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  raise(error);
  return (data || []).map(withStatusLabel);
}

export async function saveApplication(application, submit = false) {
  requireSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  raise(userError);
  const user = userData.user;
  if (!user) throw new Error("You must sign in first.");

  let nextStatus = application.status || WORKFLOW_STATUSES.DRAFT;
  if (submit) {
    nextStatus = WORKFLOW_STATUSES.PENDING_COMMUNICATION;
  } else if (![WORKFLOW_STATUSES.DRAFT, WORKFLOW_STATUSES.ACTION_REQUIRED].includes(nextStatus)) {
    nextStatus = application.status;
  }

  const payload = {
    ...cleanApplication(application),
    user_id: user.id,
    status: nextStatus,
    submitted_at: submit ? new Date().toISOString() : application.submitted_at || null,
  };

  if (application.id) {
    const { data, error } = await supabase
      .from("membership_applications")
      .update(payload)
      .eq("id", application.id)
      .select()
      .single();
    raise(error);
    return withStatusLabel(data);
  }

  const { data, error } = await supabase
    .from("membership_applications")
    .insert(payload)
    .select()
    .single();
  raise(error);
  return withStatusLabel(data);
}

export async function listApplicationsForRole(role) {
  requireSupabase();
  const { data, error } = await supabase
    .from("membership_applications")
    .select("*")
    .order("created_at", { ascending: false });
  raise(error);

  const applications = (data || []).map(withStatusLabel);
  if (role === ROLES.ADMIN) return applications;

  const portal = ROLE_PORTALS[role];
  if (!portal?.queueStatus) return applications;
  return applications.filter((item) => item.status === portal.queueStatus);
}

export async function getPaymentReceiptUrl(path) {
  if (!path) return "";
  const { data, error } = await supabase.storage.from(PAYMENT_RECEIPTS_BUCKET).createSignedUrl(path, 3600);
  raise(error);
  return data.signedUrl;
}

export async function uploadPaymentReceipt(applicationId, file) {
  requireSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  raise(userError);
  const user = userData.user;
  if (!user) throw new Error("You must sign in first.");
  if (!file) throw new Error("Choose a payment receipt file to upload.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${applicationId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_RECEIPTS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
  raise(uploadError);

  const { data, error } = await supabase
    .from("membership_applications")
    .update({
      payment_receipt_path: path,
      payment_receipt_uploaded_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("user_id", user.id)
    .select()
    .single();
  raise(error);
  return withStatusLabel(data);
}

function resolveAdminPortal(application) {
  if (application.status === WORKFLOW_STATUSES.PENDING_COMMUNICATION) return ROLE_PORTALS.communication;
  if (application.status === WORKFLOW_STATUSES.PENDING_HR) return ROLE_PORTALS.hr;
  if (application.status === WORKFLOW_STATUSES.PENDING_FINANCE) return ROLE_PORTALS.finance;
  return ROLE_PORTALS.admin;
}

function buildWorkflowUpdate(role, action, fields, application) {
  const now = new Date().toISOString();
  const portal = role === ROLES.ADMIN ? resolveAdminPortal(application) : (ROLE_PORTALS[role] || ROLE_PORTALS.admin);
  const notes = fields[portal.notesField] || fields.office_comments || fields.action_required_note || "";

  if (action === "request_action") {
    return {
      status: WORKFLOW_STATUSES.ACTION_REQUIRED,
      action_required_note: fields.action_required_note || notes,
      reviewed_at: now,
    };
  }

  if (action === "reject") {
    const update = {
      status: WORKFLOW_STATUSES.REJECTED,
      reviewed_at: now,
      office_comments: fields.office_comments || application.office_comments || "",
      action_required_note: fields.action_required_note || "",
    };
    if (notes) update[portal.notesField] = notes;
    if (portal === ROLE_PORTALS.communication) update.communication_reviewed_at = now;
    if (portal === ROLE_PORTALS.hr) update.hr_reviewed_at = now;
    if (portal === ROLE_PORTALS.finance) update.finance_reviewed_at = now;
    return update;
  }

  if (action === "forward") {
    const nextStatus = role === ROLES.ADMIN
      ? resolveAdminPortal(application).forwardStatus
      : portal.forwardStatus;

    if (role === ROLES.FINANCE || (role === ROLES.ADMIN && application.status === WORKFLOW_STATUSES.PENDING_FINANCE)) {
      if (!application.payment_receipt_path) {
        throw new Error("Payment receipt must be uploaded before finance can approve.");
      }
      return {
        status: WORKFLOW_STATUSES.APPROVED,
        finance_notes: fields.finance_notes || notes,
        finance_reviewed_at: now,
        payment_verified: true,
        payment_verified_at: now,
        reviewed_at: now,
        office_registration_number: fields.office_registration_number || application.office_registration_number || "",
        office_received_by: fields.office_received_by || application.office_received_by || "",
        office_received_at: fields.office_received_at || application.office_received_at || null,
        office_comments: fields.office_comments || application.office_comments || "",
      };
    }

    if (!nextStatus) throw new Error("This application cannot be forwarded from its current stage.");

    return {
      status: nextStatus,
      [portal.notesField]: notes,
      [portal.reviewedAtField]: now,
      reviewed_at: now,
      office_comments: fields.office_comments || application.office_comments || "",
      action_required_note: fields.action_required_note || "",
      office_registration_number: fields.office_registration_number || application.office_registration_number || "",
      office_received_by: fields.office_received_by || application.office_received_by || "",
      office_received_at: fields.office_received_at || application.office_received_at || null,
    };
  }

  throw new Error("Unsupported workflow action.");
}

export async function reviewApplication(id, action, fields, role) {
  requireSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("membership_applications")
    .select("*")
    .eq("id", id)
    .single();
  raise(existingError);

  const updatePayload = buildWorkflowUpdate(role, action, fields, existing);
  const { data, error } = await supabase
    .from("membership_applications")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();
  raise(error);

  const application = withStatusLabel(data);
  const shouldEmail = action === "reject" || action === "request_action" || (action === "forward" && role === ROLES.FINANCE);
  const emailAction = action === "forward" && role === ROLES.FINANCE ? "approve" : action;

  if (shouldEmail && ["approve", "reject", "request_action"].includes(emailAction)) {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      raise(sessionError);
      const token = sessionData.session?.access_token;
      if (token) {
        const emailResponse = await fetch("/api/send-action-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ application, action: emailAction, fields }),
        });
        if (!emailResponse.ok) {
          const emailData = await emailResponse.json().catch(() => ({}));
          application.email_warning = emailData.error || "Status updated, but notification email was not sent.";
        }
      }
    } catch (emailError) {
      application.email_warning = emailError.message || "Status updated, but notification email was not sent.";
    }
  }

  return application;
}

// Backward-compatible exports
export const listAllApplications = () => listApplicationsForRole(ROLES.ADMIN);
