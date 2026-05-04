"use client";
import { useState, useEffect } from "react";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getProfileSettings, saveProfileSettings } from "./actions";

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
      <div className="animate-pulse h-48 rounded-2xl border border-[var(--border-strong)] bg-[#f8f8f8]" />
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="overflow-hidden">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Profile</h2>
          <p className="text-sm text-[#666]">Update your personal information</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5 max-w-2xl">
            <Input
              id="profile-name"
              label="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Email</label>
              <p className="text-sm text-[#666] bg-[#f8f8f8] border border-[#e5e5e5] rounded-md px-3 py-2">
                {email}
              </p>
              <p className="text-xs text-[#999] mt-1">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>
            {success && <p className="text-sm text-green-600">✓ Profile updated</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
