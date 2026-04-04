import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, emailOTP } from "better-auth/plugins";
import { db } from "@/lib/db";
import {
  sendEmail,
  verifyEmailHtml,
  resetPasswordEmailHtml,
  otpEmailHtml,
} from "@/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),

  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "dev-secret-change-me-in-production-must-be-32chars",

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: { email: string; name: string };
      url: string;
    }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Slipwise password",
        html: resetPasswordEmailHtml({ url, name: user.name }),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string; name: string };
      url: string;
    }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your Slipwise account",
        html: verifyEmailHtml({ url, name: user.name }),
      });
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
    emailOTP({
      async sendVerificationOTP({
        email,
        otp,
      }: {
        email: string;
        otp: string;
      }) {
        await sendEmail({
          to: email,
          subject: "Your Slipwise verification code",
          html: otpEmailHtml({ otp }),
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
