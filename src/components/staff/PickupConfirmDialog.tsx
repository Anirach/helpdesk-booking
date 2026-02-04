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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  userName: string;
  userPhone: string;
  description: string;
  service: { nameTh: string };
}

interface PickupConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  userId: string;
  onPickupComplete: () => void;
}

export function PickupConfirmDialog({
  open,
  onOpenChange,
  appointment,
  userId,
  onPickupComplete,
}: PickupConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePickup = async () => {
    if (!appointment) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: userId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to pickup appointment");
      }

      toast.success("รับงานสำเร็จ");
      onOpenChange(false);
      onPickupComplete();
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถรับงานได้");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ยืนยันการรับงาน</DialogTitle>
          <DialogDescription>
            คุณต้องการรับงานนัดหมายนี้หรือไม่?
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="space-y-2 rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">เวลา:</span>
              <span className="font-mono text-sm">
                {appointment.startTime} - {appointment.endTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">ผู้จอง:</span>
              <span className="text-sm font-medium">{appointment.userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">เบอร์โทร:</span>
              <span className="text-sm">{appointment.userPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">บริการ:</span>
              <span className="text-sm">{appointment.service.nameTh}</span>
            </div>
            <div className="mt-2 pt-2 border-t">
              <span className="text-sm text-gray-600">ปัญหา:</span>
              <p className="text-sm mt-1">{appointment.description}</p>
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
          <Button onClick={handlePickup} disabled={isLoading}>
            {isLoading ? "กำลังรับงาน..." : "ยืนยัน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
