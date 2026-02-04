import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serviceId, date, startTime, userName, userPhone, userEmail, description } = body;

    if (!serviceId || !date || !startTime || !userName || !userPhone || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
    const endTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

    // Create appointment
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
        status: "PENDING",
      },
      include: {
        service: true,
      },
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Appointment error:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: { service: true, staff: true },
      });
      return NextResponse.json(appointment);
    }

    // List all appointments (for admin)
    const appointments = await prisma.appointment.findMany({
      include: { service: true, staff: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}
