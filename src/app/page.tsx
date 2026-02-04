"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type AvailabilityStatus = "open" | "limited" | "closed";

interface DashboardData {
  status: AvailabilityStatus;
  availableStaff: number;
  totalStaff: number;
  services: { id: string; name: string; nameTh: string; duration: number }[];
  todaySlots: number;
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const statusConfig = {
    open: { label: "เปิดให้บริการ", labelEn: "Open", color: "bg-green-500", textColor: "text-green-700" },
    limited: { label: "บริการจำกัด", labelEn: "Limited", color: "bg-yellow-500", textColor: "text-yellow-700" },
    closed: { label: "ปิดให้บริการ", labelEn: "Closed", color: "bg-red-500", textColor: "text-red-700" },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  const status = data?.status || "closed";
  const config = statusConfig[status];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-blue-900">🖥️ ศูนย์คอมพิวเตอร์ปราจีนบุรี</h1>
              <p className="text-gray-600">Prachinburi Computer Center Help Desk</p>
            </div>
            <Link href="/staff/login">
              <Button variant="outline">เข้าสู่ระบบ</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Status Card */}
        <Card className="mb-8">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg text-gray-600">สถานะปัจจุบัน / Current Status</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className={`w-4 h-4 rounded-full ${config.color} animate-pulse`} />
              <span className={`text-3xl font-bold ${config.textColor}`}>{config.label}</span>
            </div>
            <p className="text-gray-500 text-lg">{config.labelEn}</p>
            <p className="mt-4 text-xl">
              เจ้าหน้าที่พร้อมให้บริการ: <span className="font-bold text-blue-600">{data?.availableStaff || 0}</span> / {data?.totalStaff || 0} คน
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Book Appointment */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📅 นัดหมายล่วงหน้า
              </CardTitle>
              <CardDescription>Book an Appointment</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">จองคิวล่วงหน้าเพื่อรับบริการตามเวลาที่สะดวก</p>
              <p className="text-sm text-gray-500 mb-4">
                วันนี้มีช่องว่าง: <Badge variant="secondary">{data?.todaySlots || 0} slots</Badge>
              </p>
              <Link href="/book">
                <Button className="w-full">จองคิว / Book Now</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Services */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🛠️ บริการของเรา
              </CardTitle>
              <CardDescription>Our Services</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data?.services.map((service) => (
                  <li key={service.id} className="flex items-center justify-between">
                    <span>{service.nameTh}</span>
                    <Badge variant="outline">{service.duration} นาที</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📍 ข้อมูลติดต่อ
              </CardTitle>
              <CardDescription>Contact Information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-gray-600">
                <p>🕐 เวลาทำการ: 08:30 - 16:30 น.</p>
                <p>📞 โทร: 037-XXX-XXX</p>
                <p>📧 Email: helpdesk@cc.prachinburi.ac.th</p>
                <p>📍 อาคารศูนย์คอมพิวเตอร์ ชั้น 1</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2026 ศูนย์คอมพิวเตอร์ปราจีนบุรี | Prachinburi Computer Center</p>
        </div>
      </footer>
    </div>
  );
}
