import "server-only";

interface SendSmsResult {
  success: boolean;
  error?: string;
}

/**
 * Send an SMS via MSG91 Flow API.
 * If MSG91_API_KEY is not configured, returns success=false with a descriptive error.
 * This is intentional — the dunning engine will log the skip and continue with email.
 */
export async function sendSms(params: {
  phone: string;
  message: string;
  flowId?: string;
  templateVars?: Record<string, string>;
}): Promise<SendSmsResult> {
  const apiKey = process.env.MSG91_API_KEY;
  const senderId = process.env.MSG91_SENDER_ID ?? "SLIPWS";

  if (!apiKey) {
    return { success: false, error: "sms_provider_not_configured" };
  }

  if (!params.phone) {
    return { success: false, error: "no_phone_on_file" };
  }

  // Normalize phone: ensure 91 prefix for India
  const phone = normalizeIndianPhone(params.phone);
  if (!phone) {
    return { success: false, error: "invalid_phone_number" };
  }

  try {
    if (params.flowId) {
      // MSG91 Flow API (DLT-registered templates)
      const body: Record<string, string> = {
        flow_id: params.flowId,
        sender: senderId,
        mobiles: phone,
        ...params.templateVars,
      };

      const res = await fetch("https://api.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[SMS] MSG91 Flow API error:", res.status, text);
        return { success: false, error: `msg91_error_${res.status}` };
      }

      return { success: true };
    } else {
      // Direct SMS (for non-DLT scenarios or fallback)
      const body = {
        sender: senderId,
        route: "4", // Transactional
        country: "91",
        sms: [
          {
            message: params.message,
            to: [phone.replace(/^91/, "")],
          },
        ],
      };

      const res = await fetch("https://api.msg91.com/api/v2/sendsms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[SMS] MSG91 error:", res.status, text);
        return { success: false, error: `msg91_error_${res.status}` };
      }

      return { success: true };
    }
  } catch (err) {
    console.error("[SMS] Network error:", err);
    return { success: false, error: "sms_network_error" };
  }
}

export function normalizeIndianPhone(phone: string): string | null {
  // Strip non-digits
  const digits = phone.replace(/\D/g, "");

  // Indian numbers: 10 digits, or 91 + 10 digits, or +91 + 10 digits
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(1);

  // Not a valid Indian number
  return null;
}
