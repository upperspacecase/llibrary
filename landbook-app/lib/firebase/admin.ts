import "server-only";
import { cookies } from "next/headers";
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

const SESSION_COOKIE = "__session";

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length) {
    cachedApp = existing[0]!;
    return cachedApp;
  }

  const encoded = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!encoded) {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set");
  }

  let json: string;
  if (encoded.trim().startsWith("{")) {
    json = encoded;
  } else {
    json = Buffer.from(encoded, "base64").toString("utf8");
  }

  const parsed = JSON.parse(json) as ServiceAccount & { project_id?: string };

  cachedApp = initializeApp({
    credential: cert(parsed),
  });
  return cachedApp;
}

export interface CurrentUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

function toUser(decoded: DecodedIdToken): CurrentUser {
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: (decoded.name as string | undefined) ?? null,
    picture: (decoded.picture as string | undefined) ?? null,
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return toUser(decoded);
  } catch {
    return null;
  }
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  return user;
}
