export default async function handler(request, response) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.authorization || "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      response.setHeader("Allow", "GET");
      return response.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return response.status(500).json({ error: "Missing Supabase environment variables" });
    }

    const pingResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!pingResponse.ok) {
      const detail = await pingResponse.text();
      return response.status(502).json({
        error: "Supabase keepalive ping failed",
        detail,
      });
    }

    return response.status(200).json({
      ok: true,
      pinged_at: new Date().toISOString(),
      message: "Supabase project keepalive ping sent",
    });
  } catch (error) {
    return response.status(500).json({ error: error.message || "Keepalive failed" });
  }
}
