const fs = require('fs');
let file = fs.readFileSync('src/app/app/docs/quotes/actions.ts', 'utf8');

const replacement = `export async function archiveQuote(quoteId: string): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const existing = await db.quote.findFirst({
      where: { id: quoteId, orgId },
    });

    if (!existing) {
      return { success: false, error: "Quote not found" };
    }

    const archived = await db.quote.update({
      where: { id: quoteId },
      data: { archivedAt: new Date() },
      include: { customer: true },
    });

    // Sync archive state to DocumentIndex
    void syncQuoteToIndex(orgId, {
      id: archived.id,
      quoteNumber: archived.quoteNumber,
      title: archived.title,
      status: archived.status,
      issueDate: archived.issueDate,
      totalAmount: archived.totalAmount,
      currency: archived.currency,
      archivedAt: archived.archivedAt,
      customer: archived.customer ?? undefined,
    });

    void emitQuoteEvent(orgId, quoteId, "updated", {
      actorId: userId,
      reason: "Archived Quote",
      metadata: { action: "archived" },
    });

    revalidatePath("/app/docs/quotes");
    revalidatePath("/app/docs/vault");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("archiveQuote error:", error);
    return { success: false, error: "Failed to archive quote" };
  }
}

export async function restoreQuote(quoteId: string): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const existing = await db.quote.findFirst({
      where: { id: quoteId, orgId },
    });

    if (!existing) {
      return { success: false, error: "Quote not found" };
    }

    const restored = await db.quote.update({
      where: { id: quoteId },
      data: { archivedAt: null },
      include: { customer: true },
    });

    void syncQuoteToIndex(orgId, {
      id: restored.id,
      quoteNumber: restored.quoteNumber,
      title: restored.title,
      status: restored.status,
      issueDate: restored.issueDate,
      totalAmount: restored.totalAmount,
      currency: restored.currency,
      archivedAt: restored.archivedAt,
      customer: restored.customer ?? undefined,
    });

    void emitQuoteEvent(orgId, quoteId, "updated", {
      actorId: userId,
      reason: "Restored Quote",
      metadata: { action: "restored" },
    });

    revalidatePath("/app/docs/quotes");
    revalidatePath("/app/docs/vault");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("restoreQuote error:", error);
    return { success: false, error: "Failed to restore quote" };
  }
}`;

file = file.replace(/<<<<<<< HEAD[\s\S]*?=======\s*\n>>>>>>> origin\/feature\/phase-19\.1/, replacement);
file = file.replace(/<<<<<<< HEAD[\s\S]*?>>>>>>> origin\/feature\/phase-19\.1/g, replacement);

fs.writeFileSync('src/app/app/docs/quotes/actions.ts', file);
