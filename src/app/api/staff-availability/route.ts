import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get("staffId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: any = {};

    if (staffId) {
      where.staffId = staffId;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const availability = await prisma.staffAvailability.findMany({
      where,
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

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Staff availability GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { staffId, date, startTime, endTime, reason, recurring, forceCreate } = body;

    // Validate required fields
    if (!staffId || !date || !startTime || !endTime || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate time range
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

    // Check for conflicting appointments (unless force create)
    if (!forceCreate) {
      const dateObj = new Date(date);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);

      const conflictingAppointments = await prisma.appointment.findMany({
        where: {
          staffId,
          date: {
            gte: dateObj,
            lt: nextDay,
          },
          status: {
            not: "CANCELLED",
          },
        },
        include: {
          service: true,
        },
      });

      // Check for time overlap
      const conflicts = conflictingAppointments.filter((apt) => {
        const [aptStartH, aptStartM] = apt.startTime.split(":").map(Number);
        const [aptEndH, aptEndM] = apt.endTime.split(":").map(Number);
        const aptStartMinutes = aptStartH * 60 + aptStartM;
        const aptEndMinutes = aptEndH * 60 + aptEndM;

        return startMinutes < aptEndMinutes && endMinutes > aptStartMinutes;
      });

      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            warning: "มีนัดหมายที่ซ้อนกับช่วงเวลาที่เลือก",
            conflicts: conflicts.map((apt) => ({
              id: apt.id,
              time: `${apt.startTime} - ${apt.endTime}`,
              service: apt.service.nameTh,
              userName: apt.userName,
            })),
            message: "คุณต้องการสร้างช่วงเวลาไม่ว่างแม้จะมีนัดหมายซ้อนหรือไม่?",
          },
          { status: 409 }
        );
      }
    }

    // Create unavailability record
    const unavailability = await prisma.staffAvailability.create({
      data: {
        staffId,
        date: new Date(date),
        startTime,
        endTime,
        reason,
        recurring: recurring || false,
      },
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

    return NextResponse.json(unavailability, { status: 201 });
  } catch (error) {
    console.error("Staff availability POST error:", error);
    return NextResponse.json(
      { error: "Failed to create unavailability" },
      { status: 500 }
    );
  }
}
