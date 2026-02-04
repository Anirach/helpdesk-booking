import { NextRequest } from "next/server";
import { createSSEStream } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const role = searchParams.get("role");

  if (!userId || !role) {
    return new Response("Missing userId or role", { status: 400 });
  }

  // Create SSE stream
  const { stream } = createSSEStream(userId, role);

  // Return response with SSE headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
