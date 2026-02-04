import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkStaffAvailability } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      staffId,
      serviceId,
      date,
      startTime,
      userName,
      userPhone,
      userEmail,
      description,
      performedBy,
      performedByName,
    } = body;

    // Validate required fields
    if (
      !staffId ||
      !serviceId ||
      !date ||
      !startTime ||
      !userName ||
      !userPhone ||
      !description ||
      !performedBy ||
      !performedByName
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get service to calculate end time
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Calculate end time
    const [startH, startM] = startTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = startMinutes + service.duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${endH.toString().padStart(2, "0")}:${endM
      .toString()
      .padStart(2, "0")}`;

    // Check staff availability
    const availabilityCheck = await checkStaffAvailability(
      staffId,
      date,
      startTime,
      endTime
    );

    if (!availabilityCheck.available) {
      return NextResponse.json(
        {
          error: "Staff is not available at this time",
          conflicts: availabilityCheck.conflicts,
        },
        { status: 400 }
      );
    }

    // Create appointment with CONFIRMED status (staff-created appointments are pre-confirmed)
    const appointment = await prisma.appointment.create({
      data: {
        date: new Date(date),
        startTime,
        endTime,
        userName,
        userPhone,
        userEmail: userEmail || null,
        description,
        serviceId,
        staffId,
        status: "CONFIRMED",
      },
      include: {
        service: true,
        staff: true,
      },
    });

    // Create appointment history record
    await prisma.appointmentHistory.create({
      data: {
        appointmentId: appointment.id,
        action: "CREATED",
        performedBy,
        performedByName,
        details: `Staff ${performedByName} created appointment for themselves`,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: performedBy,
        action: "CREATE_APPOINTMENT",
        resource: "APPOINTMENT",
        resourceId: appointment.id,
        details: {
          appointmentId: appointment.id,
          staffId,
          serviceId,
          date: date,
          startTime,
          endTime,
          userName,
        },
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("Staff appointment creation error:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
