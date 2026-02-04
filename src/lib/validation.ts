import { prisma } from "./db";
import { parseISO, isSameDay, parse, isWithinInterval } from "date-fns";

export interface AvailabilityConflict {
  type: "unavailable" | "double_booked";
  reason: string;
  details?: any;
}

/**
 * Check if staff is available for a specific time slot
 */
export async function checkStaffAvailability(
  staffId: string,
  date: Date | string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string
): Promise<{ available: boolean; conflicts: AvailabilityConflict[] }> {
  const targetDate = typeof date === "string" ? parseISO(date) : date;
  const conflicts: AvailabilityConflict[] = [];

  try {
    // Check 1: Staff unavailability records
    const unavailability = await prisma.staffAvailability.findMany({
      where: {
        staffId,
        date: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lte: new Date(targetDate.setHours(23, 59, 59, 999)),
        },
      },
    });

    unavailability.forEach((record) => {
      if (timeSlotsOverlap(startTime, endTime, record.startTime, record.endTime)) {
        conflicts.push({
          type: "unavailable",
          reason: record.reason,
          details: {
            startTime: record.startTime,
            endTime: record.endTime,
            recurring: record.recurring,
          },
        });
      }
    });

    // Check 2: Overlapping appointments
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        staffId,
        date: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lte: new Date(targetDate.setHours(23, 59, 59, 999)),
        },
        status: {
          not: "CANCELLED",
        },
        ...(excludeAppointmentId && {
          id: {
            not: excludeAppointmentId,
          },
        }),
      },
      include: {
        service: true,
      },
    });

    existingAppointments.forEach((appointment) => {
      if (timeSlotsOverlap(startTime, endTime, appointment.startTime, appointment.endTime)) {
        conflicts.push({
          type: "double_booked",
          reason: `Already assigned to ${appointment.service.nameTh}`,
          details: {
            appointmentId: appointment.id,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            customerName: appointment.userName,
            service: appointment.service.nameTh,
          },
        });
      }
    });

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  } catch (error) {
    console.error("Availability check error:", error);
    // Return available on error to not block operations
    return {
      available: true,
      conflicts: [],
    };
  }
}

/**
 * Check if two time slots overlap
 */
function timeSlotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Convert time strings to minutes from midnight
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  // Check if intervals overlap
  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
}

/**
 * Convert time string (HH:MM) to minutes from midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
