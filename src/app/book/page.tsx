"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

interface Service {
  id: string;
  name: string;
  nameTh: string;
  duration: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function BookPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    userName: "",
    userPhone: "",
    userEmail: "",
    description: "",
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedService) {
      fetchTimeSlots();
    }
  }, [selectedDate, selectedService]);

  async function fetchServices() {
    const res = await fetch("/api/services");
    const data = await res.json();
    setServices(data);
  }

  async function fetchTimeSlots() {
    if (!selectedDate) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    const res = await fetch(`/api/slots?date=${dateStr}&serviceId=${selectedService}`);
    const data = await res.json();
    setTimeSlots(data.slots || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService,
          date: selectedDate?.toISOString().split("T")[0],
          startTime: selectedTime,
          ...formData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/book/${data.id}`);
      } else {
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  const selectedServiceData = services.find((s) => s.id === selectedService);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-blue-600 hover:underline">
              ← กลับหน้าหลัก
            </Link>
            <h1 className="text-xl font-bold text-blue-900">📅 จองคิวล่วงหน้า</h1>
            <div />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-1 ${step > s ? "bg-blue-600" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Service & Date */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>เลือกบริการและวันที่</CardTitle>
              <CardDescription>Select Service & Date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>ประเภทบริการ *</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
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

              <div>
                <Label>เลือกวันที่ *</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                  className="rounded-md border mt-2"
                />
              </div>

              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!selectedService || !selectedDate}
              >
                ถัดไป
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Time */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>เลือกเวลา</CardTitle>
              <CardDescription>
                {selectedServiceData?.nameTh} - {selectedDate?.toLocaleDateString("th-TH")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className="text-sm"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>

              {timeSlots.length === 0 && (
                <p className="text-center text-gray-500">ไม่มีช่องว่างในวันนี้</p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  ย้อนกลับ
                </Button>
                <Button onClick={() => setStep(3)} disabled={!selectedTime} className="flex-1">
                  ถัดไป
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Contact Info */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลติดต่อ</CardTitle>
              <CardDescription>Contact Information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="userName">ชื่อ-นามสกุล *</Label>
                  <Input
                    id="userName"
                    required
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="userPhone">เบอร์โทรศัพท์ *</Label>
                  <Input
                    id="userPhone"
                    type="tel"
                    required
                    value={formData.userPhone}
                    onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="userEmail">อีเมล (ถ้ามี)</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={formData.userEmail}
                    onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">อธิบายปัญหา *</Label>
                  <Textarea
                    id="description"
                    required
                    rows={3}
                    placeholder="อธิบายปัญหาที่ต้องการความช่วยเหลือ..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">สรุปการจอง</h4>
                  <p>📋 บริการ: {selectedServiceData?.nameTh}</p>
                  <p>📅 วันที่: {selectedDate?.toLocaleDateString("th-TH")}</p>
                  <p>🕐 เวลา: {selectedTime} น.</p>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                    ย้อนกลับ
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? "กำลังจอง..." : "ยืนยันการจอง"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
