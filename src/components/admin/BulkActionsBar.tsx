"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  staff: User[];
  onClear: () => void;
  onSuccess: () => void;
  selectedIds: string[];
  userId: string;
  userName: string;
}

export function BulkActionsBar({
  selectedCount,
  staff,
  onClear,
  onSuccess,
  selectedIds,
  userId,
  userName,
}: BulkActionsBarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  async function handleBulkAssign() {
    if (!selectedStaffId) {
      toast.error("กรุณาเลือกเจ้าหน้าที่");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/appointments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          appointmentIds: Array.from(selectedIds),
          staffId: selectedStaffId,
          performedBy: userId,
          performedByName: userName,
        }),
      });

      if (!res.ok) throw new Error("Failed to bulk assign");

      const data = await res.json();
      toast.success(`มอบหมายสำเร็จ ${data.success} รายการ`);

      if (data.failed > 0) {
        toast.warning(`ล้มเหลว ${data.failed} รายการ`);
      }

      onClear();
      onSuccess();
      setSelectedStaffId("");
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถมอบหมายได้");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBulkCancel() {
    if (!confirm(`ยืนยันการยกเลิก ${selectedCount} รายการ?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/appointments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          appointmentIds: Array.from(selectedIds),
          performedBy: userId,
          performedByName: userName,
        }),
      });

      if (!res.ok) throw new Error("Failed to bulk cancel");

      const data = await res.json();
      toast.success(`ยกเลิกสำเร็จ ${data.success} รายการ`);

      if (data.failed > 0) {
        toast.warning(`ล้มเหลว ${data.failed} รายการ`);
      }

      onClear();
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถยกเลิกได้");
    } finally {
      setIsLoading(false);
    }
  }

  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-blue-50 border-t border-blue-200 p-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-medium">{selectedCount} รายการที่เลือก</span>

          <div className="flex items-center gap-2">
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId} disabled={isLoading}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="เลือกเจ้าหน้าที่" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleBulkAssign} disabled={isLoading || !selectedStaffId} size="sm">
              {isLoading ? "กำลังมอบหมาย..." : "มอบหมาย"}
            </Button>
          </div>

          <Button onClick={handleBulkCancel} disabled={isLoading} variant="destructive" size="sm">
            {isLoading ? "กำลังยกเลิก..." : "ยกเลิก"}
          </Button>
        </div>

        <Button onClick={onClear} variant="ghost" size="sm">
          ล้างการเลือก
        </Button>
      </div>
    </div>
  );
}
