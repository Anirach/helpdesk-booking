import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAuditLog, createAppointmentHistory, getStaffName } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, appointmentIds, staffId, status, performedBy, performedByName } = body;

    if (!action || !appointmentIds || !Array.isArray(appointmentIds)) {
      return NextResponse.json(
        { error: "action and appointmentIds[] are required" },
        { status: 400 }
      );
    }

    if (appointmentIds.length === 0) {
      return NextResponse.json(
        { error: "At least one appointment ID is required" },
        { status: 400 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; reason: string }[],
    };

    if (action === "assign") {
      if (!staffId) {
        return NextResponse.json({ error: "staffId is required for assign action" }, { status: 400 });
      }

      // Validate staff exists
      const staff = await prisma.user.findUnique({
        where: { id: staffId },
      });

      if (!staff || !["STAFF", "ADMIN"].includes(staff.role)) {
        return NextResponse.json({ error: "Invalid staff member" }, { status: 400 });
      }

      const staffName = await getStaffName(staffId);

      // Process each appointment
      for (const appointmentId of appointmentIds) {
        try {
          // Get current appointment
          const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { staff: true },
          });

          if (!appointment) {
            results.failed.push({ id: appointmentId, reason: "Appointment not found" });
            continue;
          }

          const oldStaffId = appointment.staffId;
          const oldStaffName = appointment.staff?.name || null;

          // Update appointment
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { staffId },
          });

          // Create audit log
          await createAuditLog({
            entityType: "APPOINTMENT",
            entityId: appointmentId,
            action: oldStaffId ? "REASSIGNED" : "ASSIGNED",
            performedBy: performedBy || "SYSTEM",
            performedByName: performedByName || "System",
            fieldChanged: "staffId",
            oldValue: oldStaffId || "",
            newValue: staffId,
          });

          // Create appointment history
          await createAppointmentHistory({
            appointmentId,
            action: oldStaffId ? "REASSIGNED" : "ASSIGNED",
            performedBy: performedBy || "SYSTEM",
            performedByName: performedByName || "System",
            oldStaffId,
            oldStaffName,
            newStaffId: staffId,
            newStaffName: staffName,
            notes: oldStaffId
              ? `Bulk reassigned from ${oldStaffName} to ${staffName}`
              : `Bulk assigned to ${staffName}`,
          });

          results.success.push(appointmentId);
        } catch (error) {
          console.error(`Failed to assign appointment ${appointmentId}:`, error);
          results.failed.push({ id: appointmentId, reason: "Update failed" });
        }
      }
    } else if (action === "change_status") {
      if (!status) {
        return NextResponse.json({ error: "status is required for change_status action" }, { status: 400 });
      }

      // Process each appointment
      for (const appointmentId of appointmentIds) {
        try {
          const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
          });

          if (!appointment) {
            results.failed.push({ id: appointmentId, reason: "Appointment not found" });
            continue;
          }

          const oldStatus = appointment.status;

          // Update appointment
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status },
          });

          // Create audit log
          await createAuditLog({
            entityType: "APPOINTMENT",
            entityId: appointmentId,
            action: "STATUS_CHANGE",
            performedBy: performedBy || "SYSTEM",
            performedByName: performedByName || "System",
            fieldChanged: "status",
            oldValue: oldStatus,
            newValue: status,
          });

          // Create appointment history
          await createAppointmentHistory({
            appointmentId,
            action: "STATUS_CHANGED",
            performedBy: performedBy || "SYSTEM",
            performedByName: performedByName || "System",
            oldStatus,
            newStatus: status,
            notes: `Bulk status change: ${oldStatus} → ${status}`,
          });

          results.success.push(appointmentId);
        } catch (error) {
          console.error(`Failed to change status for appointment ${appointmentId}:`, error);
          results.failed.push({ id: appointmentId, reason: "Update failed" });
        }
      }
    } else if (action === "cancel") {
      // Process each appointment
      for (const appointmentId of appointmentIds) {
        try {
          const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
          });

          if (!appointment) {
            results.failed.push({ id: appointmentId, reason: "Appointment not found" });
            continue;
          }

          const oldStatus = appointment.status;

          // Update appointment
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: "CANCELLED" },
          });

          // Create audit log
          await createAuditLog({
            entityType: "APPOINTMENT",
            entityId: appointmentId,
            action: "STATUS_CHANGE",
            performedBy: performedBy || "SYSTEM",
            performedByName: performedByName || "System",
            fieldChanged: "status",
            oldValue: oldStatus,
            newValue: "CANCELLED",
          });

          // Create appointment history
          await createAppointmentHistory({
            appointmentId,
            action: "CANCELLED",
            performedBy: performedBy || "SYSTEM",
            performedByName: performedByName || "System",
            oldStatus,
            newStatus: "CANCELLED",
            notes: "Bulk cancellation",
          });

          results.success.push(appointmentId);
        } catch (error) {
          console.error(`Failed to cancel appointment ${appointmentId}:`, error);
          results.failed.push({ id: appointmentId, reason: "Update failed" });
        }
      }
    } else {
      return NextResponse.json({ error: "Invalid action. Use: assign, change_status, or cancel" }, { status: 400 });
    }

    // Broadcast notification for bulk operation
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001"}/api/notifications/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "appointment:bulk_update",
        data: {
          action,
          count: results.success.length,
          performedByName: performedByName || "System",
        },
        targetRole: "STAFF",
      }),
    }).catch((err) => console.error("Failed to publish notification:", err));

    return NextResponse.json({
      success: results.success.length,
      failed: results.failed.length,
      total: appointmentIds.length,
      results,
    });
  } catch (error) {
    console.error("Bulk operation error:", error);
    return NextResponse.json({ error: "Failed to perform bulk operation" }, { status: 500 });
  }
}
