import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameWeek,
  isSameMonth,
} from "date-fns";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "day"; // day, week, month

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Fetch all appointments in date range
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay(start),
          lte: endOfDay(end),
        },
      },
      include: {
        service: true,
        staff: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Summary statistics
    const summary = {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "PENDING").length,
      confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
      completed: appointments.filter((a) => a.status === "COMPLETED").length,
      cancelled: appointments.filter((a) => a.status === "CANCELLED").length,
      assigned: appointments.filter((a) => a.staffId !== null).length,
      unassigned: appointments.filter((a) => a.staffId === null).length,
    };

    // Time series data grouped by day/week/month
    let timeSeries: { period: string; count: number; completed: number; cancelled: number }[] = [];

    if (groupBy === "day") {
      const days = eachDayOfInterval({ start, end });
      timeSeries = days.map((day) => {
        const dayAppointments = appointments.filter((a) =>
          isSameDay(new Date(a.date), day)
        );
        return {
          period: format(day, "yyyy-MM-dd"),
          count: dayAppointments.length,
          completed: dayAppointments.filter((a) => a.status === "COMPLETED").length,
          cancelled: dayAppointments.filter((a) => a.status === "CANCELLED").length,
        };
      });
    } else if (groupBy === "week") {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });
      timeSeries = weeks.map((week) => {
        const weekAppointments = appointments.filter((a) =>
          isSameWeek(new Date(a.date), week, { weekStartsOn: 0 })
        );
        return {
          period: format(week, "yyyy-MM-dd"),
          count: weekAppointments.length,
          completed: weekAppointments.filter((a) => a.status === "COMPLETED").length,
          cancelled: weekAppointments.filter((a) => a.status === "CANCELLED").length,
        };
      });
    } else if (groupBy === "month") {
      const months = eachMonthOfInterval({ start, end });
      timeSeries = months.map((month) => {
        const monthAppointments = appointments.filter((a) =>
          isSameMonth(new Date(a.date), month)
        );
        return {
          period: format(month, "yyyy-MM"),
          count: monthAppointments.length,
          completed: monthAppointments.filter((a) => a.status === "COMPLETED").length,
          cancelled: monthAppointments.filter((a) => a.status === "CANCELLED").length,
        };
      });
    }

    // Service breakdown
    const serviceMap = new Map<string, { name: string; nameTh: string; count: number; completed: number }>();
    appointments.forEach((apt) => {
      const existing = serviceMap.get(apt.serviceId) || {
        name: apt.service.name,
        nameTh: apt.service.nameTh,
        count: 0,
        completed: 0,
      };
      existing.count++;
      if (apt.status === "COMPLETED") {
        existing.completed++;
      }
      serviceMap.set(apt.serviceId, existing);
    });

    const serviceBreakdown = Array.from(serviceMap.entries()).map(([id, data]) => ({
      serviceId: id,
      serviceName: data.name,
      serviceNameTh: data.nameTh,
      count: data.count,
      completed: data.completed,
      completionRate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0,
    }));

    // Staff performance
    const staffMap = new Map<
      string,
      { name: string; email: string; count: number; completed: number; pending: number }
    >();
    appointments.forEach((apt) => {
      if (apt.staff) {
        const existing = staffMap.get(apt.staffId!) || {
          name: apt.staff.name,
          email: apt.staff.email,
          count: 0,
          completed: 0,
          pending: 0,
        };
        existing.count++;
        if (apt.status === "COMPLETED") {
          existing.completed++;
        }
        if (apt.status === "PENDING") {
          existing.pending++;
        }
        staffMap.set(apt.staffId!, existing);
      }
    });

    const staffPerformance = Array.from(staffMap.entries()).map(([id, data]) => ({
      staffId: id,
      staffName: data.name,
      staffEmail: data.email,
      totalAssigned: data.count,
      completed: data.completed,
      pending: data.pending,
      completionRate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0,
    }));

    // Sort staff by total assigned (descending)
    staffPerformance.sort((a, b) => b.totalAssigned - a.totalAssigned);

    // Sort service by count (descending)
    serviceBreakdown.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      summary,
      timeSeries,
      serviceBreakdown,
      staffPerformance,
      dateRange: {
        start: format(start, "yyyy-MM-dd"),
        end: format(end, "yyyy-MM-dd"),
        groupBy,
      },
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
