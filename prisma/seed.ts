/**
 * Database Seed Script
 *
 * This script generates comprehensive test data including:
 * - 5 users (1 admin + 4 staff)
 * - 4 services
 * - 150 appointments (past, recent, future)
 * - 20 staff availability records
 * - 400+ audit logs
 * - 400+ appointment history records
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *
 * Features covered:
 * ✅ Reports (day/week/month)
 * ✅ Bulk operations (30+ unassigned appointments)
 * ✅ Availability validation (conflicts and overlaps)
 * ✅ Real-time SSE (recent assignment events)
 * ✅ Audit/History (full lifecycle tracking)
 * ✅ CSV/PDF exports (Thai text with UTF-8 BOM)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";

const prisma = new PrismaClient();

// Helper functions for mock data generation
function getRandomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return new Date(startTime + Math.random() * (endTime - startTime));
}

function getRandomTimeSlot(serviceDuration: number): { startTime: string; endTime: string } {
  const hours = [9, 10, 11, 13, 14, 15, 16];
  const startHour = hours[Math.floor(Math.random() * hours.length)];
  const startTime = `${startHour.toString().padStart(2, '0')}:00`;

  // Calculate end time
  const endMinutes = startHour * 60 + serviceDuration;
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

  return { startTime, endTime };
}

const thaiNames = [
  'สมชาย ใจดี', 'สมหญิง รักดี', 'วิชัย มั่งคั่ง',
  'สุดา สวยงาม', 'ประยุทธ์ เก่งกาจ', 'อรุณ ใจดี',
  'นิภา มีสุข', 'ชัยณรงค์ พานิช', 'สุพรรณ ทองคำ',
  'วันเพ็ญ เจริญสุข', 'ธนพล รัตนะ', 'อนงค์ สุขสันต์'
];

const thaiPhonePrefixes = ['08', '09', '06'];

function getRandomThaiName(): string {
  return thaiNames[Math.floor(Math.random() * thaiNames.length)];
}

function getRandomPhoneNumber(): string {
  const prefix = thaiPhonePrefixes[Math.floor(Math.random() * thaiPhonePrefixes.length)];
  const digits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefix}${digits}`;
}

function getRandomDescription(): string {
  const descriptions = [
    'คอมพิวเตอร์เปิดไม่ติด',
    'ต้องการติดตั้งโปรแกรม Microsoft Office',
    'อินเทอร์เน็ตช้า ต้องการตรวจสอบ',
    'เครื่องเสียงไม่ทำงาน',
    'จอภาพเบลอ ต้องการเปลี่ยน',
    'ลืมรหัสผ่านบัญชีผู้ใช้',
    'ต้องการติดตั้งเครื่องพิมพ์',
    'เมาส์และคีย์บอร์ดไม่ทำงาน',
    'โปรแกรมค้าง ต้องการซ่อมแซม',
    'ต้องการอัพเกรดระบบปฏิบัติการ'
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@cc.prachinburi.ac.th" },
    update: {},
    create: {
      email: "admin@cc.prachinburi.ac.th",
      name: "ผู้ดูแลระบบ",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // Create staff users
  const staffPassword = await bcrypt.hash("staff123", 10);
  const staff1 = await prisma.user.upsert({
    where: { email: "staff1@cc.prachinburi.ac.th" },
    update: {},
    create: {
      email: "staff1@cc.prachinburi.ac.th",
      name: "สมชาย ช่วยเหลือ",
      password: staffPassword,
      role: "STAFF",
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: "staff2@cc.prachinburi.ac.th" },
    update: {},
    create: {
      email: "staff2@cc.prachinburi.ac.th",
      name: "สมหญิง บริการ",
      password: staffPassword,
      role: "STAFF",
    },
  });

  // Create services
  const services = [
    { name: "Hardware", nameTh: "ฮาร์ดแวร์", description: "Computer hardware issues", duration: 30 },
    { name: "Software", nameTh: "ซอฟต์แวร์", description: "Software installation and issues", duration: 30 },
    { name: "Network", nameTh: "เครือข่าย", description: "Network and internet issues", duration: 45 },
    { name: "Account", nameTh: "บัญชีผู้ใช้", description: "Account and password issues", duration: 15 },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.name.toLowerCase() },
      update: service,
      create: {
        id: service.name.toLowerCase(),
        ...service,
        staff: {
          connect: [{ id: staff1.id }, { id: staff2.id }],
        },
      },
    });
  }

  // Create default settings
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      workingStart: "08:30",
      workingEnd: "16:30",
      slotDuration: 30,
      holidays: "[]",
    },
  });

  console.log("✅ Basic seed data created");

  // === MOCK DATA GENERATION ===
  console.log("\n🎲 Generating mock data...");

  // Add 2 more staff members
  const staff3 = await prisma.user.upsert({
    where: { email: 'somchai@test.com' },
    update: {},
    create: {
      email: 'somchai@test.com',
      name: 'สมชาย ใจดี',
      password: await bcrypt.hash('password123', 10),
      role: 'STAFF',
    },
  });

  const staff4 = await prisma.user.upsert({
    where: { email: 'suda@test.com' },
    update: {},
    create: {
      email: 'suda@test.com',
      name: 'สุดา รักษ์ดี',
      password: await bcrypt.hash('password123', 10),
      role: 'STAFF',
    },
  });

  // Get all staff for reference
  const allStaff = await prisma.user.findMany({
    where: { role: { in: ['STAFF', 'ADMIN'] } },
  });
  const staffIds = allStaff.map(s => s.id);
  console.log(`✅ Created ${allStaff.length} users`);

  // Clear existing appointments (idempotent)
  await prisma.appointmentHistory.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.appointment.deleteMany({});
  console.log("✅ Cleared existing appointments, audit logs, and history");

  // Get all services
  const allServices = await prisma.service.findMany();
  const appointments = [];

  // Date ranges for appointments
  const dateRanges = [
    { start: subDays(new Date(), 60), end: subDays(new Date(), 8), count: 60, statusWeights: { COMPLETED: 0.8, CANCELLED: 0.2 } },
    { start: subDays(new Date(), 7), end: new Date(), count: 40, statusWeights: { CONFIRMED: 0.6, PENDING: 0.3, COMPLETED: 0.1 } },
    { start: addDays(new Date(), 1), end: addDays(new Date(), 30), count: 50, statusWeights: { CONFIRMED: 0.5, PENDING: 0.5 } },
  ];

  let appointmentId = 1;

  // Generate appointments
  for (const range of dateRanges) {
    for (let i = 0; i < range.count; i++) {
      const service = allServices[Math.floor(Math.random() * allServices.length)];
      const date = getRandomDate(range.start, range.end);
      const { startTime, endTime } = getRandomTimeSlot(service.duration);

      // Determine status based on weights
      const rand = Math.random();
      let status = 'PENDING';
      let cumulative = 0;
      for (const [s, weight] of Object.entries(range.statusWeights)) {
        cumulative += weight;
        if (rand < cumulative) {
          status = s;
          break;
        }
      }

      // 80% assigned, 20% unassigned
      const staffId = Math.random() < 0.8
        ? staffIds[Math.floor(Math.random() * staffIds.length)]
        : null;

      appointments.push({
        id: `appt-${appointmentId++}`,
        date,
        startTime,
        endTime,
        userName: getRandomThaiName(),
        userPhone: getRandomPhoneNumber(),
        description: getRandomDescription(),
        status,
        serviceId: service.id,
        staffId,
      });
    }
  }

  await prisma.appointment.createMany({ data: appointments });
  console.log(`✅ Created ${appointments.length} appointments`);

  // Generate staff availability records
  await prisma.staffAvailability.deleteMany({});
  const unavailability = [];
  let availId = 1;

  // Recurring records (lunch breaks, meetings)
  for (const staffId of staffIds) {
    // Lunch break
    unavailability.push({
      id: `avail-${availId++}`,
      staffId,
      date: new Date(),
      startTime: '12:00',
      endTime: '13:00',
      reason: 'Lunch break',
      recurring: true,
    });

    // Weekly meeting (Mondays)
    unavailability.push({
      id: `avail-${availId++}`,
      staffId,
      date: new Date(),
      startTime: '14:00',
      endTime: '15:00',
      reason: 'Team meeting',
      recurring: true,
    });
  }

  // One-time records (sick leave, training)
  for (let i = 0; i < 10; i++) {
    const staffId = staffIds[Math.floor(Math.random() * staffIds.length)];
    const date = getRandomDate(subDays(new Date(), 30), addDays(new Date(), 30));
    const { startTime, endTime } = getRandomTimeSlot(120); // 2-hour blocks

    unavailability.push({
      id: `avail-${availId++}`,
      staffId,
      date,
      startTime,
      endTime,
      reason: ['Training session', 'Personal appointment', 'Sick leave'][Math.floor(Math.random() * 3)],
      recurring: false,
    });
  }

  await prisma.staffAvailability.createMany({ data: unavailability });
  console.log(`✅ Created ${unavailability.length} availability records`);

  // Generate audit logs
  const auditLogs = [];
  const createdAppointments = await prisma.appointment.findMany({
    include: { staff: true },
  });

  for (const appt of createdAppointments) {
    // CREATE event
    auditLogs.push({
      entityType: 'APPOINTMENT',
      entityId: appt.id,
      action: 'CREATE',
      performedBy: 'SYSTEM',
      performedByName: 'System',
      createdAt: new Date(appt.date.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
      fieldChanged: '',
      oldValue: '',
      newValue: '',
    });

    // ASSIGNED event (if has staff)
    if (appt.staffId) {
      auditLogs.push({
        entityType: 'APPOINTMENT',
        entityId: appt.id,
        action: 'ASSIGNED',
        performedBy: admin.id,
        performedByName: 'Admin User',
        createdAt: new Date(appt.date.getTime() - 6 * 24 * 60 * 60 * 1000),
        fieldChanged: 'staffId',
        oldValue: '',
        newValue: appt.staffId,
      });

      // REASSIGNED event (30% chance)
      if (Math.random() < 0.3) {
        const newStaffId = staffIds[Math.floor(Math.random() * staffIds.length)];
        auditLogs.push({
          entityType: 'APPOINTMENT',
          entityId: appt.id,
          action: 'REASSIGNED',
          performedBy: admin.id,
          performedByName: 'Admin User',
          createdAt: new Date(appt.date.getTime() - 3 * 24 * 60 * 60 * 1000),
          fieldChanged: 'staffId',
          oldValue: appt.staffId,
          newValue: newStaffId,
        });
      }
    }

    // STATUS_CHANGE events
    if (appt.status === 'COMPLETED') {
      auditLogs.push(
        {
          entityType: 'APPOINTMENT',
          entityId: appt.id,
          action: 'STATUS_CHANGE',
          performedBy: admin.id,
          performedByName: 'Admin User',
          createdAt: new Date(appt.date.getTime() - 2 * 24 * 60 * 60 * 1000),
          fieldChanged: 'status',
          oldValue: 'PENDING',
          newValue: 'CONFIRMED',
        },
        {
          entityType: 'APPOINTMENT',
          entityId: appt.id,
          action: 'STATUS_CHANGE',
          performedBy: appt.staffId || 'SYSTEM',
          performedByName: appt.staff?.name || 'System',
          createdAt: appt.date,
          fieldChanged: 'status',
          oldValue: 'CONFIRMED',
          newValue: 'COMPLETED',
        }
      );
    }

    if (appt.status === 'CANCELLED') {
      auditLogs.push({
        entityType: 'APPOINTMENT',
        entityId: appt.id,
        action: 'STATUS_CHANGE',
        performedBy: admin.id,
        performedByName: 'Admin User',
        createdAt: new Date(appt.date.getTime() - 1 * 24 * 60 * 60 * 1000),
        fieldChanged: 'status',
        oldValue: 'PENDING',
        newValue: 'CANCELLED',
      });
    }
  }

  await prisma.auditLog.createMany({ data: auditLogs });
  console.log(`✅ Created ${auditLogs.length} audit logs`);

  // Generate appointment history
  const history = [];

  for (const log of auditLogs) {
    const appointment = createdAppointments.find(a => a.id === log.entityId);
    if (!appointment) continue;

    const historyRecord: any = {
      appointmentId: log.entityId,
      action: log.action,
      performedBy: log.performedBy,
      performedByName: log.performedByName,
      createdAt: log.createdAt,
    };

    // Add rich fields based on action
    if (log.action === 'ASSIGNED' || log.action === 'REASSIGNED') {
      const staff = await prisma.user.findUnique({ where: { id: log.newValue } });
      historyRecord.newStaffId = log.newValue;
      historyRecord.newStaffName = staff?.name || 'Unknown';

      if (log.action === 'REASSIGNED' && log.oldValue) {
        const oldStaff = await prisma.user.findUnique({ where: { id: log.oldValue } });
        historyRecord.oldStaffId = log.oldValue;
        historyRecord.oldStaffName = oldStaff?.name || 'Unknown';
        historyRecord.notes = `Reassigned from ${oldStaff?.name} to ${staff?.name}`;
      } else {
        historyRecord.notes = `Assigned to ${staff?.name}`;
      }
    }

    if (log.action === 'STATUS_CHANGE') {
      historyRecord.oldStatus = log.oldValue;
      historyRecord.newStatus = log.newValue;
      historyRecord.notes = `Status changed: ${log.oldValue} → ${log.newValue}`;
    }

    if (log.action === 'CREATE') {
      historyRecord.notes = 'Appointment created';
    }

    history.push(historyRecord);
  }

  await prisma.appointmentHistory.createMany({ data: history });
  console.log(`✅ Created ${history.length} history records`);

  // Final summary
  console.log('\n🎉 Mock data generation complete!');
  console.log('Summary:');
  console.log(`  - Users: ${allStaff.length}`);
  console.log(`  - Services: ${allServices.length}`);
  console.log(`  - Appointments: ${appointments.length}`);
  console.log(`  - Staff Availability: ${unavailability.length}`);
  console.log(`  - Audit Logs: ${auditLogs.length}`);
  console.log(`  - History Records: ${history.length}`);
  console.log(`\nTotal records: ~${allStaff.length + allServices.length + appointments.length + unavailability.length + auditLogs.length + history.length}`);

  console.log("\n📝 Login credentials:");
  console.log("Admin: admin@cc.prachinburi.ac.th / admin123");
  console.log("Staff: staff1@cc.prachinburi.ac.th / staff123");
  console.log("Staff: staff2@cc.prachinburi.ac.th / staff123");
  console.log("Staff: somchai@test.com / password123");
  console.log("Staff: suda@test.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
