import { OAuth2Client } from "google-auth-library";

const OC_EMAIL_SUFFIX = "@eagles.oc.edu";

function readClientId() {
  const raw = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

function profileNames(payload) {
  const fName = payload.given_name || payload.name?.split(" ")[0] || "";
  const lName = payload.family_name || payload.name?.split(" ").slice(1).join(" ") || "";
  return { fName, lName };
}

export async function verifyGoogleCredential(credential) {
  if (!credential || typeof credential !== "string") {
    return { ok: false, message: "Google sign-in failed" };
  }

  const clientId = readClientId();
  if (!clientId) {
    return { ok: false, message: "Google sign-in failed" };
  }

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();
    const sub = payload?.sub;

    if (!payload || !sub || !email) {
      return { ok: false, message: "Google sign-in failed" };
    }

    if (!email.endsWith(OC_EMAIL_SUFFIX)) {
      return { ok: false, message: "Only an OC Google account can sign in." };
    }

    const { fName, lName } = profileNames(payload);
    if (!fName || !lName) {
      return { ok: false, message: "Google sign-in failed" };
    }

    return {
      ok: true,
      profile: { sub, email, fName, lName },
    };
  } catch {
    return { ok: false, message: "Google sign-in failed" };
  }
}
