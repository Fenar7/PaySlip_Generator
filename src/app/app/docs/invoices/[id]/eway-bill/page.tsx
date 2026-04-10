"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  generateEwayBill,
  getEwayBillStatus,
} from "../../eway-bill/actions";

// ─── e-Way Bill Page ──────────────────────────────────────────────────────────

const TRANSPORT_MODES = [
  { value: "Road", label: "Road" },
  { value: "Rail", label: "Rail" },
  { value: "Air", label: "Air" },
  { value: "Ship", label: "Ship" },
];

export default function EwayBillPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;

  const [ewbData, setEwbData] = useState<{
    eWayBillNumber: string | null;
    eWayBillDate: string | null;
    eWayBillExpiry: string | null;
    transportMode: string | null;
    vehicleNumber: string | null;
    transporterGstin: string | null;
    transportDocNo: string | null;
    distanceKm: number | null;
    fromPincode: string | null;
    toPincode: string | null;
    expired: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [transportMode, setTransportMode] = useState("Road");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [transporterGstin, setTransporterGstin] = useState("");
  const [transportDocNo, setTransportDocNo] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [fromPincode, setFromPincode] = useState("");
  const [toPincode, setToPincode] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const result = await getEwayBillStatus(invoiceId);
    if (result.success) {
      setEwbData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setSuccessMessage(null);

    const km = parseInt(distanceKm, 10);
    if (isNaN(km) || km <= 0) {
      setError("Please enter a valid distance in kilometers");
      setGenerating(false);
      return;
    }

    if (!fromPincode.match(/^[1-9]\d{5}$/)) {
      setError("Please enter a valid 6-digit From pincode");
      setGenerating(false);
      return;
    }

    if (!toPincode.match(/^[1-9]\d{5}$/)) {
      setError("Please enter a valid 6-digit To pincode");
      setGenerating(false);
      return;
    }

    const result = await generateEwayBill({
      invoiceId,
      transportMode,
      vehicleNumber: vehicleNumber || undefined,
      transporterGstin: transporterGstin || undefined,
      transportDocNo: transportDocNo || undefined,
      distanceKm: km,
      fromPincode,
      toPincode,
    });

    if (result.success) {
      setEwbData({
        eWayBillNumber: result.data.eWayBillNumber,
        eWayBillDate: result.data.eWayBillDate,
        eWayBillExpiry: result.data.eWayBillExpiry,
        transportMode: result.data.transportMode,
        vehicleNumber: result.data.vehicleNumber,
        transporterGstin: transporterGstin || null,
        transportDocNo: transportDocNo || null,
        distanceKm: km,
        fromPincode,
        toPincode,
        expired: false,
      });
      setSuccessMessage("e-Way Bill generated successfully");
    } else {
      setError(result.error);
    }

    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const hasEwb = ewbData?.eWayBillNumber;

  // Check expiry warning (within 12 hours)
  const expiryWarning =
    ewbData?.eWayBillExpiry && !ewbData.expired
      ? new Date(ewbData.eWayBillExpiry).getTime() - Date.now() < 12 * 60 * 60 * 1000
      : false;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">e-Way Bill</h1>
        <a
          href={`/app/docs/invoices/${invoiceId}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Invoice
        </a>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-red-600">⚠</span>
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">✓ {successMessage}</p>
        </div>
      )}

      {hasEwb ? (
        /* e-Way Bill Status Card */
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                e-Way Bill Details
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  ewbData.expired
                    ? "bg-red-100 text-red-800"
                    : expiryWarning
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                }`}
              >
                {ewbData.expired
                  ? "Expired"
                  : expiryWarning
                    ? "Expiring Soon"
                    : "Active"}
              </span>
            </div>
          </div>
          <div className="p-6">
            {/* Expiry warning banner */}
            {ewbData.expired && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800">
                  This e-Way Bill has expired. You may need to generate a new one.
                </p>
              </div>
            )}
            {expiryWarning && !ewbData.expired && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-sm font-medium text-yellow-800">
                  This e-Way Bill expires within 12 hours.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  e-Way Bill Number
                </p>
                <p className="mt-1 font-mono text-sm text-gray-900">
                  {ewbData.eWayBillNumber}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Generated On
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {ewbData.eWayBillDate
                    ? new Date(ewbData.eWayBillDate).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Valid Until
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {ewbData.eWayBillExpiry
                    ? new Date(ewbData.eWayBillExpiry).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Transport Mode
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {ewbData.transportMode ?? "—"}
                </p>
              </div>
              {ewbData.vehicleNumber && (
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Vehicle Number
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {ewbData.vehicleNumber}
                  </p>
                </div>
              )}
              {ewbData.transporterGstin && (
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Transporter GSTIN
                  </p>
                  <p className="mt-1 font-mono text-sm text-gray-900">
                    {ewbData.transporterGstin}
                  </p>
                </div>
              )}
              {ewbData.distanceKm && (
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Distance
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {ewbData.distanceKm} km
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Route
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {ewbData.fromPincode ?? "—"} → {ewbData.toPincode ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Generate e-Way Bill Form */
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Generate e-Way Bill
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Required for movement of goods valued above ₹50,000
            </p>
          </div>
          <form onSubmit={handleGenerate} className="space-y-4 p-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Transport Mode *
              </label>
              <select
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {TRANSPORT_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. KA01AB1234"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Transporter GSTIN
                </label>
                <input
                  type="text"
                  value={transporterGstin}
                  onChange={(e) => setTransporterGstin(e.target.value.toUpperCase())}
                  placeholder="15-digit GSTIN"
                  maxLength={15}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Transport Document No.
                </label>
                <input
                  type="text"
                  value={transportDocNo}
                  onChange={(e) => setTransportDocNo(e.target.value)}
                  placeholder="GR/RR/LR number"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Distance (km) *
                </label>
                <input
                  type="number"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="e.g. 250"
                  min="1"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  From Pincode *
                </label>
                <input
                  type="text"
                  value={fromPincode}
                  onChange={(e) => setFromPincode(e.target.value)}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  To Pincode *
                </label>
                <input
                  type="text"
                  value={toPincode}
                  onChange={(e) => setToPincode(e.target.value)}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={generating}
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate e-Way Bill"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
