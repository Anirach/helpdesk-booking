import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const body = await request.json();
    const { startTime, endTime, reason, recurring } = body;
    const { id } = context.params;

    // Validate time range if provided
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes >= endMinutes) {
        return NextResponse.json(
          { error: "Start time must be before end time" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (reason !== undefined) updateData.reason = reason;
    if (recurring !== undefined) updateData.recurring = recurring;

    const unavailability = await prisma.staffAvailability.update({
      where: { id },
      data: updateData,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(unavailability);
  } catch (error: any) {
    console.error("Staff availability PATCH error:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Unavailability record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update unavailability" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = context.params;

    await prisma.staffAvailability.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Staff availability DELETE error:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Unavailability record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete unavailability" },
      { status: 500 }
    );
  }
}
