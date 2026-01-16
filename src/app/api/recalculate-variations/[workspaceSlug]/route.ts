import { NextResponse } from "next/server";
import { recalculateAllVariations } from "@/actions/ingredients";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  const { workspaceSlug } = await params;

  const result = await recalculateAllVariations(workspaceSlug);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
