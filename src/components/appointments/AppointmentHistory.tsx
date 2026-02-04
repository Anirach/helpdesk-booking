"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HistoryEntry {
  id: string;
  action: string;
  performedBy: string;
  performedByName: string;
  oldStaffId: string | null;
  oldStaffName: string | null;
  newStaffId: string | null;
  newStaffName: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  notes: string | null;
  createdAt: string;
}

interface AppointmentHistoryProps {
  appointmentId: string;
}

export function AppointmentHistory({ appointmentId }: AppointmentHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [appointmentId]);

  async function fetchHistory() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/appointments/${appointmentId}/history`);

      if (!res.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถโหลดประวัติได้");
    } finally {
      setLoading(false);
    }
  }

  const actionLabels: Record<string, string> = {
    CREATED: "สร้างนัดหมาย",
    ASSIGNED: "มอบหมายเจ้าหน้าที่",
    REASSIGNED: "เปลี่ยนเจ้าหน้าที่",
    STATUS_CHANGED: "เปลี่ยนสถานะ",
    CANCELLED: "ยกเลิก",
  };

  const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    CREATED: "outline",
    ASSIGNED: "default",
    REASSIGNED: "secondary",
    STATUS_CHANGED: "secondary",
    CANCELLED: "destructive",
  };

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📜 ประวัติการเปลี่ยนแปลง</CardTitle>
          <CardDescription>Loading history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📜 ประวัติการเปลี่ยนแปลง</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">📜 ประวัติการเปลี่ยนแปลง</CardTitle>
        <CardDescription>Assignment and Status Change History</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">ยังไม่มีประวัติการเปลี่ยนแปลง</div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div key={entry.id} className="relative pl-8 pb-4">
                {/* Timeline connector */}
                {index < history.length - 1 && (
                  <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gray-200" />
                )}

                {/* Timeline dot */}
                <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />

                {/* Content */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={actionColors[entry.action] || "default"}>
                      {actionLabels[entry.action] || entry.action}
                    </Badge>
                    <span className="text-xs text-gray-500">{formatDate(entry.createdAt)}</span>
                  </div>

                  <div className="text-sm">
                    <span className="text-gray-600">โดย: </span>
                    <span className="font-medium">{entry.performedByName}</span>
                  </div>

                  {/* Staff assignment change */}
                  {(entry.action === "ASSIGNED" || entry.action === "REASSIGNED") && (
                    <div className="text-sm mt-2 pt-2 border-t border-gray-200">
                      {entry.oldStaffName && (
                        <div>
                          <span className="text-gray-600">จาก: </span>
                          <span className="line-through text-gray-400">{entry.oldStaffName}</span>
                        </div>
                      )}
                      {entry.newStaffName && (
                        <div>
                          <span className="text-gray-600">ถึง: </span>
                          <span className="font-medium text-green-700">{entry.newStaffName}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status change */}
                  {entry.action === "STATUS_CHANGED" && (
                    <div className="text-sm mt-2 pt-2 border-t border-gray-200">
                      {entry.oldStatus && (
                        <div>
                          <span className="text-gray-600">สถานะเดิม: </span>
                          <span>{entry.oldStatus}</span>
                        </div>
                      )}
                      {entry.newStatus && (
                        <div>
                          <span className="text-gray-600">สถานะใหม่: </span>
                          <span className="font-medium">{entry.newStatus}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {entry.notes && (
                    <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                      {entry.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
