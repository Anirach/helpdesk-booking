# การ Export ข้อมูล / Data Export

**คู่มือนี้เหมาะสำหรับ**: Admin ที่ต้องการ export รายงานและข้อมูล

---

## ภาพรวม / Overview

ระบบรองรับการ export ข้อมูล**ในหน้า Reports**  2 รูปแบบ:
1. **CSV** - สำหรับนำไปวิเคราะห์ต่อ
2. **PDF** - สำหรับพิมพ์และนำเสนอ

**เข้าถึง**: `/admin/reports` → ปุ่ม Export

---

## CSV Export / การ Export CSV

### คลิกปุ่ม "Export CSV"

**ตำแหน่ง**: หน้า Reports ด้านบนขวา

**ข้อมูลที่ Export**:
1. **Service Breakdown Table** - วิเคราะห์ตามบริการ
2. **Staff Performance Table** - ประสิทธิภาพเจ้าหน้าที่

---

### รูปแบบไฟล์ CSV / CSV File Format

**Encoding**: UTF-8 BOM
- รองรับภาษาไทย
- เปิดได้ใน Excel โดยไม่มีปัญหาตัวอักษร

**Delimiter**: Comma (,)

**Structure**:
```csv
Section,Service/Staff,Total,Completed,Pending,Cancelled,Completion Rate,Avg Time
Service Breakdown,Hardware,60,52,5,3,87%,32 min
Service Breakdown,Software,48,40,6,2,83%,28 min
Service Breakdown,Network,35,28,5,2,80%,47 min
Service Breakdown,Account,13,10,2,1,77%,12 min
Staff Performance,สมชาย,45,42,2,1,93%,28 min
Staff Performance,สมหญิง,38,35,2,1,92%,30 min
...
```

---

### ชื่อไฟล์ / File Naming

**รูปแบบ**: `appointments-report-[start-date]-[end-date].csv`

**ตัวอย่าง**: `appointments-report-2026-01-01-2026-01-31.csv`

**ความหมาย**:
- `appointments-report` - ประเภทรายงาน
- `2026-01-01` - วันที่เริ่มต้น
- `2026-01-31` - วันที่สิ้นสุด
- `.csv` - นามสกุลไฟล์

---

### การใช้งาน CSV / CSV Usage

**1. เปิดใน Microsoft Excel**:
1. ดาวน์โหลดไฟล์ CSV
2. Double-click เพื่อเปิดใน Excel
3. ข้อมูลจะแสดงในตารางพร้อมใช้งาน

**2. วิเคราะห์เพิ่มเติม**:
- สร้าง Pivot Table
- สร้างกราฟเพิ่มเติม
- คำนวณค่าเฉลี่ย, ผลรวม

**3. นำเข้าระบบอื่น**:
- Import เข้า Google Sheets
- Import เข้าระบบ BI (Business Intelligence)
- Import เข้า Database

---

## PDF Export / การ Export PDF

### คลิกปุ่ม "Export PDF"

**ตำแหน่ง**: หน้า Reports ด้านบนขวา

**ข้อมูลที่ Export**:
1. **Header** - ชื่อรายงาน, ช่วงเวลา, วันที่สร้าง
2. **Summary Cards** - Total, Completed, Pending, Cancelled
3. **Time Series Chart** - กราฟแนวโน้ม (ภาพ)
4. **Service Breakdown Table** - ตารางวิเคราะห์บริการ
5. **Staff Performance Table** - ตารางประสิทธิภาพ
6. **Footer** - หมายเลขหน้า, ข้อมูลระบบ

---

### รูปแบบไฟล์ PDF / PDF File Format

**Page Size**: A4
**Orientation**: Portrait (แนวตั้ง)
**Font**: รองรับภาษาไทย

**Layout**:
```
┌─────────────────────────────────────┐
│ Prachinburi Help Desk - Report      │
│ Period: 2026-01-01 to 2026-01-31    │
├─────────────────────────────────────┤
│                                      │
│ SUMMARY                              │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│ │Total │ │Comp. │ │Pend. │ │Canc. ││
│ │ 156  │ │ 128  │ │  18  │ │  10  ││
│ └──────┘ └──────┘ └──────┘ └──────┘│
│                                      │
│ APPOINTMENTS OVER TIME               │
│ [Chart Image]                        │
│                                      │
│ SERVICE BREAKDOWN                    │
│ [Table]                              │
│                                      │
│ STAFF PERFORMANCE                    │
│ [Table]                              │
│                                      │
├─────────────────────────────────────┤
│ Page 1 of 2                          │
└─────────────────────────────────────┘
```

---

### ชื่อไฟล์ / File Naming

**รูปแบบ**: `appointments-report-[start-date]-[end-date].pdf`

**ตัวอย่าง**: `appointments-report-2026-01-01-2026-01-31.pdf`

---

### การใช้งาน PDF / PDF Usage

**1. พิมพ์เพื่อนำเสนอ**:
- เปิดไฟล์ PDF
- คลิก Print
- พิมพ์เพื่อนำเสนอผู้บริหาร

**2. แนบในอีเมล**:
- แนบไฟล์ PDF ในอีเมลรายงานประจำเดือน
- ส่งให้ผู้บริหารทบทวน

**3. เก็บเป็นเอกสาร**:
- บันทึกไฟล์ในโฟลเดอร์รายงานประจำเดือน
- ใช้เป็นเอกสารอ้างอิงในอนาคต

---

## เปรียบเทียบ CSV vs PDF / CSV vs PDF Comparison

| คุณสมบัติ | CSV | PDF |
|-----------|-----|-----|
| **ขนาดไฟล์** | เล็ก (~ 10-50 KB) | ใหญ่กว่า (~ 100-500 KB) |
| **เนื้อหา** | ตารางข้อมูล | รายงานฉบับเต็ม + กราฟ |
| **การใช้งาน** | วิเคราะห์เพิ่มเติม | พิมพ์, นำเสนอ |
| **แก้ไขได้** | ✅ ได้ (Excel) | ❌ ไม่ได้ |
| **กราฟ** | ❌ ไม่มี | ✅ มี (ภาพ) |
| **เหมาะสำหรับ** | Data analysis | Presentation |

---

## ตัวอย่างการใช้งาน / Example Usage

### สถานการณ์ 1: รายงานประจำเดือนสำหรับผู้บริหาร

**วัตถุประสงค์**: นำเสนอผลงานเดือนมกราคม

**ขั้นตอน**:
1. ไปหน้า Reports
2. เลือกช่วงเวลา: 2026-01-01 ถึง 2026-01-31
3. Grouping: Weekly
4. คลิก **Export PDF**
5. ดาวน์โหลดไฟล์ `appointments-report-2026-01-01-2026-01-31.pdf`
6. พิมพ์ไฟล์
7. นำเสนอในการประชุม

---

### สถานการณ์ 2: วิเคราะห์แนวโน้มใน Excel

**วัตถุประสงค์**: สร้าง Pivot Table วิเคราะห์ข้อมูล

**ขั้นตอน**:
1. ไปหน้า Reports
2. เลือกช่วงเวลา: 3 เดือนล่าสุด
3. Grouping: Monthly
4. คลิก **Export CSV**
5. ดาวน์โหลดไฟล์
6. เปิดใน Excel
7. สร้าง Pivot Table:
   - Row: Service
   - Column: Month
   - Values: Sum of Total
8. สร้างกราฟ Bar Chart

---

## Best Practices / แนวทางที่ดี

### ✅ ตั้งชื่อไฟล์ให้เข้าใจง่าย

**ไม่ดี**: `report.csv`, `data-feb.pdf`
**ดี**: `appointments-report-2026-02-01-2026-02-28.csv`

**เหตุผล**: ตั้งชื่อให้ชัดเจน รู้เลยว่าเป็นข้อมูลช่วงไหน

---

### ✅ Export เป็นประจำ

**ทุกสัปดาห์**: Export CSV เพื่อเก็บข้อมูล
**ทุกเดือน**: Export PDF เพื่อนำเสนอ
**ทุกไตรมาส**: Export CSV เพื่อวิเคราะห์แนวโน้ม

---

### ✅ เก็บไฟล์เป็นระเบียบ

**โครงสร้างโฟลเดอร์**:
```
Reports/
├── 2026/
│   ├── 01-January/
│   │   ├── appointments-report-2026-01-01-2026-01-31.pdf
│   │   └── appointments-report-2026-01-01-2026-01-31.csv
│   ├── 02-February/
│   │   ├── appointments-report-2026-02-01-2026-02-28.pdf
│   │   └── appointments-report-2026-02-01-2026-02-28.csv
│   ...
```

---

### ✅ ใช้ CSV สำหรับวิเคราะห์, PDF สำหรับนำเสนอ

- **CSV**: นำไปวิเคราะห์ลึกใน Excel
- **PDF**: นำเสนอผู้บริหาร, พิมพ์แนบเอกสาร

---

## ข้อจำกัด / Limitations

### ขนาดข้อมูล / Data Size

**ไม่จำกัด**: สามารถ export ข้อมูลกี่งานก็ได้

**แนะนำ**: ถ้ามีข้อมูลมาก (> 1,000 งาน) → แบ่งช่วงเวลา
- แทนที่จะ export ทั้งปี
- Export ทีละไตรมาส (3 เดือน)

---

### ช่วงเวลา / Date Range

**สูงสุด**: 1 ปี (12 เดือน)

**ถ้าต้องการข้อมูลหลายปี**:
- Export ทีละปี
- รวมไฟล์ใน Excel

---

## Troubleshooting / การแก้ปัญหา

**ปัญหา**: ไฟล์ CSV เปิดใน Excel แล้วภาษาไทยเป็นอักษรแปลกๆ

**สาเหตุ**: Excel ไม่รู้จัก UTF-8

**วิธีแก้**:
1. เปิด Excel
2. ไปที่ Data → From Text/CSV
3. เลือกไฟล์ CSV
4. File Origin: เลือก "UTF-8"
5. คลิก Load

---

**ปัญหา**: ปุ่ม Export ไม่ทำงาน

**วิธีแก้**:
1. รีเฟรชหน้าจอ
2. เช็คว่ามีข้อมูลในช่วงเวลาที่เลือกหรือไม่
3. เช็คการเชื่อมต่ออินเทอร์เน็ต

---

**⬅️ ก่อนหน้า**: [46-Reports-Analytics.md](46-Reports-Analytics.md) | **➡️ ถัดไป**: [48-Audit-History.md](48-Audit-History.md)
