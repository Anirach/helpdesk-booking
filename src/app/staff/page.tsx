"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PickupConfirmDialog } from "@/components/staff/PickupConfirmDialog";
import { useNotifications } from "@/hooks/useNotifications";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  userName: string;
  userPhone: string;
  description: string;
  status: string;
  staffId?: string | null;
  staff?: { id: string; name: string; email: string } | null;
  service: { nameTh: string };
}

export default function StaffPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Real-time notifications
  useNotifications({
    userId: user?.id || "",
    role: user?.role || "",
    onAppointmentAssigned: () => {
      // Refresh appointments when someone is assigned
      fetchTodayAppointments();
    },
    enabled: !!user,
  });

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/staff/login");
      return;
    }
    const userData = JSON.parse(stored);
    setUser(userData);
    fetchTodayAppointments();
  }, [router]);

  async function fetchTodayAppointments() {
    try {
      const res = await fetch("/api/appointments");
      const data = await res.json();
      const today = new Date().toDateString();
      const todayAppts = data.filter(
        (a: Appointment) => new Date(a.date).toDateString() === today
      );
      setAppointments(todayAppts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("user");
    router.push("/");
  }

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: "รอยืนยัน", variant: "secondary" },
    CONFIRMED: { label: "ยืนยันแล้ว", variant: "default" },
    COMPLETED: { label: "เสร็จสิ้น", variant: "outline" },
    CANCELLED: { label: "ยกเลิก", variant: "destructive" },
  };

  // Filter appointments
  const myAppointments = appointments.filter((a) => a.staffId === user?.id);
  const availableAppointments = appointments.filter((a) => !a.staffId);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-blue-900">👨‍💻 Staff Portal</h1>
              <p className="text-sm text-gray-600">สวัสดี, {user.name}</p>
            </div>
            <div className="flex items-center gap-4">
              {user.role === "ADMIN" && (
                <Link href="/admin">
                  <Button variant="outline">Admin Panel</Button>
                </Link>
              )}
              <Button variant="ghost" onClick={handleLogout}>
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">📋 งานของฉัน</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{myAppointments.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">📌 งานว่าง</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{availableAppointments.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">⏳ รอยืนยัน</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">
                {myAppointments.filter((a) => a.status === "PENDING").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">✅ เสร็จสิ้น</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {myAppointments.filter((a) => a.status === "COMPLETED").length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="my" className="space-y-4">
          <TabsList>
            <TabsTrigger value="my">งานของฉัน ({myAppointments.length})</TabsTrigger>
            <TabsTrigger value="available">งานว่าง ({availableAppointments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="my">
            <Card>
              <CardHeader>
                <CardTitle>งานของฉัน</CardTitle>
                <CardDescription>My Assigned Appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {myAppointments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">ยังไม่มีงานที่มอบหมายให้คุณ</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>เวลา</TableHead>
                        <TableHead>ผู้จอง</TableHead>
                        <TableHead>บริการ</TableHead>
                        <TableHead>ปัญหา</TableHead>
                        <TableHead>สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myAppointments.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell className="font-mono">
                            {apt.startTime} - {apt.endTime}
                          </TableCell>
                          <TableCell>
                            <div>{apt.userName}</div>
                            <div className="text-xs text-gray-500">{apt.userPhone}</div>
                          </TableCell>
                          <TableCell>{apt.service.nameTh}</TableCell>
                          <TableCell className="max-w-xs truncate">{apt.description}</TableCell>
                          <TableCell>
                            <Badge variant={statusConfig[apt.status]?.variant || "secondary"}>
                              {statusConfig[apt.status]?.label || apt.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="available">
            <Card>
              <CardHeader>
                <CardTitle>งานว่าง</CardTitle>
                <CardDescription>Available Appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {availableAppointments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">ไม่มีงานว่างในขณะนี้</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>เวลา</TableHead>
                        <TableHead>ผู้จอง</TableHead>
                        <TableHead>บริการ</TableHead>
                        <TableHead>ปัญหา</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableAppointments.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell className="font-mono">
                            {apt.startTime} - {apt.endTime}
                          </TableCell>
                          <TableCell>
                            <div>{apt.userName}</div>
                            <div className="text-xs text-gray-500">{apt.userPhone}</div>
                          </TableCell>
                          <TableCell>{apt.service.nameTh}</TableCell>
                          <TableCell className="max-w-xs truncate">{apt.description}</TableCell>
                          <TableCell>
                            <Badge variant={statusConfig[apt.status]?.variant || "secondary"}>
                              {statusConfig[apt.status]?.label || apt.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedAppointment(apt);
                                setPickupDialogOpen(true);
                              }}
                            >
                              รับงาน
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <PickupConfirmDialog
        open={pickupDialogOpen}
        onOpenChange={setPickupDialogOpen}
        appointment={selectedAppointment}
        userId={user?.id || ""}
        userName={user?.name || ""}
        onPickupComplete={fetchTodayAppointments}
      />
    </div>
  );
}
