"use client";

import { useState, useRef, type FormEvent } from "react";
import { uploadPaymentProof } from "@/app/invoice/[token]/actions";

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ProofUploadForm({
  token,
  invoiceTotal,
  remainingAmount,
}: {
  token: string;
  invoiceTotal: number;
  remainingAmount?: number;
}) {
  const effectiveMax = remainingAmount !== undefined && remainingAmount > 0 ? remainingAmount : invoiceTotal;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [amountEntered, setAmountEntered] = useState<number>(effectiveMax);
  const fileRef = useRef<HTMLInputElement>(null);

  const showNextDateField = amountEntered > 0 && amountEntered < effectiveMax;

  function validate(form: FormData): Record<string, string> {
    const errs: Record<string, string> = {};
    const amount = Number(form.get("amount"));
    if (!amount || amount <= 0) errs.amount = "Enter a valid amount";
    if (amount > effectiveMax) errs.amount = `Amount cannot exceed the remaining balance (${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(effectiveMax)})`;
    if (!form.get("paymentDate")) errs.paymentDate = "Select a payment date";
    if (!form.get("paymentMethod")) errs.paymentMethod = "Select a payment method";
    if (!selectedFile) errs.file = "Upload a proof file";
    if (selectedFile && selectedFile.size > MAX_FILE_SIZE) errs.file = "File must be under 5MB";
    return errs;
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const fieldErrors = validate(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    try {
      const fileUrl = await fileToBase64(selectedFile!);
      const result = await uploadPaymentProof(token, {
        amount: Number(form.get("amount")),
        paymentDate: form.get("paymentDate") as string,
        paymentMethod: form.get("paymentMethod") as string,
        note: (form.get("note") as string) || undefined,
        fileUrl,
        fileName: selectedFile!.name,
        plannedNextPaymentDate: (form.get("plannedNextPaymentDate") as string) || undefined,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setErrors({ form: result.error });
      }
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, file: "File must be under 5MB" }));
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <svg className="mx-auto h-10 w-10 text-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-green-800">Proof Uploaded Successfully</h3>
        <p className="mt-1 text-sm text-green-600">
          Your payment proof has been submitted for review. You&apos;ll be notified once it&apos;s verified.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.form && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">
            Amount Paid (₹)
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            step="0.01"
            min="0.01"
            max={effectiveMax}
            defaultValue={effectiveMax}
            onChange={(e) => setAmountEntered(Number(e.target.value))}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.amount ? "border-red-300" : "border-slate-200"
            }`}
          />
          {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
        </div>

        {/* Payment Date */}
        <div>
          <label htmlFor="paymentDate" className="block text-sm font-medium text-slate-700 mb-1">
            Payment Date
          </label>
          <input
            type="date"
            id="paymentDate"
            name="paymentDate"
            defaultValue={new Date().toISOString().split("T")[0]}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.paymentDate ? "border-red-300" : "border-slate-200"
            }`}
          />
          {errors.paymentDate && <p className="mt-1 text-xs text-red-600">{errors.paymentDate}</p>}
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <label htmlFor="paymentMethod" className="block text-sm font-medium text-slate-700 mb-1">
          Payment Method
        </label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          defaultValue="bank_transfer"
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.paymentMethod ? "border-red-300" : "border-slate-200"
          }`}
        >
          <option value="">Select method...</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {errors.paymentMethod && <p className="mt-1 text-xs text-red-600">{errors.paymentMethod}</p>}
      </div>

      {/* Next Payment Date — shown only for partial payments */}
      {showNextDateField && (
        <div>
          <label htmlFor="plannedNextPaymentDate" className="block text-sm font-medium text-slate-700 mb-1">
            Next Payment Date <span className="text-slate-400 font-normal">(when will you pay the rest?)</span>
          </label>
          <input
            type="date"
            id="plannedNextPaymentDate"
            name="plannedNextPaymentDate"
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Note */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium text-slate-700 mb-1">
          Note <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          placeholder="Transaction reference, UTR number, etc."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Proof</label>
        <div
          onClick={() => fileRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50 ${
            errors.file ? "border-red-300 bg-red-50/50" : "border-slate-200"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
              <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
              <span className="font-medium">{selectedFile.name}</span>
              <span className="text-slate-400">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-8 w-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-slate-500">Click to upload screenshot or PDF</p>
              <p className="text-xs text-slate-400 mt-1">Max 5MB • Images or PDF</p>
            </div>
          )}
        </div>
        {errors.file && <p className="mt-1 text-xs text-red-600">{errors.file}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Uploading...
          </span>
        ) : (
          "Submit Payment Proof"
        )}
      </button>
    </form>
  );
}
