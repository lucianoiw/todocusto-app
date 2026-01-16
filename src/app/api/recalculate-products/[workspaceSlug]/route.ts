import { NextResponse } from "next/server";
import { recalculateAllProductCosts } from "@/actions/products";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  const { workspaceSlug } = await params;

  const result = await recalculateAllProductCosts(workspaceSlug);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
