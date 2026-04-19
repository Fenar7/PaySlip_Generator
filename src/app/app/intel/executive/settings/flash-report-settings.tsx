"use client";

import { useState, useEffect } from "react";
import {
  getFlashReportSchedulesAction,
  upsertFlashReportScheduleAction,
  deleteFlashReportScheduleAction,
} from "../actions";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Channel = "EMAIL" | "PUSH" | "WHATSAPP";
type Frequency = "DAILY_9AM" | "WEEKLY_MONDAY" | "MONTHLY_1ST" | "CUSTOM_CRON";

interface Schedule {
  id: string;
  channel: Channel;
  schedule: Frequency;
  timezone: string;
  isActive: boolean;
  lastDeliveredAt: string | null;
  lastDeliveryStatus: string | null;
}

const CHANNEL_LABELS: Record<Channel, string> = {
  EMAIL: "Email",
  PUSH: "Push Notification",
  WHATSAPP: "WhatsApp",
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY_9AM: "Daily at 9:00 AM",
  WEEKLY_MONDAY: "Every Monday",
  MONTHLY_1ST: "1st of every month",
  CUSTOM_CRON: "Custom schedule",
};

export default function FlashReportSettings() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newChannel, setNewChannel] = useState<Channel>("EMAIL");
  const [newFrequency, setNewFrequency] = useState<Frequency>("DAILY_9AM");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await getFlashReportSchedulesAction();
      if (cancelled) return;
      if (result.success) {
        setSchedules(
          result.data.map((s) => ({
            id: s.id,
            channel: s.channel as Channel,
            schedule: s.schedule as Frequency,
            timezone: s.timezone,
            isActive: s.isActive,
            lastDeliveredAt: s.lastDeliveredAt?.toISOString() ?? null,
            lastDeliveryStatus: s.lastDeliveryStatus,
          }))
        );
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleAdd() {
    setSaving(true);
    const result = await upsertFlashReportScheduleAction({
      channel: newChannel,
      schedule: newFrequency,
      isActive: true,
    });
    if (result.success) {
      // Reload
      const reloaded = await getFlashReportSchedulesAction();
      if (reloaded.success) {
        setSchedules(
          reloaded.data.map((s) => ({
            id: s.id,
            channel: s.channel as Channel,
            schedule: s.schedule as Frequency,
            timezone: s.timezone,
            isActive: s.isActive,
            lastDeliveredAt: s.lastDeliveredAt?.toISOString() ?? null,
            lastDeliveryStatus: s.lastDeliveryStatus,
          }))
        );
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await deleteFlashReportScheduleAction(id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleToggle(s: Schedule) {
    await upsertFlashReportScheduleAction({
      channel: s.channel,
      schedule: s.schedule,
      isActive: !s.isActive,
    });
    setSchedules((prev) =>
      prev.map((item) =>
        item.id === s.id ? { ...item, isActive: !item.isActive } : item
      )
    );
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading settings…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Flash Report Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure automated KPI digest delivery
        </p>
      </div>

      {/* Existing Schedules */}
      {schedules.length > 0 && (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{CHANNEL_LABELS[s.channel]}</p>
                  <p className="text-sm text-muted-foreground">
                    {FREQUENCY_LABELS[s.schedule]} •{" "}
                    {s.isActive ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-gray-500">Paused</span>
                    )}
                  </p>
                  {s.lastDeliveredAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last sent:{" "}
                      {new Date(s.lastDeliveredAt).toLocaleDateString("en-IN")}{" "}
                      — {s.lastDeliveryStatus}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => handleToggle(s)}>
                    {s.isActive ? "Pause" : "Resume"}
                  </Button>
                  <Button variant="ghost" onClick={() => handleDelete(s.id)}>
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Schedule */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Add Delivery Channel</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value as Channel)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="EMAIL">Email</option>
              <option value="PUSH">Push Notification</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
            <select
              value={newFrequency}
              onChange={(e) => setNewFrequency(e.target.value as Frequency)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="DAILY_9AM">Daily at 9:00 AM</option>
              <option value="WEEKLY_MONDAY">Every Monday</option>
              <option value="MONTHLY_1ST">1st of every month</option>
            </select>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "Adding…" : "Add Channel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {schedules.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-4">
          No delivery channels configured. Add one above to start receiving
          automated flash reports.
        </div>
      )}
    </div>
  );
}
