import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get("staffId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const view = searchParams.get("view") || "staff";

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Build appointments query
    const appointmentWhere: any = {
      date: {
        gte: start,
        lte: end,
      },
      status: {
        not: "CANCELLED",
      },
    };

    // Filter by staff if provided
    if (staffId) {
      appointmentWhere.staffId = staffId;
    }

    // Fetch appointments with relations
    const appointments = await prisma.appointment.findMany({
      where: appointmentWhere,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            nameTh: true,
            duration: true,
          },
        },
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Build unavailability query
    const unavailabilityWhere: any = {
      date: {
        gte: start,
        lte: end,
      },
    };

    // Filter by staff if provided
    if (staffId) {
      unavailabilityWhere.staffId = staffId;
    }

    // Fetch staff unavailability
    const unavailability = await prisma.staffAvailability.findMany({
      where: unavailabilityWhere,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json({
      appointments,
      unavailability,
      view,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}
