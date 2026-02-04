"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

interface StaffAvailability {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  recurring: boolean;
  staffId: string;
}

interface UnavailabilityDialogProps {
  open: boolean;
  onClose: () => void;
  staffId: string;
  staffName: string;
  existingRecord?: StaffAvailability;
  onSuccess: () => void;
}

// Generate time slots (08:30 - 16:30, 30-min intervals)
function generateTimeSlots() {
  const slots: string[] = [];
  for (let h = 8; h <= 16; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 16 && m > 30) break; // Stop at 16:30
      if (h === 8 && m === 0) continue; // Start at 08:30
      const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      slots.push(time);
    }
  }
  return slots;
}

export function UnavailabilityDialog({
  open,
  onClose,
  staffId,
  staffName,
  existingRecord,
  onSuccess,
}: UnavailabilityDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState("");

  const timeSlots = generateTimeSlots();

  // Load existing record data
  useEffect(() => {
    if (existingRecord) {
      setSelectedDate(new Date(existingRecord.date));
      setStartTime(existingRecord.startTime);
      setEndTime(existingRecord.endTime);
      setReason(existingRecord.reason);
      setRecurring(existingRecord.recurring);
    } else {
      resetForm();
    }
  }, [existingRecord, open]);

  async function handleSubmit(e: React.FormEvent, forceCreate = false) {
    e.preventDefault();
    setError("");

    // Validation
    if (!selectedDate || !startTime || !endTime || !reason.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    // Validate date is not in past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setError("ไม่สามารถเลือกวันที่ในอดีตได้");
      return;
    }

    // Validate time range
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    if (startH * 60 + startM >= endH * 60 + endM) {
      setError("เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด");
      return;
    }

    setLoading(true);

    try {
      if (existingRecord) {
        // Update existing record
        const res = await fetch(`/api/staff-availability/${existingRecord.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startTime,
            endTime,
            reason: reason.trim(),
            recurring,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
          return;
        }

        toast.success("แก้ไขข้อมูลสำเร็จ!");
        resetForm();
        onSuccess();
        onClose();
      } else {
        // Create new record
        const res = await fetch("/api/staff-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId,
            date: selectedDate.toISOString(),
            startTime,
            endTime,
            reason: reason.trim(),
            recurring,
            forceCreate,
          }),
        });

        const data = await res.json();

        if (res.status === 409) {
          // Conflict warning - ask user to confirm
          const conflictMessages = data.conflicts
            .map((c: any) => `- ${c.service}: ${c.userName} (${c.time})`)
            .join("\n");

          const userConfirmed = confirm(
            `${data.warning}\n\nนัดหมายที่ซ้อน:\n${conflictMessages}\n\nคุณต้องการดำเนินการต่อหรือไม่?`
          );

          if (userConfirmed) {
            // Retry with forceCreate
            setLoading(false);
            handleSubmit(e, true);
            return;
          } else {
            setLoading(false);
            return;
          }
        }

        if (!res.ok) {
          setError(data.error || "เกิดข้อผิดพลาดในการสร้างข้อมูล");
          return;
        }

        toast.success("สร้างช่วงเวลาไม่ว่างสำเร็จ!");
        resetForm();
        onSuccess();
        onClose();
      }
    } catch (e) {
      console.error("Failed to save unavailability:", e);
      setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!existingRecord) return;

    if (!confirm("คุณต้องการลบช่วงเวลาไม่ว่างนี้หรือไม่?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/staff-availability/${existingRecord.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "เกิดข้อผิดพลาดในการลบข้อมูล");
        return;
      }

      toast.success("ลบข้อมูลสำเร็จ!");
      resetForm();
      onSuccess();
      onClose();
    } catch (e) {
      console.error("Failed to delete unavailability:", e);
      setError("เกิดข้อผิดพลาดในการลบข้อมูล");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedDate(undefined);
    setStartTime("");
    setEndTime("");
    setReason("");
    setRecurring(false);
    setError("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {existingRecord ? "แก้ไขช่วงเวลาไม่ว่าง" : "สร้างช่วงเวลาไม่ว่าง"}
            </DialogTitle>
            <DialogDescription>
              จัดการช่วงเวลาที่คุณไม่สามารถรับงานได้ - {staffName}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>วันที่ *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={!!existingRecord}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: th }) : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>เวลาเริ่ม *</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกเวลา" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>เวลาสิ้นสุด *</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกเวลา" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">เหตุผล *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น: ประชุม, พักเที่ยง, ธุระส่วนตัว..."
                rows={3}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={recurring}
                onCheckedChange={(checked) => setRecurring(checked as boolean)}
              />
              <Label htmlFor="recurring" className="cursor-pointer">
                ทำซ้ำทุกสัปดาห์
              </Label>
            </div>

            <DialogFooter className="gap-2">
              {existingRecord && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                  className="mr-auto"
                >
                  ลบ
                </Button>
              )}
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "กำลังบันทึก..." : existingRecord ? "บันทึก" : "สร้าง"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
