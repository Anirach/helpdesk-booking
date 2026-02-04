import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAuditLog, createAppointmentHistory, getStaffName } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { staffId, performedBy, performedByName } = body;
    const { id: appointmentId } = await params;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Appointment ID required" },
        { status: 400 }
      );
    }

    // Validate staff member if staffId is provided
    if (staffId !== null && staffId !== undefined) {
      const staffExists = await prisma.user.findUnique({
        where: { id: staffId },
      });

      if (!staffExists || !["STAFF", "ADMIN"].includes(staffExists.role)) {
        return NextResponse.json(
          { error: "Invalid staff member" },
          { status: 400 }
        );
      }
    }

    // Get current appointment to capture old values
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        staff: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Capture old values for audit trail
    const oldStaffId = appointment.staffId;
    const oldStaffName = appointment.staff?.name || null;

    // Update appointment
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { staffId: staffId || null },
      include: {
        service: true,
        staff: true,
      },
    });

    // Get new staff name
    const newStaffName = await getStaffName(staffId);

    // Determine action type
    let action: "ASSIGNED" | "REASSIGNED";
    let historyAction: "ASSIGNED" | "REASSIGNED";

    if (!oldStaffId && staffId) {
      action = "ASSIGNED";
      historyAction = "ASSIGNED";
    } else {
      action = "REASSIGNED";
      historyAction = "REASSIGNED";
    }

    // Create audit log (non-blocking)
    await createAuditLog({
      entityType: "APPOINTMENT",
      entityId: appointmentId,
      action: action,
      performedBy: performedBy || "SYSTEM",
      performedByName: performedByName || "System",
      fieldChanged: "staffId",
      oldValue: oldStaffId || "",
      newValue: staffId || "",
    });

    // Create appointment history (non-blocking)
    await createAppointmentHistory({
      appointmentId: appointmentId,
      action: historyAction,
      performedBy: performedBy || "SYSTEM",
      performedByName: performedByName || "System",
      oldStaffId: oldStaffId,
      oldStaffName: oldStaffName,
      newStaffId: staffId || null,
      newStaffName: newStaffName,
      notes: oldStaffId
        ? `Staff reassigned from ${oldStaffName} to ${newStaffName}`
        : `Staff assigned to ${newStaffName}`,
    });

    // Broadcast real-time notification (non-blocking)
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001"}/api/notifications/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "appointment:assigned",
        data: {
          appointmentId,
          appointmentDate: updated.date,
          appointmentTime: `${updated.startTime} - ${updated.endTime}`,
          customerName: updated.userName,
          serviceName: updated.service.nameTh,
          staffId: staffId,
          staffName: newStaffName,
          oldStaffName: oldStaffName,
          performedByName: performedByName || "System",
          action: historyAction,
        },
        targetRole: "STAFF", // Notify all staff
      }),
    }).catch((err) => console.error("Failed to publish notification:", err));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        staff: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}
