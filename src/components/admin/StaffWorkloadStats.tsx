import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StaffWorkloadStatsProps {
  metrics: {
    appointments: {
      total: number;
      pending: number;
      confirmed: number;
      completed: number;
      cancelled: number;
    };
    workload: {
      totalHours: number;
      scheduledSlots: number;
      availableSlots: number;
      utilizationRate: number;
    };
    performance: {
      completionRate: number;
      avgCompletionTime: number | null;
      onTimeRate: number;
    };
    unavailability: {
      total: number;
      totalHours: number;
      reasons: Array<{
        reason: string;
        count: number;
        hours: number;
      }>;
    };
  };
  loading?: boolean;
}

export function StaffWorkloadStats({ metrics, loading }: StaffWorkloadStatsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="h-32 flex items-center justify-center">
              <p className="text-gray-400">กำลังโหลด...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate circle progress for utilization rate
  const circumference = 2 * Math.PI * 40; // radius = 40
  const utilizationOffset =
    circumference - (metrics.workload.utilizationRate / 100) * circumference;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Card 1: Total Appointments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">📋 นัดหมายทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-600">
            {metrics.appointments.total}
          </p>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">รอยืนยัน:</span>
              <Badge variant="secondary">{metrics.appointments.pending}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ยืนยันแล้ว:</span>
              <Badge variant="default">{metrics.appointments.confirmed}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">เสร็จสิ้น:</span>
              <Badge variant="outline">{metrics.appointments.completed}</Badge>
            </div>
            {metrics.appointments.cancelled > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ยกเลิก:</span>
                <Badge variant="destructive">{metrics.appointments.cancelled}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Utilization Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">⚡ อัตราการใช้งาน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {/* Circular Progress */}
            <div className="relative h-20 w-20 flex-shrink-0">
              <svg className="transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={utilizationOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">
                  {Math.round(metrics.workload.utilizationRate)}%
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="text-xs space-y-1">
              <p className="text-gray-600">
                {metrics.workload.scheduledSlots} /{" "}
                {metrics.workload.scheduledSlots + metrics.workload.availableSlots}{" "}
                ช่อง
              </p>
              <p className="text-gray-600">
                {metrics.workload.totalHours.toFixed(1)} ชั่วโมง
              </p>
              <p className="text-gray-500 text-[10px]">
                ว่าง: {metrics.workload.availableSlots} ช่อง
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Completion Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">✅ อัตราความสำเร็จ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">
            {Math.round(metrics.performance.completionRate)}%
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {metrics.appointments.completed} / {metrics.appointments.total} งาน
          </p>
          {metrics.performance.avgCompletionTime !== null && (
            <p className="text-xs text-gray-500 mt-1">
              เฉลี่ย {metrics.performance.avgCompletionTime.toFixed(1)} วัน
            </p>
          )}
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(metrics.performance.completionRate, 100)}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Unavailable Time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">🚫 เวลาไม่ว่าง</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-gray-600">
            {metrics.unavailability.total}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {metrics.unavailability.totalHours.toFixed(1)} ชั่วโมง
          </p>
          {metrics.unavailability.reasons.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-gray-700">เหตุผล:</p>
              {metrics.unavailability.reasons.slice(0, 3).map((r, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-xs"
                >
                  <span className="text-gray-600 truncate flex-1 mr-2">
                    {r.reason}
                  </span>
                  <span className="text-gray-500">
                    {r.count}x ({r.hours.toFixed(1)}h)
                  </span>
                </div>
              ))}
              {metrics.unavailability.reasons.length > 3 && (
                <p className="text-xs text-gray-400 italic">
                  +{metrics.unavailability.reasons.length - 3} อื่นๆ
                </p>
              )}
            </div>
          )}
          {metrics.unavailability.total === 0 && (
            <p className="text-xs text-gray-400 mt-2 italic">
              ไม่มีเวลาไม่ว่าง
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
