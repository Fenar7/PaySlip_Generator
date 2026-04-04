"use client";
import { useState, useEffect } from "react";
import { useSession, authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ProfileSettingsPage() {
  const { data: session, isPending } = useSession();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user.name) setName(session.user.name);
  }, [session]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      const result = await authClient.updateUser({ name });
      if (result?.error) {
        setError(result.error.message ?? "Could not save changes. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (isPending) return <div className="animate-pulse h-32 bg-[#f5f5f5] rounded-xl" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Profile</h2>
          <p className="text-sm text-[#666]">Update your personal information</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4 max-w-md">
            <Input
              label="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Email</label>
              <p className="text-sm text-[#666] bg-[#f8f8f8] border border-[#e5e5e5] rounded-md px-3 py-2">
                {session?.user.email}
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
