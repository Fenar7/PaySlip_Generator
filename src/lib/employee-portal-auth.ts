import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

const COOKIE_NAME = "employee_portal_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

interface EmployeeJwtPayload {
  employeeId: string;
  orgId: string;
  orgSlug: string;
  iat: number;
  exp: number;
}

function getSecret(): string {
  const secret =
    process.env.EMPLOYEE_PORTAL_JWT_SECRET ?? process.env.PORTAL_JWT_SECRET;
  if (!secret) throw new Error("EMPLOYEE_PORTAL_JWT_SECRET is not configured");
  return secret;
}

function base64url(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64url");
}

function signToken(payload: Omit<EmployeeJwtPayload, "iat" | "exp">): string {
  const now = Math.floor(Date.now() / 1000);
  const full: EmployeeJwtPayload = { ...payload, iat: now, exp: now + SESSION_TTL_SECONDS };
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(full));
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyToken(token: string): EmployeeJwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", getSecret())
      .update(`${header}.${body}`)
      .digest("base64url");
    if (
      signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as EmployeeJwtPayload;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface EmployeeSession {
  employeeId: string;
  orgId: string;
  orgSlug: string;
}

export async function getEmployeeSession(): Promise<EmployeeSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return {
    employeeId: payload.employeeId,
    orgId: payload.orgId,
    orgSlug: payload.orgSlug,
  };
}

export async function requireEmployeeSession(
  orgSlug: string
): Promise<EmployeeSession> {
  const session = await getEmployeeSession();
  if (!session || session.orgSlug !== orgSlug) {
    redirect(`/portal/${orgSlug}/payslips/login`);
  }
  return session;
}

export async function createOtpForEmployee(
  orgId: string,
  email: string
): Promise<{ success: true } | { success: false; error: string }> {
  const employee = await db.employee.findFirst({
    where: { organizationId: orgId, email },
    select: { id: true, email: true },
  });
  if (!employee || !employee.email) {
    // Return success even if not found to avoid email enumeration
    return { success: true };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.employeeOtp.upsert({
    where: { email_orgId: { email: employee.email, orgId } },
    create: {
      email: employee.email,
      orgId,
      otpHash,
      expiresAt,
    },
    update: {
      otpHash,
      expiresAt,
      usedAt: null,
    },
  });

  // In production, send email via Resend. For now, log to console (dev mode).
  console.log(`[EmployeePortal] OTP for ${email}: ${otp}`);

  return { success: true };
}

export async function verifyOtpAndIssueSession(
  orgSlug: string,
  email: string,
  otp: string
): Promise<{ success: true } | { success: false; error: string }> {
  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org) return { success: false, error: "Organization not found" };

  const employee = await db.employee.findFirst({
    where: { organizationId: org.id, email },
    select: { id: true, email: true },
  });
  if (!employee || !employee.email) {
    return { success: false, error: "Invalid credentials" };
  }

  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  const tokenRecord = await db.employeeOtp.findUnique({
    where: { email_orgId: { email: employee.email, orgId: org.id } },
  });

  if (
    !tokenRecord ||
    tokenRecord.otpHash !== otpHash ||
    tokenRecord.expiresAt < new Date() ||
    tokenRecord.usedAt !== null
  ) {
    return { success: false, error: "Invalid or expired OTP" };
  }

  await db.employeeOtp.update({
    where: { email_orgId: { email: employee.email, orgId: org.id } },
    data: { usedAt: new Date() },
  });

  const token = signToken({
    employeeId: employee.id,
    orgId: org.id,
    orgSlug,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: `/portal/${orgSlug}/payslips`,
  });

  return { success: true };
}

export async function clearEmployeeSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
