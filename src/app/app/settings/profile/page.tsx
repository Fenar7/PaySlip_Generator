"use client";
import { useState, useEffect } from "react";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { Input } from "@/components/ui/input";
import {
  SettingsSectionHeader,
  SettingsFormField,
  SettingsReadOnlyField,
  SettingsSaveBar,
} from "@/components/settings/settings-primitives";
import { getProfileSettings, saveProfileSettings } from "./actions";
import Link from "next/link";
import { KeyRound, Mail, Shield, Sparkles, User } from "lucide-react";

export default function ProfileSettingsPage() {
  const { isPending } = useSupabaseSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const data = await getProfileSettings();
        if (cancelled) return;
        setName(data.name);
        setEmail(data.email);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load your profile."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      await saveProfileSettings({ name });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save changes. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (isPending || loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-[24px] bg-[var(--surface-subtle)]" />
        <div className="h-64 animate-pulse rounded-[24px] bg-[var(--surface-subtle)]" />
        <div className="h-48 animate-pulse rounded-[24px] bg-[var(--surface-subtle)]" />
      </div>
    );
  }

  const relatedLinks = [
    {
      label: "Security",
      description: "Password, MFA, passkeys, and session controls.",
      href: "/app/settings/security",
      icon: Shield,
    },
    {
      label: "SSO / SAML",
      description: "Configure sign-in providers and enterprise authentication.",
      href: "/app/settings/security/sso",
      icon: KeyRound,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--brand-primary)]">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <SettingsSectionHeader
              title="My profile"
              description="Keep your display name and personal account identity up to date across Slipwise workspaces."
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {relatedLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-subtle)]/40 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-white text-[var(--brand-primary)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">How this appears across Slipwise</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Your display name appears on approvals, record ownership, comments, notes, and internal workspace history. Keep it accurate so teammates can recognize you instantly.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSave} className="space-y-8">
        <section className="space-y-5">
          <SettingsSectionHeader
            title="Personal details"
            description="Update the name people see in account surfaces and collaborative workflows."
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <SettingsFormField label="Full name" htmlFor="profile-name">
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
              />
            </SettingsFormField>

            <SettingsReadOnlyField
              label="Primary email"
              value={email}
              hint="Email cannot be changed here. Contact support if needed."
            />
          </div>
        </section>

        <section className="border-t border-[var(--border-soft)] pt-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <SettingsSectionHeader
                title="Account identity"
                description="Reference details tied to your authenticated account and workspace access."
              />

              <div className="grid gap-5 lg:grid-cols-2">
                <SettingsReadOnlyField
                  label="Sign-in email"
                  value={email}
                  hint="This is your authenticated account address."
                />
                <SettingsReadOnlyField
                  label="Workspace display name"
                  value={name}
                  hint="Used anywhere your identity is shown inside Slipwise."
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-subtle)]/60 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-white text-[var(--brand-primary)]">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Need more control?
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    Use <span className="font-medium text-[var(--text-primary)]">Security</span> for password, MFA, and passkeys, or <span className="font-medium text-[var(--text-primary)]">Organization</span> for workspace-wide identity settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <SettingsSaveBar
          saving={saving}
          saved={success}
          error={error || undefined}
          saveLabel="Save changes"
          savedMessage="✓ Profile updated"
        />
      </form>
    </div>
  );
}
