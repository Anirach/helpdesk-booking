"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Appointment {
  id: string;
  userName: string;
  service: { nameTh: string };
  staffId?: string | null;
}

interface AssignStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  staff: Staff[];
  onAssignmentComplete: () => void;
}

export function AssignStaffDialog({
  open,
  onOpenChange,
  appointment,
  staff,
  onAssignmentComplete,
}: AssignStaffDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAssign = async () => {
    if (!appointment || !selectedStaffId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedStaffId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to assign staff");
      }

      toast.success("มอบหมายเจ้าหน้าที่สำเร็จ");
      onOpenChange(false);
      onAssignmentComplete();
      setSelectedStaffId("");
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถมอบหมายเจ้าหน้าที่ได้");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>มอบหมายเจ้าหน้าที่</DialogTitle>
          <DialogDescription>
            เลือกเจ้าหน้าที่สำหรับการนัดหมายนี้
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium">{appointment.userName}</p>
              <p className="text-gray-600">{appointment.service.nameTh}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">เจ้าหน้าที่</label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกเจ้าหน้าที่" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedStaffId || isLoading}
          >
            {isLoading ? "กำลังบันทึก..." : "มอบหมาย"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
