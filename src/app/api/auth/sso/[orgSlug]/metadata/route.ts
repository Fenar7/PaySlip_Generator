import { NextRequest, NextResponse } from "next/server";
import { generateSpMetadata } from "@/lib/sso";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;

  const xml = generateSpMetadata(orgSlug);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
