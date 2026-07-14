import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_CID = "tma-association-logo";
const LOGO_PATH = join(__dirname, "assets", "tma-association-logo.jpeg");

const statusContent = {
  approve: {
    subject: "TMA Family registration approved",
    heading: "Your registration has been approved",
    intro: "Your TMA Family membership registration has been approved by the office.",
    badge: "Approved",
    accent: "#1f8a5b",
    accentSoft: "#e8f7ef",
  },
  reject: {
    subject: "TMA Family registration update",
    heading: "Your registration was not approved",
    intro: "Your TMA Family membership registration has been reviewed and was not approved at this time.",
    badge: "Not approved",
    accent: "#d32f2f",
    accentSoft: "#fdeaea",
  },
  request_action: {
    subject: "Action required for your TMA Family registration",
    heading: "Action required",
    intro: "The office reviewed your TMA Family registration and needs additional action from you.",
    badge: "Action required",
    accent: "#c9920a",
    accentSoft: "#fff6db",
  },
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function portalUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "";
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
  const name = escapeHtml(application.full_name || "member");
  const registrationNumber = escapeHtml(application.office_registration_number || "");
  const noteHtml = escapeHtml(comments).replace(/\n/g, "<br>");
  const siteUrl = portalUrl();
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(content.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#e8f1f9;font-family:Inter,Arial,Helvetica,sans-serif;color:#152535;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e8f1f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #c9d7e6;box-shadow:0 8px 30px rgba(24,96,168,0.12);">
            <tr>
              <td style="background:linear-gradient(135deg,#1860a8 0%,#2f8fd6 52%,#f0c12b 100%);padding:28px 28px 24px;text-align:center;">
                <img
                  src="cid:${LOGO_CID}"
                  alt="TMA Association"
                  width="84"
                  height="84"
                  style="display:block;margin:0 auto 14px;width:84px;height:84px;border-radius:999px;border:3px solid rgba(255,255,255,0.85);object-fit:contain;background:#ffffff;"
                />
                <p style="margin:0 0 4px;color:#ffe58a;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">
                  Tanzania Mentors Association
                </p>
                <h1 style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;font-weight:700;">
                  TMA Family
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <span style="display:inline-block;margin:0 0 16px;padding:6px 12px;border-radius:999px;background:${content.accentSoft};color:${content.accent};font-size:12px;font-weight:700;letter-spacing:0.02em;">
                  ${escapeHtml(content.badge)}
                </span>
                <h2 style="margin:0 0 12px;color:#1860a8;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;">
                  ${escapeHtml(content.heading)}
                </h2>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#152535;">
                  Hello ${name},
                </p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#3d4f63;">
                  ${escapeHtml(content.intro)}
                </p>
                ${
                  comments
                    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
                        <tr>
                          <td style="background:#f4f8fc;border-left:4px solid #1860a8;border-radius:0 8px 8px 0;padding:14px 16px;">
                            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1860a8;text-transform:uppercase;letter-spacing:0.04em;">Office note</p>
                            <p style="margin:0;font-size:14px;line-height:1.65;color:#152535;">${noteHtml}</p>
                          </td>
                        </tr>
                      </table>`
                    : ""
                }
                ${
                  registrationNumber
                    ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#152535;">
                        <strong style="color:#1860a8;">Registration number:</strong> ${registrationNumber}
                      </p>`
                    : ""
                }
                <p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#3d4f63;">
                  Sign in to the TMA Family portal to view your current registration status.
                </p>
                ${
                  siteUrl
                    ? `<a href="${siteUrl}" style="display:inline-block;background:#1860a8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 20px;border-radius:8px;">
                        Open TMA Family portal
                      </a>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px;border-top:1px solid #d7e3ef;background:#f7fbff;text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1860a8;">TMA GLOBAL</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6a7c90;">
                  TMA Family membership services<br />
                  &copy; ${year} Tanzania Mentors Association
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function emailText({ application, action, fields }) {
  const content = statusContent[action];
  const comments = fields.office_comments || fields.action_required_note || "";
  const siteUrl = portalUrl();
  const lines = [
    content.heading,
    "",
    `Hello ${application.full_name || "member"},`,
    content.intro,
  ];

  if (comments) {
    lines.push("", `Office note: ${comments}`);
  }
  if (application.office_registration_number) {
    lines.push("", `Registration number: ${application.office_registration_number}`);
  }
  lines.push("", "Sign in to the TMA Family portal to view your current registration status.");
  if (siteUrl) lines.push(siteUrl);
  lines.push("", "TMA GLOBAL");
  return lines.join("\n");
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
      text: emailText({ application, action, fields }),
      html: emailHtml({ application, action, fields }),
      attachments: [
        {
          filename: "tma-association-logo.jpeg",
          content: readFileSync(LOGO_PATH),
          cid: LOGO_CID,
          contentType: "image/jpeg",
          contentDisposition: "inline",
        },
      ],
    });

    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(500).json({ error: error.message || "Unable to send email" });
  }
}
