import { NextResponse } from "next/server";
import { notificationManager } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data, targetUserId, targetRole } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: "type and data are required" },
        { status: 400 }
      );
    }

    // Broadcast to connected clients
    notificationManager.broadcast({
      type,
      data,
      targetUserId,
      targetRole,
    });

    return NextResponse.json({
      success: true,
      connectionCount: notificationManager.getConnectionCount(),
    });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: "Failed to publish notification" },
      { status: 500 }
    );
  }
}
