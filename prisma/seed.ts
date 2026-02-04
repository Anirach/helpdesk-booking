import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

  console.log("✅ Seed data created successfully");
  console.log("Admin: admin@cc.prachinburi.ac.th / admin123");
  console.log("Staff: staff1@cc.prachinburi.ac.th / staff123");
  console.log("Staff: staff2@cc.prachinburi.ac.th / staff123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
