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
  const [staff, setStaff] = useState<User[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // Bulk selection
  const bulkSelection = useBulkSelection(appointments);

  // Real-time notifications
  useNotifications({
    userId: user?.id || "",
    role: user?.role || "",
    onAppointmentAssigned: () => {
      // Refresh data when assignments change
      fetchData();
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

        <Tabs defaultValue="appointments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="appointments">นัดหมาย</TabsTrigger>
            <TabsTrigger value="staff">เจ้าหน้าที่</TabsTrigger>
          </TabsList>

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
        onAssignmentComplete={fetchData}
        userId={user?.id || ""}
        userName={user?.name || ""}
      />
    </div>
  );
}
