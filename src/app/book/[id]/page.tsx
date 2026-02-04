"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  userName: string;
  userPhone: string;
  userEmail: string | null;
  description: string;
  status: string;
  service: {
    name: string;
    nameTh: string;
  };
}

export default function ConfirmationPage() {
  const params = useParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointment() {
      try {
        const res = await fetch(`/api/appointments?id=${params.id}`);
        const data = await res.json();
        setAppointment(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAppointment();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">ไม่พบข้อมูลการจอง</h2>
            <Link href="/">
              <Button>กลับหน้าหลัก</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: "รอยืนยัน", color: "bg-yellow-500" },
    CONFIRMED: { label: "ยืนยันแล้ว", color: "bg-green-500" },
    COMPLETED: { label: "เสร็จสิ้น", color: "bg-blue-500" },
    CANCELLED: { label: "ยกเลิก", color: "bg-red-500" },
  };

  const status = statusConfig[appointment.status] || statusConfig.PENDING;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <CardTitle className="text-green-600">จองสำเร็จ!</CardTitle>
          <CardDescription>Booking Confirmed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">หมายเลขการจอง:</span>
              <span className="font-mono font-bold">{appointment.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">สถานะ:</span>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">รายละเอียดการจอง</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-600">บริการ:</span>
              <span>{appointment.service.nameTh}</span>
              
              <span className="text-gray-600">วันที่:</span>
              <span>{new Date(appointment.date).toLocaleDateString("th-TH", { dateStyle: "long" })}</span>
              
              <span className="text-gray-600">เวลา:</span>
              <span>{appointment.startTime} - {appointment.endTime} น.</span>
              
              <span className="text-gray-600">ชื่อ:</span>
              <span>{appointment.userName}</span>
              
              <span className="text-gray-600">โทรศัพท์:</span>
              <span>{appointment.userPhone}</span>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-sm">
            <p className="font-semibold mb-2">📌 หมายเหตุ:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>กรุณามาถึงก่อนเวลานัด 5-10 นาที</li>
              <li>นำบัตรประจำตัวมาด้วย</li>
              <li>หากต้องการยกเลิก กรุณาแจ้งล่วงหน้า</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">กลับหน้าหลัก</Button>
            </Link>
            <Link href="/book" className="flex-1">
              <Button className="w-full">จองเพิ่ม</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
