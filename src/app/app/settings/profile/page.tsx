"use client";
import { useState, useEffect } from "react";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { Input } from "@/components/ui/input";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardContent,
  SettingsSectionHeader,
  SettingsFormField,
  SettingsSaveBar,
} from "@/components/settings/settings-primitives";
import { getProfileSettings, saveProfileSettings } from "./actions";
import { User } from "lucide-react";

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
      <div className="slipwise-panel">
        <div className="animate-pulse h-48 bg-[var(--surface-subtle)]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <SettingsCard>
        <SettingsCardHeader>
          <div className="flex items-center gap-2.5">
            <User className="h-4 w-4 text-[var(--brand-primary)]" />
            <SettingsSectionHeader
              title="Profile"
              description="Update your personal information and display name."
            />
          </div>
        </SettingsCardHeader>
        <SettingsCardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <SettingsFormField label="Full name" htmlFor="profile-name">
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
              />
            </SettingsFormField>

            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-[var(--text-primary)]">Email</span>
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                {email}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>

            <SettingsSaveBar
              saving={saving}
              saved={success}
              error={error || undefined}
              saveLabel="Save changes"
              savedMessage="✓ Profile updated"
            />
          </form>
        </SettingsCardContent>
      </SettingsCard>
    </div>
  );
}
