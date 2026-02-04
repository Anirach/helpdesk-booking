"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  nameTh: string;
  duration: number;
}

interface StaffAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  prefilledDate?: Date;
  prefilledTime?: string;
  staffId: string;
  staffName: string;
  onSuccess: () => void;
}

export function StaffAppointmentDialog({
  open,
  onClose,
  prefilledDate,
  prefilledTime,
  staffId,
  staffName,
  onSuccess,
}: StaffAppointmentDialogProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);

  // Form fields
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(prefilledDate);
  const [serviceId, setServiceId] = useState<string>("");
  const [startTime, setStartTime] = useState(prefilledTime || "");
  const [endTime, setEndTime] = useState("");
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  // Fetch services
  useEffect(() => {
    if (open) {
      fetchServices();
    }
  }, [open]);

  // Update prefilled values when they change
  useEffect(() => {
    if (prefilledDate) setSelectedDate(prefilledDate);
    if (prefilledTime) setStartTime(prefilledTime);
  }, [prefilledDate, prefilledTime]);

  // Auto-calculate end time when service or start time changes
  useEffect(() => {
    if (serviceId && startTime) {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        const [h, m] = startTime.split(":").map(Number);
        const totalMinutes = h * 60 + m + service.duration;
        const endH = Math.floor(totalMinutes / 60);
        const endM = totalMinutes % 60;
        setEndTime(`${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`);
      }
    }
  }, [serviceId, startTime, services]);

  async function fetchServices() {
    setServicesLoading(true);
    try {
      const res = await fetch("/api/services");
      const data = await res.json();
      setServices(data);
    } catch (e) {
      console.error("Failed to fetch services:", e);
      toast.error("ไม่สามารถโหลดรายการบริการได้");
    } finally {
      setServicesLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation
    if (!selectedDate || !serviceId || !startTime || !userName || !userPhone || !description) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/appointments/staff-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          serviceId,
          date: selectedDate.toISOString(),
          startTime,
          userName,
          userPhone,
          userEmail: userEmail || undefined,
          description,
          performedBy: staffId,
          performedByName: staffName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400 && data.conflicts) {
          // Availability conflict
          const conflictMessages = data.conflicts.map((c: any) => {
            if (c.type === "unavailable") {
              return `ไม่ว่าง: ${c.reason} (${c.timeRange})`;
            } else if (c.type === "appointment") {
              return `นัดหมายซ้อน: ${c.timeRange}`;
            }
            return c.reason;
          });
          setError(`ไม่สามารถสร้างนัดหมายได้:\n${conflictMessages.join("\n")}`);
        } else {
          setError(data.error || "เกิดข้อผิดพลาดในการสร้างนัดหมาย");
        }
        return;
      }

      // Success
      toast.success("สร้างนัดหมายสำเร็จ!");
      resetForm();
      onSuccess();
      onClose();
    } catch (e) {
      console.error("Failed to create appointment:", e);
      setError("เกิดข้อผิดพลาดในการสร้างนัดหมาย");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedDate(undefined);
    setServiceId("");
    setStartTime("");
    setEndTime("");
    setUserName("");
    setUserPhone("");
    setUserEmail("");
    setDescription("");
    setError("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>สร้างนัดหมายใหม่</DialogTitle>
          <DialogDescription>
            สร้างนัดหมายสำหรับตัวคุณเอง - {staffName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-wrap">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service">บริการ *</Label>
              <Select value={serviceId} onValueChange={setServiceId} disabled={servicesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบริการ..." />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.nameTh} ({service.duration} นาที)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>วันที่ *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
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
                      const day = date.getDay();
                      return date < new Date() || day === 0 || day === 6;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">เวลาเริ่ม *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                min="08:30"
                max="16:30"
                step="1800"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">เวลาสิ้นสุด</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userName">ชื่อผู้รับบริการ *</Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="ระบุชื่อ-นามสกุล"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userPhone">เบอร์โทรศัพท์ *</Label>
              <Input
                id="userPhone"
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="0812345678"
                pattern="[0-9]{10}"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userEmail">อีเมล (ถ้ามี)</Label>
            <Input
              id="userEmail"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียด/ปัญหา *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="อธิบายรายละเอียดปัญหาที่ต้องการรับบริการ..."
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังสร้างนัดหมาย..." : "สร้างนัดหมาย"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
