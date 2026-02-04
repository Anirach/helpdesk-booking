import { NextResponse } from "next/server";
import { checkStaffAvailability } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { staffId, date, startTime, endTime, excludeAppointmentId } = body;

    if (!staffId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "staffId, date, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const result = await checkStaffAvailability(
      staffId,
      date,
      startTime,
      endTime,
      excludeAppointmentId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Validation API error:", error);
    return NextResponse.json(
      { error: "Failed to validate availability" },
      { status: 500 }
    );
  }
}
