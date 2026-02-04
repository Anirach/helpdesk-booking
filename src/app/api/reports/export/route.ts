import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parse } from "json2csv";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { startOfDay, endOfDay, format, parseISO } from "date-fns";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const formatType = searchParams.get("format") || "csv"; // csv or pdf

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Fetch appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay(start),
          lte: endOfDay(end),
        },
      },
      include: {
        service: true,
        staff: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    if (formatType === "csv") {
      return exportCSV(appointments, start, end);
    } else if (formatType === "pdf") {
      return exportPDF(appointments, start, end);
    } else {
      return NextResponse.json(
        { error: "Invalid format. Use 'csv' or 'pdf'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}

function exportCSV(appointments: any[], start: Date, end: Date) {
  try {
    // Prepare data for CSV
    const data = appointments.map((apt) => ({
      "วันที่": format(new Date(apt.date), "dd/MM/yyyy"),
      "เวลาเริ่ม": apt.startTime,
      "เวลาสิ้นสุด": apt.endTime,
      "ผู้จอง": apt.userName,
      "อีเมล": apt.userEmail || "-",
      "เบอร์โทร": apt.userPhone,
      "บริการ": apt.service.nameTh,
      "เจ้าหน้าที่": apt.staff?.name || "ยังไม่มอบหมาย",
      "สถานะ": getStatusLabel(apt.status),
      "ปัญหา": apt.description,
      "วันที่สร้าง": format(new Date(apt.createdAt), "dd/MM/yyyy HH:mm"),
    }));

    // Convert to CSV with UTF-8 BOM for Thai characters
    const csv = parse(data, {
      delimiter: ",",
      quote: '"',
      withBOM: true,
    });

    // Add UTF-8 BOM
    const csvWithBOM = "\uFEFF" + csv;

    // Create response with proper headers
    const filename = `appointments_${format(start, "yyyyMMdd")}_${format(end, "yyyyMMdd")}.csv`;

    return new Response(csvWithBOM, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);
    throw error;
  }
}

function exportPDF(appointments: any[], start: Date, end: Date) {
  try {
    const doc = new jsPDF();

    // Add Thai font support (using default fonts for now)
    // Title
    doc.setFontSize(16);
    doc.text("Appointment Report", 14, 15);

    // Date range
    doc.setFontSize(10);
    doc.text(
      `Period: ${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")}`,
      14,
      22
    );

    // Summary statistics
    const summary = {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "PENDING").length,
      completed: appointments.filter((a) => a.status === "COMPLETED").length,
      cancelled: appointments.filter((a) => a.status === "CANCELLED").length,
    };

    doc.text(`Total Appointments: ${summary.total}`, 14, 29);
    doc.text(
      `Completed: ${summary.completed} | Pending: ${summary.pending} | Cancelled: ${summary.cancelled}`,
      14,
      34
    );

    // Appointments table
    const tableData = appointments.map((apt) => [
      format(new Date(apt.date), "dd/MM/yy"),
      apt.startTime,
      apt.userName,
      apt.service.nameTh,
      apt.staff?.name || "N/A",
      getStatusLabel(apt.status),
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Date", "Time", "Customer", "Service", "Staff", "Status"]],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 14, right: 14 },
    });

    // Generate PDF buffer
    const pdfBuffer = doc.output("arraybuffer");
    const filename = `appointments_${format(start, "yyyyMMdd")}_${format(end, "yyyyMMdd")}.pdf`;

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    throw error;
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "รอยืนยัน",
    CONFIRMED: "ยืนยันแล้ว",
    COMPLETED: "เสร็จสิ้น",
    CANCELLED: "ยกเลิก",
  };
  return labels[status] || status;
}
