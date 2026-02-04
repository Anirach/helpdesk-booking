import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const staff = await prisma.user.findMany({
      where: { role: { in: ["STAFF", "ADMIN"] } },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}
