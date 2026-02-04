"use client";

import { Calendar, dateFnsLocalizer, View, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { th } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState, useMemo, useCallback } from "react";

interface Service {
  id: string;
  name: string;
  nameTh: string;
  duration: number;
}

interface Staff {
  id: string;
  name: string;
  email: string;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  userName: string;
  userPhone: string;
  description: string;
  status: string;
  staffId?: string | null;
  staff?: Staff | null;
  service: Service;
}

interface StaffAvailability {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  recurring: boolean;
  staffId: string;
  staff: Staff;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: "appointment" | "unavailability";
    data: Appointment | StaffAvailability;
  };
}

interface CalendarViewProps {
  appointments: Appointment[];
  unavailability: StaffAvailability[];
  staffId?: string;
  view: "staff" | "admin";
  onAppointmentClick?: (appointment: Appointment) => void;
  onSlotSelect?: (slotInfo: SlotInfo) => void;
  onUnavailabilityClick?: (unavailability: StaffAvailability) => void;
}

// Configure date-fns localizer
const locales = {
  th: th,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// Status color mapping
const statusColors: Record<string, string> = {
  PENDING: "#FEF3C7",
  CONFIRMED: "#DBEAFE",
  COMPLETED: "#D1FAE5",
  CANCELLED: "#FEE2E2",
};

// Staff color mapping (for admin view)
const staffColors: Record<string, string> = {
  default: "#E0E7FF",
};

export function CalendarView({
  appointments,
  unavailability,
  staffId,
  view,
  onAppointmentClick,
  onSlotSelect,
  onUnavailabilityClick,
}: CalendarViewProps) {
  const [calendarView, setCalendarView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Convert appointments to calendar events
  const events = useMemo(() => {
    const appointmentEvents: CalendarEvent[] = appointments.map((apt) => {
      const dateStr = apt.date;
      const date = new Date(dateStr);
      const [startH, startM] = apt.startTime.split(":").map(Number);
      const [endH, endM] = apt.endTime.split(":").map(Number);

      const start = new Date(date);
      start.setHours(startH, startM, 0, 0);

      const end = new Date(date);
      end.setHours(endH, endM, 0, 0);

      return {
        id: apt.id,
        title: `${apt.service.nameTh} - ${apt.userName}`,
        start,
        end,
        resource: {
          type: "appointment" as const,
          data: apt,
        },
      };
    });

    // Convert unavailability to calendar events
    const unavailabilityEvents: CalendarEvent[] = unavailability.map((unav) => {
      const dateStr = unav.date;
      const date = new Date(dateStr);
      const [startH, startM] = unav.startTime.split(":").map(Number);
      const [endH, endM] = unav.endTime.split(":").map(Number);

      const start = new Date(date);
      start.setHours(startH, startM, 0, 0);

      const end = new Date(date);
      end.setHours(endH, endM, 0, 0);

      return {
        id: unav.id,
        title: `🚫 ${unav.reason}`,
        start,
        end,
        resource: {
          type: "unavailability" as const,
          data: unav,
        },
      };
    });

    return [...appointmentEvents, ...unavailabilityEvents];
  }, [appointments, unavailability]);

  // Handle event selection
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (event.resource.type === "appointment") {
        onAppointmentClick?.(event.resource.data as Appointment);
      } else {
        onUnavailabilityClick?.(event.resource.data as StaffAvailability);
      }
    },
    [onAppointmentClick, onUnavailabilityClick]
  );

  // Handle slot selection (for creating new appointments)
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (view === "staff" && onSlotSelect) {
        onSlotSelect(slotInfo);
      }
    },
    [view, onSlotSelect]
  );

  // Custom event styling
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      if (event.resource.type === "unavailability") {
        return {
          style: {
            backgroundColor: "#F3F4F6",
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 10px, #E5E7EB 10px, #E5E7EB 20px)",
            border: "1px solid #D1D5DB",
            color: "#6B7280",
            opacity: 0.8,
          },
        };
      }

      const appointment = event.resource.data as Appointment;
      const bgColor = statusColors[appointment.status] || "#E0E7FF";

      return {
        style: {
          backgroundColor: bgColor,
          border: "1px solid " + (statusColors[appointment.status] ? "#000" : "#6366F1"),
          borderRadius: "4px",
          color: "#1F2937",
          fontSize: "0.85rem",
        },
      };
    },
    []
  );

  // Custom formats for Thai locale
  const formats = useMemo(
    () => ({
      monthHeaderFormat: (date: Date) => format(date, "MMMM yyyy", { locale: th }),
      dayHeaderFormat: (date: Date) => format(date, "EEE d/M", { locale: th }),
      dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${format(start, "d MMM", { locale: th })} - ${format(end, "d MMM yyyy", { locale: th })}`,
      agendaDateFormat: (date: Date) => format(date, "EEE d MMM", { locale: th }),
      agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${format(start, "d MMM", { locale: th })} - ${format(end, "d MMM yyyy", { locale: th })}`,
    }),
    []
  );

  // Working hours
  const minTime = useMemo(() => {
    const time = new Date();
    time.setHours(8, 0, 0);
    return time;
  }, []);

  const maxTime = useMemo(() => {
    const time = new Date();
    time.setHours(17, 0, 0);
    return time;
  }, []);

  return (
    <div className="calendar-container h-[700px] bg-white rounded-lg shadow p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={calendarView}
        onView={setCalendarView}
        date={currentDate}
        onNavigate={setCurrentDate}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable={view === "staff"}
        eventPropGetter={eventStyleGetter}
        formats={formats}
        min={minTime}
        max={maxTime}
        step={30}
        timeslots={2}
        messages={{
          next: "ถัดไป",
          previous: "ก่อนหน้า",
          today: "วันนี้",
          month: "เดือน",
          week: "สัปดาห์",
          day: "วัน",
          agenda: "กำหนดการ",
          date: "วันที่",
          time: "เวลา",
          event: "นัดหมาย",
          noEventsInRange: "ไม่มีนัดหมายในช่วงเวลานี้",
          showMore: (total: number) => `+${total} เพิ่มเติม`,
        }}
        popup
        culture="th"
      />
    </div>
  );
}
