"use server";

import { db } from "@/lib/db";
import { acceptQuote, declineQuote } from "@/lib/quotes";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getPublicQuote(token: string) {
  try {
    const quote = await db.quote.findUnique({
      where: { publicToken: token },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        customer: true,
        org: true,
      },
    });

    if (!quote) {
      return { success: false as const, error: "Quote not found or link is invalid" };
    }

    return {
      success: true as const,
      data: {
        quote: {
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          title: quote.title,
          status: quote.status,
          issueDate: quote.issueDate.toISOString(),
          validUntil: quote.validUntil.toISOString(),
          subtotal: quote.subtotal,
          taxAmount: quote.taxAmount,
          discountAmount: quote.discountAmount,
          totalAmount: quote.totalAmount,
          currency: quote.currency,
          notes: quote.notes,
          termsAndConditions: quote.termsAndConditions,
          acceptedAt: quote.acceptedAt?.toISOString() ?? null,
          declinedAt: quote.declinedAt?.toISOString() ?? null,
          declineReason: quote.declineReason,
          lineItems: quote.lineItems.map((li) => ({
            id: li.id,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            taxRate: li.taxRate,
            amount: li.amount,
          })),
          customer: {
            name: quote.customer.name,
            email: quote.customer.email,
            phone: quote.customer.phone,
          },
          organization: {
            name: quote.org.name,
          },
        },
      },
    };
  } catch (error) {
    console.error("getPublicQuote error:", error);
    return { success: false as const, error: "Failed to load quote" };
  }
}

export async function acceptPublicQuote(token: string): Promise<ActionResult<void>> {
  try {
    const quote = await db.quote.findUnique({
      where: { publicToken: token },
    });

    if (!quote) {
      return { success: false, error: "Quote not found" };
    }

    await acceptQuote(quote.id, token);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("acceptPublicQuote error:", error);
    const message = error instanceof Error ? error.message : "Failed to accept quote";
    return { success: false, error: message };
  }
}

export async function declinePublicQuote(
  token: string,
  reason?: string
): Promise<ActionResult<void>> {
  try {
    const quote = await db.quote.findUnique({
      where: { publicToken: token },
    });

    if (!quote) {
      return { success: false, error: "Quote not found" };
    }

    await declineQuote(quote.id, token, reason);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("declinePublicQuote error:", error);
    const message = error instanceof Error ? error.message : "Failed to decline quote";
    return { success: false, error: message };
  }
}
