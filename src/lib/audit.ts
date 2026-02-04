import { prisma } from "./db";

/**
 * Audit logging utilities for tracking system changes
 */

export interface AuditLogParams {
  entityType: "APPOINTMENT" | "USER" | "SERVICE";
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "STATUS_CHANGE";
  performedBy: string;
  performedByName: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AppointmentHistoryParams {
  appointmentId: string;
  action: "CREATED" | "ASSIGNED" | "REASSIGNED" | "STATUS_CHANGED" | "CANCELLED";
  performedBy: string;
  performedByName: string;
  oldStaffId?: string | null;
  oldStaffName?: string | null;
  newStaffId?: string | null;
  newStaffName?: string | null;
  oldStatus?: string;
  newStatus?: string;
  notes?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        performedBy: params.performedBy,
        performedByName: params.performedByName,
        fieldChanged: params.fieldChanged,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
    return auditLog;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main operation
    return null;
  }
}

/**
 * Create an appointment history entry
 */
export async function createAppointmentHistory(params: AppointmentHistoryParams) {
  try {
    const history = await prisma.appointmentHistory.create({
      data: {
        appointmentId: params.appointmentId,
        action: params.action,
        performedBy: params.performedBy,
        performedByName: params.performedByName,
        oldStaffId: params.oldStaffId,
        oldStaffName: params.oldStaffName,
        newStaffId: params.newStaffId,
        newStaffName: params.newStaffName,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
        notes: params.notes,
      },
    });
    return history;
  } catch (error) {
    console.error("Failed to create appointment history:", error);
    // Don't throw - history logging should not break the main operation
    return null;
  }
}

/**
 * Helper to get staff name by ID
 */
export async function getStaffName(staffId: string | null): Promise<string | null> {
  if (!staffId) return null;
  try {
    const staff = await prisma.user.findUnique({
      where: { id: staffId },
      select: { name: true },
    });
    return staff?.name || null;
  } catch (error) {
    console.error("Failed to get staff name:", error);
    return null;
  }
}

/**
 * Helper to stringify complex values for audit logs
 */
export function stringifyValue(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
