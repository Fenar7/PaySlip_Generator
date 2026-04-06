import QRCode from "qrcode";

export function generateUpiDeeplink(params: {
  vpa: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
}): string {
  return `upi://pay?pa=${params.vpa}&pn=${encodeURIComponent(params.payeeName)}&am=${params.amount}&tn=${encodeURIComponent(params.transactionNote)}&cu=INR`;
}

export async function generateUpiQrCode(deeplink: string): Promise<string> {
  return QRCode.toDataURL(deeplink, { width: 150, margin: 1 });
}
