import nodemailer from "nodemailer";

const statusContent = {
  approve: {
    subject: "TMA Family registration approved",
    heading: "Your registration has been approved",
    intro: "Your TMA Family membership registration has been approved by the office.",
  },
  reject: {
    subject: "TMA Family registration update",
    heading: "Your registration was not approved",
    intro: "Your TMA Family membership registration has been reviewed and was not approved at this time.",
  },
  request_action: {
    subject: "Action required for your TMA Family registration",
    heading: "Action required",
    intro: "The office reviewed your TMA Family registration and needs additional action from you.",
  },
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function getCurrentUser(token) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error("Invalid Supabase session");
  }

  const user = await userResponse.json();
  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=is_admin&id=eq.${encodeURIComponent(user.id)}`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!profileResponse.ok) {
    throw new Error("Unable to verify admin profile");
  }

  const profiles = await profileResponse.json();
  if (!profiles[0]?.is_admin) {
    throw new Error("Admin access is required");
  }

  return user;
}

function emailHtml({ application, action, fields }) {
  const content = statusContent[action];
  const comments = fields.office_comments || fields.action_required_note || "";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17202a">
      <h2 style="color:#1f6bb8">${content.heading}</h2>
      <p>Hello ${application.full_name || "member"},</p>
      <p>${content.intro}</p>
      ${comments ? `<p><strong>Office note:</strong><br>${comments.replace(/\n/g, "<br>")}</p>` : ""}
      ${
        application.office_registration_number
          ? `<p><strong>Registration number:</strong> ${application.office_registration_number}</p>`
          : ""
      }
      <p>You can sign in to the TMA Family portal to view your current registration status.</p>
      <p style="margin-top:24px">TMA GLOBAL</p>
    </div>
  `;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return response.status(401).json({ error: "Missing authorization token" });

    await getCurrentUser(token);

    const body = await readJson(request);
    const { application, action, fields = {} } = body;
    const content = statusContent[action];

    if (!content) return response.status(400).json({ error: "Unsupported action" });
    if (!application?.email) return response.status(400).json({ error: "Application email is required" });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_PORT || "465") === "465",
      auth: {
        user: requiredEnv("SMTP_USER"),
        pass: requiredEnv("SMTP_PASSWORD"),
      },
    });

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "TMA GLOBAL"}" <${requiredEnv("SMTP_FROM_EMAIL")}>`,
      to: application.email,
      subject: content.subject,
      html: emailHtml({ application, action, fields }),
    });

    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(500).json({ error: error.message || "Unable to send email" });
  }
}
