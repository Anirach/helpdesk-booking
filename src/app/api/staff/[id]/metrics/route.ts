import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfWeek, endOfWeek, differenceInBusinessDays, differenceInDays } from "date-fns";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: staffId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Default to current week through next week (2 weeks total)
    const now = new Date();
    const defaultStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const defaultEnd = endOfWeek(now, { weekStartsOn: 1 });
    defaultEnd.setDate(defaultEnd.getDate() + 7); // Add one more week

    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const startDate = startDateParam ? new Date(startDateParam) : defaultStart;
    const endDate = endDateParam ? new Date(endDateParam) : defaultEnd;

    // Fetch staff info
    const staff = await prisma.user.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Fetch appointments in date range
    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            nameTh: true,
            duration: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Calculate appointment statistics
    const appointmentStats = {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "PENDING").length,
      confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
      completed: appointments.filter((a) => a.status === "COMPLETED").length,
      cancelled: appointments.filter((a) => a.status === "CANCELLED").length,
    };

    // Calculate workload metrics
    const totalMinutes = appointments
      .filter((apt) => apt.status !== "CANCELLED")
      .reduce((sum, apt) => {
        const [startH, startM] = apt.startTime.split(":").map(Number);
        const [endH, endM] = apt.endTime.split(":").map(Number);
        const duration = endH * 60 + endM - (startH * 60 + startM);
        return sum + duration;
      }, 0);

    const totalHours = totalMinutes / 60;

    // Calculate working days (exclude weekends)
    const workingDays = differenceInBusinessDays(endDate, startDate) + 1;
    const totalCapacityMinutes = workingDays * 510; // 8.5 hours per day

    const scheduledSlots = appointments.filter(
      (a) => a.status !== "CANCELLED"
    ).length;

    // Calculate available slots (assuming 30-min slots in 8.5 hour day = 17 slots per day)
    const totalSlots = workingDays * 17;
    const availableSlots = totalSlots - scheduledSlots;

    const utilizationRate =
      totalCapacityMinutes > 0
        ? (totalMinutes / totalCapacityMinutes) * 100
        : 0;

    // Calculate performance metrics
    const completedAppointments = appointments.filter(
      (a) => a.status === "COMPLETED"
    );
    const completionRate =
      appointments.length > 0
        ? (completedAppointments.length / appointments.length) * 100
        : 0;

    // Calculate average completion time
    let avgCompletionTime: number | null = null;
    if (completedAppointments.length > 0) {
      const completionTimes = completedAppointments
        .map((apt) => {
          const created = new Date(apt.createdAt);
          const completed = new Date(apt.updatedAt); // Assuming updatedAt reflects completion
          return differenceInDays(completed, created);
        })
        .filter((days) => days >= 0);

      if (completionTimes.length > 0) {
        avgCompletionTime =
          completionTimes.reduce((sum, days) => sum + days, 0) /
          completionTimes.length;
      }
    }

    // For onTimeRate, we'll calculate based on appointments that started on the scheduled date
    // This is a simplified metric - in production you might track actual start times
    const onTimeRate =
      appointments.length > 0
        ? (appointments.filter((a) => a.status !== "CANCELLED").length /
            appointments.length) *
          100
        : 0;

    // Fetch unavailability data
    const unavailabilityRecords = await prisma.staffAvailability.findMany({
      where: {
        staffId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Calculate unavailability metrics
    const unavailabilityMinutes = unavailabilityRecords.reduce((sum, record) => {
      const [startH, startM] = record.startTime.split(":").map(Number);
      const [endH, endM] = record.endTime.split(":").map(Number);
      const duration = endH * 60 + endM - (startH * 60 + startM);
      return sum + duration;
    }, 0);

    const unavailabilityHours = unavailabilityMinutes / 60;

    // Group unavailability by reason
    const reasonGroups = unavailabilityRecords.reduce((acc, record) => {
      const existing = acc.find((r) => r.reason === record.reason);
      const [startH, startM] = record.startTime.split(":").map(Number);
      const [endH, endM] = record.endTime.split(":").map(Number);
      const duration = (endH * 60 + endM - (startH * 60 + startM)) / 60; // in hours

      if (existing) {
        existing.count++;
        existing.hours += duration;
      } else {
        acc.push({
          reason: record.reason,
          count: 1,
          hours: duration,
        });
      }
      return acc;
    }, [] as Array<{ reason: string; count: number; hours: number }>);

    // Sort by count descending
    reasonGroups.sort((a, b) => b.count - a.count);

    // Get upcoming appointments (next 5)
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        staffId,
        date: {
          gte: now,
        },
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            nameTh: true,
            duration: true,
          },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 5,
    });

    // Get recent activity (last 10 appointment history records)
    const recentActivity = await prisma.appointmentHistory.findMany({
      where: {
        appointment: {
          staffId,
        },
      },
      include: {
        appointment: {
          select: {
            id: true,
            userName: true,
            service: {
              select: {
                nameTh: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Build response
    const response = {
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      appointments: appointmentStats,
      workload: {
        totalHours: parseFloat(totalHours.toFixed(2)),
        scheduledSlots,
        availableSlots,
        utilizationRate: parseFloat(utilizationRate.toFixed(2)),
      },
      performance: {
        completionRate: parseFloat(completionRate.toFixed(2)),
        avgCompletionTime: avgCompletionTime
          ? parseFloat(avgCompletionTime.toFixed(1))
          : null,
        onTimeRate: parseFloat(onTimeRate.toFixed(2)),
      },
      unavailability: {
        total: unavailabilityRecords.length,
        totalHours: parseFloat(unavailabilityHours.toFixed(2)),
        reasons: reasonGroups.map((r) => ({
          reason: r.reason,
          count: r.count,
          hours: parseFloat(r.hours.toFixed(2)),
        })),
      },
      upcomingAppointments: upcomingAppointments.map((apt) => ({
        id: apt.id,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        userName: apt.userName,
        userPhone: apt.userPhone,
        description: apt.description,
        status: apt.status,
        service: apt.service,
      })),
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        action: activity.action,
        timestamp: activity.timestamp,
        performedBy: activity.performedBy,
        performedByName: activity.performedByName,
        notes: activity.notes,
        appointment: {
          id: activity.appointment.id,
          userName: activity.appointment.userName,
          serviceName: activity.appointment.service.nameTh,
        },
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Staff metrics GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff metrics" },
      { status: 500 }
    );
  }
}
