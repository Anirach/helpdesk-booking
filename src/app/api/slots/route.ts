import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");

    if (!dateStr || !serviceId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get service duration
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Get existing appointments for this date
    const appointments = await prisma.appointment.findMany({
      where: {
        date: { gte: date, lt: nextDay },
        status: { not: "CANCELLED" },
      },
      select: { startTime: true },
    });

    const bookedTimes = new Set(appointments.map((a) => a.startTime));

    // Generate time slots (08:30 - 16:30, 30-min intervals)
    const slots = [];
    const workStart = 8.5; // 08:30
    const workEnd = 16.5; // 16:30
    const interval = 0.5; // 30 minutes

    for (let hour = workStart; hour < workEnd; hour += interval) {
      const h = Math.floor(hour);
      const m = (hour % 1) * 60;
      const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      slots.push({
        time,
        available: !bookedTimes.has(time),
      });
    }

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Slots error:", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
