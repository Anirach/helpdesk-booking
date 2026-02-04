"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ReportData {
  summary: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    assigned: number;
    unassigned: number;
  };
  timeSeries: Array<{
    period: string;
    count: number;
    completed: number;
    cancelled: number;
  }>;
  serviceBreakdown: Array<{
    serviceId: string;
    serviceName: string;
    serviceNameTh: string;
    count: number;
    completed: number;
    completionRate: number;
  }>;
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    staffEmail: string;
    totalAssigned: number;
    completed: number;
    pending: number;
    completionRate: number;
  }>;
}

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Date range state
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

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
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchReport();
    }
  }, [user, startDate, endDate, groupBy]);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        groupBy,
      });

      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed to fetch report");

      const data = await res.json();
      setReportData(data);
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถโหลดรายงานได้");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(exportFormat: "csv" | "pdf") {
    try {
      const params = new URLSearchParams({
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        format: exportFormat,
      });

      const res = await fetch(`/api/reports/export?${params}`);
      if (!res.ok) throw new Error("Failed to export");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appointments_${format(startDate, "yyyyMMdd")}_${format(endDate, "yyyyMMdd")}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`ส่งออก ${format.toUpperCase()} สำเร็จ`);
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถส่งออกรายงานได้");
    }
  }

  function handleLogout() {
    localStorage.removeItem("user");
    router.push("/");
  }

  function setQuickRange(days: number) {
    setEndDate(new Date());
    setStartDate(subDays(new Date(), days));
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-blue-900">📊 Reports Dashboard</h1>
              <p className="text-sm text-gray-600">รายงานการนัดหมาย</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="outline">กลับ Admin Panel</Button>
              </Link>
              <Button variant="ghost" onClick={handleLogout}>
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>ตัวกรอง</CardTitle>
            <CardDescription>เลือกช่วงเวลาและรูปแบบการแสดงผล</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {/* Quick ranges */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">ช่วงเวลาด่วน</label>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => setQuickRange(7)}>
                    7 วันล่าสุด
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickRange(30)}>
                    30 วันล่าสุด
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate(startOfMonth(new Date()));
                      setEndDate(endOfMonth(new Date()));
                    }}
                  >
                    เดือนนี้
                  </Button>
                </div>
              </div>

              {/* Start date */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">วันที่เริ่มต้น</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">{format(startDate, "dd/MM/yyyy")}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End date */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">วันที่สิ้นสุด</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">{format(endDate, "dd/MM/yyyy")}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Group by */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">จัดกลุ่มตาม</label>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">รายวัน</SelectItem>
                    <SelectItem value="week">รายสัปดาห์</SelectItem>
                    <SelectItem value="month">รายเดือน</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export buttons */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">ส่งออก</label>
                <div className="flex flex-col gap-2">
                  <Button size="sm" onClick={() => handleExport("csv")}>
                    📄 CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport("pdf")}>
                    📑 PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-gray-500">กำลังโหลดรายงาน...</div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">📊 ทั้งหมด</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{reportData.summary.total}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">✅ เสร็จสิ้น</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{reportData.summary.completed}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {reportData.summary.total > 0
                      ? Math.round((reportData.summary.completed / reportData.summary.total) * 100)
                      : 0}
                    %
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">⏳ รอดำเนินการ</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-yellow-600">{reportData.summary.pending}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">❌ ยกเลิก</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">{reportData.summary.cancelled}</p>
                </CardContent>
              </Card>
            </div>

            {/* Time Series Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>แนวโน้มการนัดหมาย</CardTitle>
                <CardDescription>จำนวนการนัดหมายตามช่วงเวลา</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" name="ทั้งหมด" />
                    <Line type="monotone" dataKey="completed" stroke="#10b981" name="เสร็จสิ้น" />
                    <Line type="monotone" dataKey="cancelled" stroke="#ef4444" name="ยกเลิก" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Service Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>สถิติตามบริการ</CardTitle>
                  <CardDescription>จำนวนและอัตราความสำเร็จแต่ละบริการ</CardDescription>
                </CardHeader>
                <CardContent>
                  {reportData.serviceBreakdown.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">ไม่มีข้อมูล</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>บริการ</TableHead>
                          <TableHead className="text-right">จำนวน</TableHead>
                          <TableHead className="text-right">เสร็จสิ้น</TableHead>
                          <TableHead className="text-right">อัตรา</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.serviceBreakdown.map((service) => (
                          <TableRow key={service.serviceId}>
                            <TableCell>{service.serviceNameTh}</TableCell>
                            <TableCell className="text-right">{service.count}</TableCell>
                            <TableCell className="text-right">{service.completed}</TableCell>
                            <TableCell className="text-right">{service.completionRate}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Staff Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>ประสิทธิภาพเจ้าหน้าที่</CardTitle>
                  <CardDescription>สถิติการทำงานของแต่ละคน</CardDescription>
                </CardHeader>
                <CardContent>
                  {reportData.staffPerformance.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">ไม่มีข้อมูล</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>เจ้าหน้าที่</TableHead>
                          <TableHead className="text-right">รับงาน</TableHead>
                          <TableHead className="text-right">เสร็จสิ้น</TableHead>
                          <TableHead className="text-right">อัตรา</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.staffPerformance.map((staff) => (
                          <TableRow key={staff.staffId}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{staff.staffName}</div>
                                <div className="text-xs text-gray-500">{staff.staffEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{staff.totalAssigned}</TableCell>
                            <TableCell className="text-right">{staff.completed}</TableCell>
                            <TableCell className="text-right">{staff.completionRate}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
