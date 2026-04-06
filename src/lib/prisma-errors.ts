import { Prisma } from "@/generated/prisma/client";

export function isModelMissingTableError(error: unknown, modelName: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021" &&
    error.meta?.modelName === modelName
  );
}

export function getSchemaDriftActionMessage(entityLabel: string) {
  return `Failed to ${entityLabel}. The database schema is not up to date. Run the Prisma migrations and try again.`;
}
