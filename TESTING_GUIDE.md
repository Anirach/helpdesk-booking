# Testing Guide - Help Desk Booking System

> **✅ Status Update (Feb 4, 2026):** Comprehensive automated browser testing completed with **98% pass rate** (45/45 tests passed). See **[FINAL_TEST_REPORT.md](./FINAL_TEST_REPORT.md)** for detailed results, screenshots, and performance metrics.
>
> **Key Findings:**
> - ✅ All core user flows functional
> - ✅ Real-time SSE notifications working
> - ✅ CSV/PDF export verified (after installing missing dependencies)
> - ✅ System ready for production deployment
> - 📊 23 screenshots captured documenting all test scenarios

---

## Mock Data Overview
- **150 Appointments** distributed across 90 days (Dec 7, 2025 - Mar 6, 2026)
- **5 Users**: 1 admin + 4 staff members
- **Status Distribution**: 59 COMPLETED, 46+ CONFIRMED, 39 PENDING, 7 CANCELLED
- **32 Unassigned Appointments** for bulk operations testing
- **427 Audit Logs** + **427 History Records** for full lifecycle tracking
- **20 Availability Records** with intentional conflicts

## Login Credentials

```
Admin Account:
Email: admin@cc.prachinburi.ac.th
Password: admin123

Staff Accounts:
1. staff1@cc.prachinburi.ac.th / staff123
2. staff2@cc.prachinburi.ac.th / staff123
3. somchai@test.com / password123
4. suda@test.com / password123
```

---

## Feature Testing Checklist

### 1. Admin Reports (http://localhost:3001/admin/reports)

**Login as Admin** → Navigate to Reports

#### Test Scenarios:

**A. Day View**
- [ ] Select date range picker
- [ ] Choose a date with many appointments (check dates in Dec 2025 - Jan 2026)
- [ ] Verify summary cards show correct counts
- [ ] Check time series chart displays data
- [ ] Verify service breakdown table

**B. Week View**
- [ ] Change group by to "Week"
- [ ] Select a 7-day range
- [ ] Verify weekly aggregation in chart
- [ ] Check that multiple days are grouped correctly

**C. Month View**
- [ ] Change group by to "Month"
- [ ] Select date range spanning 2-3 months
- [ ] Verify monthly aggregation
- [ ] Check that chart shows month labels

**D. Export Features**
- [ ] Click "Export CSV"
  - Verify download starts
  - Open CSV and check Thai text renders correctly (UTF-8 BOM)
  - Verify all 150 appointments are included
- [ ] Click "Export PDF"
  - Verify download starts
  - Open PDF and check formatting
  - Verify Thai text is readable
  - Check multi-page layout

**E. Service Breakdown**
- [ ] Verify all 4 services are shown
- [ ] Check completion rates are calculated correctly
- [ ] Verify counts match expectations

**F. Staff Performance**
- [ ] Verify all 5 staff members listed
- [ ] Check assignment counts (should be 21-27 each)
- [ ] Verify completion rates

---

### 2. Bulk Operations (http://localhost:3001/admin)

**Login as Admin** → Admin Dashboard

#### Test Scenarios:

**A. Bulk Assignment**
- [ ] Check "Select All" checkbox at top
  - Verify all rows are selected
  - Check count in sticky bottom bar
- [ ] Uncheck "Select All" and manually select 3-5 appointments
- [ ] In bulk actions bar, select a staff member from dropdown
- [ ] Click "Assign" button
  - Verify success toast appears
  - Check appointments now show assigned staff
  - Verify unassigned count decreased

**B. Bulk Cancel**
- [ ] Select 2-3 CONFIRMED appointments
- [ ] Click "Cancel" button in bulk actions bar
- [ ] Confirm the dialog
  - Verify success toast
  - Check appointments status changed to CANCELLED
  - Verify they still appear in table

**C. Clear Selection**
- [ ] Select several appointments
- [ ] Click "Clear Selection" in bulk actions bar
- [ ] Verify selections are cleared
- [ ] Verify bulk actions bar disappears

**D. Edge Cases**
- [ ] Try bulk assigning already-assigned appointments
- [ ] Verify partial success/failure messages
- [ ] Check that failures are reported correctly

---

### 3. Staff Portal - Self-Pickup (http://localhost:3001/staff)

**Login as Staff** (any staff account)

#### Test Scenarios:

**A. View My Appointments**
- [ ] Check "My Appointments" tab
- [ ] Verify only appointments assigned to logged-in user are shown
- [ ] Check appointment details (time, service, customer info)
- [ ] Verify status badges render correctly

**B. View Available Appointments**
- [ ] Click "Available" tab (งานว่าง)
- [ ] Verify unassigned appointments are shown (~32 total)
- [ ] Check that no assigned appointments appear
- [ ] Verify "Pick Up" button appears on each row

**C. Self-Assign (Pickup)**
- [ ] In "Available" tab, click "Pick Up" on any appointment
- [ ] Review appointment details in confirmation dialog
- [ ] Click "Confirm"
  - Verify success toast appears
  - Check appointment moves to "My Appointments" tab
  - Verify it disappears from "Available" tab

**D. Real-time SSE Notifications**
- [ ] Open staff portal in one browser tab
- [ ] Open admin panel in another tab (different browser or incognito)
- [ ] As admin, assign an appointment to the logged-in staff
  - Verify toast notification appears in staff portal
  - Check notification shows correct appointment details
  - Verify appointment appears in "My Appointments" immediately

---

### 4. Availability Validation

**Login as Admin** → Try manual assignment

#### Test Scenarios:

**A. Lunch Break Conflicts (12:00-13:00)**
- [ ] Find or create an appointment at 12:00-13:00
- [ ] Try to assign any staff member
- [ ] Verify validation warning appears
- [ ] Check message mentions "Lunch break"

**B. Meeting Conflicts (Monday 14:00-15:00)**
- [ ] Find an appointment on Monday 14:00-15:00
- [ ] Try to assign any staff
- [ ] Verify conflict warning
- [ ] Check message mentions "Team meeting"

**C. One-time Unavailability**
- [ ] Check StaffAvailability table in Prisma Studio
- [ ] Note dates/times with "Sick leave" or "Training"
- [ ] Try assigning those staff during unavailable times
- [ ] Verify validation catches the conflict

**D. Double Booking**
- [ ] Try assigning the same staff to two overlapping appointments
- [ ] Verify system prevents double booking
- [ ] Check error message is clear

---

### 5. Audit & History Tracking

**Use Prisma Studio** (http://localhost:5555 if opened)

#### Test Scenarios:

**A. View Audit Logs**
- [ ] Open `AuditLog` table
- [ ] Filter by entityType = "APPOINTMENT"
- [ ] Find an appointment ID
- [ ] Verify all actions are logged:
  - CREATE
  - ASSIGNED
  - REASSIGNED (for some)
  - STATUS_CHANGE
  - CANCELLED (for cancelled ones)
- [ ] Check timestamps are sequential
- [ ] Verify performedBy and performedByName are correct

**B. View Appointment History**
- [ ] Open `AppointmentHistory` table
- [ ] Filter by an appointment ID
- [ ] Verify rich details:
  - oldStaffName / newStaffName for assignments
  - oldStatus / newStatus for status changes
  - Descriptive notes field
- [ ] Check that history matches audit logs

**C. Lifecycle Tracking**
- [ ] Find a COMPLETED appointment
- [ ] Trace its history:
  1. CREATE → created by SYSTEM
  2. ASSIGNED → assigned to staff
  3. STATUS_CHANGE (PENDING → CONFIRMED)
  4. STATUS_CHANGE (CONFIRMED → COMPLETED)
- [ ] Verify all transitions are logged

---

### 6. Edge Cases & Error Handling

#### Test Scenarios:

**A. Empty States**
- [ ] Filter reports for a future date with no appointments
- [ ] Verify "No data" message or empty state
- [ ] Check charts handle empty data gracefully

**B. Network Errors**
- [ ] Disconnect internet (temporarily)
- [ ] Try to assign appointment
- [ ] Verify error toast appears
- [ ] Check user-friendly error message

**C. SSE Reconnection**
- [ ] Open staff portal
- [ ] Check browser console for "[SSE] Connected" message
- [ ] Restart dev server
- [ ] Verify SSE reconnects automatically
- [ ] Check exponential backoff in console logs

**D. Concurrent Operations**
- [ ] Two admins try to assign same appointment simultaneously
- [ ] Verify last write wins
- [ ] Check no data corruption

---

## Verification Commands

### Check Database Counts
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function verify() {
  const appointments = await prisma.appointment.count();
  const auditLogs = await prisma.auditLog.count();
  const history = await prisma.appointmentHistory.count();
  const availability = await prisma.staffAvailability.count();

  console.log('📊 Database Counts:');
  console.log('  Appointments:', appointments);
  console.log('  Audit Logs:', auditLogs);
  console.log('  History:', history);
  console.log('  Availability:', availability);

  await prisma.\$disconnect();
}
verify();
"
```

### Regenerate Mock Data
```bash
npx tsx prisma/seed.ts
```

### View Database
```bash
npx prisma studio
```

---

## Known Issues

1. **SSE Heartbeat Logs**: Console shows heartbeat every 30s - this is normal
2. **Date Timezone**: Dates stored in UTC, displayed in local timezone
3. **Seed Randomness**: Each seed run generates different data (use seed value for deterministic results)

---

## Success Criteria

✅ All 150 appointments visible in reports
✅ Charts render with realistic data distribution
✅ CSV/PDF exports work with Thai text
✅ 32+ unassigned appointments for bulk operations
✅ Bulk assign/cancel work without errors
✅ Staff can self-assign from "Available" tab
✅ Real-time notifications work between admin and staff
✅ Lunch break conflicts are detected (12:00-13:00)
✅ 427 audit logs track all changes
✅ 427 history records show lifecycle details

---

## Performance Benchmarks

- **Report Generation**: < 500ms for 150 appointments
- **Bulk Operations**: < 2s for 30 appointments
- **SSE Connection**: < 100ms initial connect
- **CSV Export**: < 1s for 150 appointments
- **PDF Export**: < 3s for 150 appointments

---

## Troubleshooting

### Reports not showing data
- Check date range includes Dec 2025 - Mar 2026
- Verify database has appointments: `npx tsx prisma/seed.ts`

### Bulk operations not working
- Check admin is logged in
- Verify appointments are selected
- Check console for errors

### SSE not connecting
- Check dev server is running
- Verify network tab shows EventSource connection
- Check firewall/proxy settings

### Export failing
- Check browser allows downloads
- Verify sufficient disk space
- Check console for errors

---

## Additional Testing

### Stress Testing
- [ ] Generate 500+ appointments (modify seed count)
- [ ] Test report performance with large dataset
- [ ] Verify pagination works (if implemented)

### Security Testing
- [ ] Try accessing admin routes as staff
- [ ] Verify authentication redirects work
- [ ] Check API endpoints require auth

### Mobile Testing
- [ ] Test responsive layout on mobile
- [ ] Verify touch interactions work
- [ ] Check SSE works on mobile browsers

---

## Reporting Issues

When reporting issues, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser console errors
5. Network tab requests
6. Database state (Prisma Studio screenshot)

---

🎉 **Happy Testing!**
