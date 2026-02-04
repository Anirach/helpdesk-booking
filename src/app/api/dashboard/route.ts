import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all staff
    const allStaff = await prisma.user.findMany({
      where: { role: "STAFF" },
    });

    // Get staff unavailability for today
    const unavailable = await prisma.staffAvailability.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
      },
    });

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    // Count available staff (not currently unavailable)
    const unavailableStaffIds = unavailable
      .filter((u) => u.startTime <= currentTime && u.endTime > currentTime)
      .map((u) => u.staffId);

    const availableStaff = allStaff.filter(
      (staff) => !unavailableStaffIds.includes(staff.id)
    ).length;

    // Determine status
    let status: "open" | "limited" | "closed" = "closed";
    const workingHours = { start: "08:30", end: "16:30" };
    
    if (currentTime >= workingHours.start && currentTime < workingHours.end) {
      if (availableStaff === 0) {
        status = "closed";
      } else if (availableStaff < allStaff.length) {
        status = "limited";
      } else {
        status = "open";
      }
    }

    // Get services
    const services = await prisma.service.findMany({
      select: { id: true, name: true, nameTh: true, duration: true },
    });

    // Count today's available slots (simplified)
    const todayAppointments = await prisma.appointment.count({
      where: {
        date: { gte: today, lt: tomorrow },
        status: { not: "CANCELLED" },
      },
    });

    // Assuming 8 hours, 30-min slots = 16 slots per staff
    const totalSlots = allStaff.length * 16;
    const todaySlots = Math.max(0, totalSlots - todayAppointments);

    return NextResponse.json({
      status,
      availableStaff,
      totalStaff: allStaff.length,
      services,
      todaySlots,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
