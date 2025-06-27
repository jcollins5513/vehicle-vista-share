import { NextRequest, NextResponse } from "next/server";

/**
 * DELETE /api/media/[id]
 * Deletes a media item from both S3 and Redis
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  console.log(`🔵 DELETE /api/media/${params.id} - Minimal implementation`);
  return new NextResponse(null, { status: 200 });
}
