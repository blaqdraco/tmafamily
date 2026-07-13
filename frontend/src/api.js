import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://example.supabase.co",
  supabaseAnonKey || "missing-anon-key",
);

const statusLabels = {
  draft: "Draft",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  action_required: "Action required",
};

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
}

function raise(error) {
  if (error) throw new Error(error.message || "Request failed");
}

function withStatusLabel(application) {
  if (!application) return application;
  return {
    ...application,
    status_label: statusLabels[application.status] || application.status,
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
    "spouse_name",
    "spouse_phone",
    "member_group",
    "parents",
    "children",
    "emergency_name",
    "emergency_relationship",
    "emergency_phone",
    "emergency_address",
    "wedding_sendoff_beneficiary",
    "declaration_accepted",
  ].forEach((field) => {
    payload[field] = application[field];
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
    .select("id, first_name, last_name, username, is_admin")
    .eq("id", authUser.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") raise(profileError);

  return {
    id: authUser.id,
    email: authUser.email,
    username: profile?.username || authUser.email,
    first_name: profile?.first_name || authUser.user_metadata?.first_name || "",
    last_name: profile?.last_name || authUser.user_metadata?.last_name || "",
    is_staff: Boolean(profile?.is_admin),
  };
}

export async function registerUser(form) {
  requireSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: form.email,
    password: form.password,
    options: {
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

  const payload = {
    ...cleanApplication(application),
    user_id: user.id,
    status: submit ? "pending" : application.status === "pending" ? "pending" : "draft",
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

export async function listAllApplications() {
  requireSupabase();
  const { data, error } = await supabase
    .from("membership_applications")
    .select("*")
    .order("created_at", { ascending: false });
  raise(error);
  return (data || []).map(withStatusLabel);
}

export async function reviewApplication(id, action, fields) {
  requireSupabase();
  const statuses = {
    approve: "approved",
    reject: "rejected",
    request_action: "action_required",
    mark_pending: "pending",
  };

  const { data, error } = await supabase
    .from("membership_applications")
    .update({
      status: statuses[action],
      reviewed_at: new Date().toISOString(),
      office_registration_number: fields.office_registration_number || "",
      office_received_by: fields.office_received_by || "",
      office_received_at: fields.office_received_at || null,
      office_comments: fields.office_comments || "",
      action_required_note: fields.action_required_note || "",
    })
    .eq("id", id)
    .select()
    .single();
  raise(error);
  return withStatusLabel(data);
}
