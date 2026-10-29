import { OAuth2Client } from "google-auth-library";
import logger from "../config/logger.js";

const OC_EMAIL_SUFFIX = "@eagles.oc.edu";

function readClientId() {
  const raw = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

function decodeJwtPart(part) {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function emailDomain(email) {
  if (typeof email !== "string" || !email.includes("@")) {
    return null;
  }
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

function clientIdDiagnostics(clientId) {
  const googleRaw = process.env.GOOGLE_CLIENT_ID || "";
  const clientRaw = process.env.CLIENT_ID || "";
  return {
    configured: Boolean(clientId),
    source: process.env.GOOGLE_CLIENT_ID ? "GOOGLE_CLIENT_ID" : process.env.CLIENT_ID ? "CLIENT_ID" : "none",
    length: clientId.length,
    suffix: clientId ? clientId.slice(-32) : null,
    looksLikeGoogleClientId: clientId.endsWith(".apps.googleusercontent.com"),
    googleClientIdEnvLength: googleRaw.length,
    clientIdEnvLength: clientRaw.length,
    googleClientIdHadWrappingQuotes: /^["'].*["']$/.test(googleRaw.trim()),
    clientIdHadWrappingQuotes: /^["'].*["']$/.test(clientRaw.trim()),
  };
}

function credentialDiagnostics(credential) {
  if (typeof credential !== "string") {
    return {
      present: credential != null && credential !== "",
      type: credential === null ? "null" : typeof credential,
      value: credential ?? null,
    };
  }

  const parts = credential.split(".");
  const header = parts.length >= 2 ? decodeJwtPart(parts[0]) : null;
  const payload = parts.length >= 2 ? decodeJwtPart(parts[1]) : null;
  const now = Math.floor(Date.now() / 1000);
  const aud = payload?.aud ?? null;
  const clientId = readClientId();

  return {
    present: credential.length > 0,
    type: "string",
    length: credential.length,
    value: credential,
    segments: parts.length,
    headerAlg: header?.alg ?? null,
    headerKid: header?.kid ?? null,
    iss: payload?.iss ?? null,
    aud,
    azp: payload?.azp ?? null,
    hd: payload?.hd ?? null,
    emailPresent: Boolean(payload?.email),
    emailDomain: emailDomain(payload?.email),
    emailVerified: payload?.email_verified ?? null,
    subPresent: Boolean(payload?.sub),
    givenNamePresent: Boolean(payload?.given_name),
    familyNamePresent: Boolean(payload?.family_name),
    namePresent: Boolean(payload?.name),
    exp: payload?.exp ?? null,
    iat: payload?.iat ?? null,
    nbf: payload?.nbf ?? null,
    expired: typeof payload?.exp === "number" ? payload.exp <= now : null,
    secondsFromExpiry: typeof payload?.exp === "number" ? payload.exp - now : null,
    audienceMatchesConfiguredClient:
      clientId && aud != null
        ? Array.isArray(aud)
          ? aud.includes(clientId)
          : aud === clientId
        : null,
    payloadParseable: Boolean(payload),
  };
}

function logGoogleSignInFailure(reason, extra = {}) {
  logger.error(
    `Google sign-in failed (${reason}): ${JSON.stringify({
      reason,
      clientId: clientIdDiagnostics(readClientId()),
      credential: credentialDiagnostics(extra.credential),
      ...extra.details,
    })}`
  );
}

function profileNames(payload) {
  const fName = payload.given_name || payload.name?.split(" ")[0] || "";
  const lName = payload.family_name || payload.name?.split(" ").slice(1).join(" ") || "";
  return { fName, lName };
}

export async function verifyGoogleCredential(credential) {
  if (!credential || typeof credential !== "string") {
    logGoogleSignInFailure("missing-or-invalid-credential", { credential });
    return { ok: false, message: "Google sign-in failed" };
  }

  const clientId = readClientId();
  if (!clientId) {
    logGoogleSignInFailure("missing-client-id", {
      credential,
      details: {
        hint: "Set CLIENT_ID or GOOGLE_CLIENT_ID to the same Google OAuth client id baked into the frontend.",
      },
    });
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
      logGoogleSignInFailure("incomplete-token-profile", {
        credential,
        details: {
          hasPayload: Boolean(payload),
          hasSub: Boolean(sub),
          hasEmail: Boolean(email),
          iss: payload?.iss ?? null,
          aud: payload?.aud ?? null,
          hd: payload?.hd ?? null,
          emailVerified: payload?.email_verified ?? null,
        },
      });
      return { ok: false, message: "Google sign-in failed" };
    }

    if (!email.endsWith(OC_EMAIL_SUFFIX)) {
      logGoogleSignInFailure("non-oc-email", {
        credential,
        details: {
          emailDomain: emailDomain(email),
          requiredSuffix: OC_EMAIL_SUFFIX,
          hd: payload.hd ?? null,
          emailVerified: payload.email_verified ?? null,
        },
      });
      return { ok: false, message: "Only an OC Google account can sign in." };
    }

    const { fName, lName } = profileNames(payload);
    if (!fName || !lName) {
      logGoogleSignInFailure("missing-profile-name", {
        credential,
        details: {
          emailDomain: emailDomain(email),
          givenNamePresent: Boolean(payload.given_name),
          familyNamePresent: Boolean(payload.family_name),
          namePresent: Boolean(payload.name),
          derivedFirstNamePresent: Boolean(fName),
          derivedLastNamePresent: Boolean(lName),
        },
      });
      return { ok: false, message: "Google sign-in failed" };
    }

    return {
      ok: true,
      profile: { sub, email, fName, lName },
    };
  } catch (error) {
    logGoogleSignInFailure("token-verification-threw", {
      credential,
      details: {
        errorName: error?.name ?? null,
        errorMessage: error?.message ?? String(error),
        errorCode: error?.code ?? null,
        stack: typeof error?.stack === "string" ? error.stack.split("\n").slice(0, 8).join(" | ") : null,
      },
    });
    return { ok: false, message: "Google sign-in failed" };
  }
}
