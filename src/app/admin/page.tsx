"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AssignStaffDialog } from "@/components/admin/AssignStaffDialog";
import { useNotifications } from "@/hooks/useNotifications";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarView } from "@/components/calendar/CalendarView";
import { StaffWorkloadStats } from "@/components/admin/StaffWorkloadStats";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfMonth, endOfMonth, addMonths, startOfWeek, endOfWeek, addWeeks } from "date-fns";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, staff: 0 });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [calendarAppointments, setCalendarAppointments] = useState<any[]>([]);
  const [unavailability, setUnavailability] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [staff, setStaff] = useState<User[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // Staff overview state
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [staffMetrics, setStaffMetrics] = useState<any>(null);
  const [staffMetricsLoading, setStaffMetricsLoading] = useState(false);
  const [staffCalendarAppointments, setStaffCalendarAppointments] = useState<any[]>([]);
  const [staffUnavailability, setStaffUnavailability] = useState<any[]>([]);

  // Bulk selection
  const bulkSelection = useBulkSelection(appointments);

  // Real-time notifications
  useNotifications({
    userId: user?.id || "",
    role: user?.role || "",
    onAppointmentAssigned: () => {
      // Refresh data when assignments change
      fetchData();
      fetchCalendarData();
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
    if (userData.role !== "ADMIN") {
      router.push("/staff");
      return;
    }
    setUser(userData);
    fetchData();
  }, [router]);

  async function fetchData() {
    const [apptRes, staffRes] = await Promise.all([
      fetch("/api/appointments"),
      fetch("/api/staff"),
    ]);
    const apptData = await apptRes.json();
    const staffData = await staffRes.json();

    setAppointments(apptData);
    setStaff(staffData);
    setStats({
      total: apptData.length,
      pending: apptData.filter((a: any) => a.status === "PENDING").length,
      completed: apptData.filter((a: any) => a.status === "COMPLETED").length,
      staff: staffData.length,
    });
  }

  async function fetchCalendarData() {
    setCalendarLoading(true);
    try {
      // Fetch appointments for current month ± 1 month
      const now = new Date();
      const startDate = startOfMonth(addMonths(now, -1));
      const endDate = endOfMonth(addMonths(now, 1));

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        view: "admin",
      });

      const res = await fetch(`/api/appointments/calendar?${params}`);
      const data = await res.json();

      setCalendarAppointments(data.appointments || []);
      setUnavailability(data.unavailability || []);
    } catch (e) {
      console.error("Failed to fetch calendar data:", e);
    } finally {
      setCalendarLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchCalendarData();
    }
  }, [user]);

  async function fetchStaffMetrics(staffId: string) {
    setStaffMetricsLoading(true);
    try {
      const now = new Date();
      const startDate = startOfWeek(now, { weekStartsOn: 1 });
      const endDate = endOfWeek(now, { weekStartsOn: 1 });
      endDate.setDate(endDate.getDate() + 7); // Add one more week

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const res = await fetch(`/api/staff/${staffId}/metrics?${params}`);
      const data = await res.json();
      setStaffMetrics(data);

      // Also fetch calendar data for this staff
      await fetchStaffCalendarData(staffId);
    } catch (e) {
      console.error("Failed to fetch staff metrics:", e);
    } finally {
      setStaffMetricsLoading(false);
    }
  }

  async function fetchStaffCalendarData(staffId: string) {
    try {
      const now = new Date();
      const startDate = startOfMonth(addMonths(now, -1));
      const endDate = endOfMonth(addMonths(now, 1));

      const params = new URLSearchParams({
        staffId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        view: "admin",
      });

      const res = await fetch(`/api/appointments/calendar?${params}`);
      const data = await res.json();

      setStaffCalendarAppointments(data.appointments || []);
      setStaffUnavailability(data.unavailability || []);
    } catch (e) {
      console.error("Failed to fetch staff calendar:", e);
    }
  }

  function handleLogout() {
    localStorage.removeItem("user");
    router.push("/");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-blue-900">⚙️ Admin Panel</h1>
              <p className="text-sm text-gray-600">ผู้ดูแลระบบ: {user.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin/reports">
                <Button variant="outline">📊 Reports</Button>
              </Link>
              <Link href="/staff">
                <Button variant="outline">Staff View</Button>
              </Link>
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
              <CardTitle className="text-lg">📊 รวมทั้งหมด</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">⏳ รอยืนยัน</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">✅ เสร็จสิ้น</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">👥 เจ้าหน้าที่</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats.staff}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar">📅 ปฏิทิน</TabsTrigger>
            <TabsTrigger value="staff-overview">👤 ภาพรวมเจ้าหน้าที่</TabsTrigger>
            <TabsTrigger value="appointments">นัดหมาย ({stats.total})</TabsTrigger>
            <TabsTrigger value="staff">เจ้าหน้าที่ ({stats.staff})</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>ปฏิทินนัดหมายทั้งหมด</CardTitle>
                <CardDescription>All Appointments Calendar - View all staff schedules</CardDescription>
              </CardHeader>
              <CardContent>
                {calendarLoading ? (
                  <div className="flex items-center justify-center h-[600px]">
                    <p className="text-gray-500">กำลังโหลด...</p>
                  </div>
                ) : (
                  <CalendarView
                    appointments={calendarAppointments}
                    unavailability={unavailability}
                    view="admin"
                    onAppointmentClick={(apt) => {
                      // Open assignment dialog for admin
                      setSelectedAppointment(apt);
                      setAssignDialogOpen(true);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff-overview">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>ภาพรวมเจ้าหน้าที่</CardTitle>
                    <CardDescription>Staff Overview - Individual workload and calendar</CardDescription>
                  </div>
                  <Select
                    value={selectedStaffId || ""}
                    onValueChange={(value) => {
                      setSelectedStaffId(value);
                      if (value) fetchStaffMetrics(value);
                    }}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="เลือกเจ้าหน้าที่..." />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!selectedStaffId ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <p className="text-gray-500">กรุณาเลือกเจ้าหน้าที่เพื่อดูข้อมูล</p>
                  </div>
                ) : staffMetricsLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                  </div>
                ) : staffMetrics ? (
                  <>
                    {/* Workload Stats Cards */}
                    <StaffWorkloadStats metrics={staffMetrics} loading={staffMetricsLoading} />

                    {/* Staff Calendar */}
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">
                        ปฏิทินของ {staffMetrics.staff.name}
                      </h3>
                      <CalendarView
                        appointments={staffCalendarAppointments}
                        unavailability={staffUnavailability}
                        staffId={selectedStaffId}
                        view="admin"
                        onAppointmentClick={(apt) => {
                          setSelectedAppointment(apt);
                          setAssignDialogOpen(true);
                        }}
                      />
                    </div>

                    {/* Upcoming Appointments Table */}
                    {staffMetrics.upcomingAppointments?.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4">นัดหมายที่กำลังจะถึง</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>วันที่</TableHead>
                              <TableHead>เวลา</TableHead>
                              <TableHead>ผู้จอง</TableHead>
                              <TableHead>บริการ</TableHead>
                              <TableHead>สถานะ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {staffMetrics.upcomingAppointments.slice(0, 5).map((apt: any) => (
                              <TableRow key={apt.id}>
                                <TableCell>
                                  {new Date(apt.date).toLocaleDateString("th-TH")}
                                </TableCell>
                                <TableCell className="font-mono">{apt.startTime}</TableCell>
                                <TableCell>{apt.userName}</TableCell>
                                <TableCell>{apt.service?.nameTh}</TableCell>
                                <TableCell>
                                  <Badge>{apt.status}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle>รายการนัดหมายทั้งหมด</CardTitle>
                <CardDescription>All Appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={bulkSelection.isAllSelected}
                          onCheckedChange={bulkSelection.toggleAll}
                        />
                      </TableHead>
                      <TableHead>วันที่</TableHead>
                      <TableHead>เวลา</TableHead>
                      <TableHead>ผู้จอง</TableHead>
                      <TableHead>บริการ</TableHead>
                      <TableHead>เจ้าหน้าที่</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.slice(0, 20).map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>
                          <Checkbox
                            checked={bulkSelection.isSelected(apt.id)}
                            onCheckedChange={() => bulkSelection.toggle(apt.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(apt.date).toLocaleDateString("th-TH")}
                        </TableCell>
                        <TableCell className="font-mono">
                          {apt.startTime}
                        </TableCell>
                        <TableCell>{apt.userName}</TableCell>
                        <TableCell>{apt.service?.nameTh}</TableCell>
                        <TableCell>
                          {apt.staff ? (
                            <div>
                              <div className="font-medium text-sm">{apt.staff.name}</div>
                              <div className="text-xs text-gray-500">{apt.staff.email}</div>
                            </div>
                          ) : (
                            <Badge variant="outline">ยังไม่มอบหมาย</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge>{apt.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setAssignDialogOpen(true);
                            }}
                          >
                            {apt.staff ? "เปลี่ยน" : "มอบหมาย"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle>รายชื่อเจ้าหน้าที่</CardTitle>
                <CardDescription>Staff Members</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>อีเมล</TableHead>
                      <TableHead>บทบาท</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell>
                          <Badge variant={s.role === "ADMIN" ? "default" : "secondary"}>
                            {s.role}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BulkActionsBar
        selectedCount={bulkSelection.selectedCount}
        staff={staff}
        onClear={bulkSelection.clear}
        onSuccess={fetchData}
        selectedIds={Array.from(bulkSelection.selectedIds)}
        userId={user?.id || ""}
        userName={user?.name || ""}
      />

      <AssignStaffDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        appointment={selectedAppointment}
        staff={staff}
        onAssignmentComplete={() => {
          fetchData();
          fetchCalendarData();
        }}
        userId={user?.id || ""}
        userName={user?.name || ""}
      />
    </div>
  );
}
