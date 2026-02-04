# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Help Desk Appointment & Availability System for Prachinburi Computer Center. A Next.js 16 application using App Router for appointment booking with real-time staff availability tracking.

**Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Prisma ORM (SQLite), Tailwind CSS 4, shadcn/ui, bcryptjs

## Development Commands

```bash
# Development server
npm run dev                    # Start dev server at http://localhost:3000

# Database operations
npx prisma db push             # Sync schema to database (use for dev)
npx prisma migrate dev         # Create and apply migration (use for prod)
npx prisma studio              # Open database GUI at http://localhost:5555
npx tsx prisma/seed.ts         # Seed demo data (admin & staff accounts)
npx prisma generate            # Regenerate Prisma Client after schema changes

# Build & Lint
npm run build                  # Production build
npm start                      # Start production server
npm run lint                   # Run ESLint
```

## Architecture Overview

### Database Models (Prisma Schema)

Five core models with specific relationships:

- **User**: Staff/Admin accounts with bcrypt hashed passwords. Has many-to-many relation with Services, one-to-many with Appointments and StaffAvailability
- **Service**: Service types (Hardware, Software, Network, Account) with duration in minutes
- **Appointment**: Bookings with date/time slots, linked to Service and optionally to Staff (assigned later)
- **StaffAvailability**: Unavailability periods (staff marks themselves unavailable with reason/return time)
- **Settings**: Global working hours (08:30-16:30), slot duration (30 min), holidays (JSON array)

### Route Structure

```
src/app/
├── page.tsx                          # Public dashboard (no auth required)
├── book/
│   ├── page.tsx                      # Booking calendar & form
│   └── [id]/page.tsx                 # Confirmation page
├── staff/
│   ├── login/page.tsx                # Staff/Admin login
│   └── page.tsx                      # Staff portal (protected)
├── admin/page.tsx                    # Admin panel (protected)
└── api/
    ├── dashboard/route.ts            # GET: Real-time availability status
    ├── services/route.ts             # GET: List all services
    ├── slots/route.ts                # GET: Available time slots for date + service
    ├── appointments/route.ts         # GET/POST: CRUD appointments
    ├── staff/route.ts                # GET: List staff members
    └── auth/login/route.ts           # POST: Authenticate staff/admin
```

### Authentication Pattern

Simple bcrypt-based auth (not using NextAuth middleware):
- Login: [/api/auth/login/route.ts](src/app/api/auth/login/route.ts) validates credentials, returns user object without password
- Client stores user in localStorage/state
- Protected routes check auth state client-side (no server middleware)
- Password hashing uses bcryptjs with 10 rounds

### Dashboard Availability Logic

The [/api/dashboard/route.ts](src/app/api/dashboard/route.ts) calculates real-time status:

1. Fetch all STAFF role users
2. Query StaffAvailability for today where current time is between startTime-endTime
3. Calculate availableStaff = total - currently unavailable
4. Status logic (only during working hours 08:30-16:30):
   - `closed`: availableStaff === 0
   - `limited`: 0 < availableStaff < totalStaff
   - `open`: availableStaff === totalStaff
5. Outside working hours: always `closed`

### Time Slot Generation

[/api/slots/route.ts](src/app/api/slots/route.ts) generates 30-minute intervals:
- Working hours: 08:30 - 16:30 (hardcoded, should match Settings table)
- Checks existing appointments for the date (status != CANCELLED)
- Returns array of `{time, available}` objects
- **Note**: Current implementation doesn't account for service duration or staff capacity

## Key Patterns & Conventions

### Prisma Client Usage

Singleton pattern in [src/lib/db.ts](src/lib/db.ts):
```typescript
import { prisma } from "@/lib/db";
```
Don't create new PrismaClient instances in route handlers.

### Date Handling

Dates stored as DateTime in Prisma, times as strings (HH:MM format):
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);              // Normalize to midnight
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

// Query appointments for specific date
where: { date: { gte: today, lt: tomorrow } }
```

### API Route Responses

Consistent error handling pattern:
```typescript
try {
  // logic
  return NextResponse.json({ data });
} catch (error) {
  console.error("Context error:", error);
  return NextResponse.json({ error: "Message" }, { status: 500 });
}
```

### shadcn/ui Components

Components in [src/components/ui/](src/components/ui/) are managed by shadcn CLI:
```bash
npx shadcn@latest add button    # Add new component
```

Configuration in [components.json](components.json):
- Style: "new-york"
- Base color: "neutral"
- Icon library: lucide-react
- Aliases: @/components, @/lib/utils, @/components/ui

### Path Aliases

TypeScript path mapping in [tsconfig.json](tsconfig.json):
```typescript
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
```
`@/*` maps to `./src/*`

## Demo Accounts (After Seeding)

| Role  | Email                           | Password  |
|-------|---------------------------------|-----------|
| Admin | admin@cc.prachinburi.ac.th     | admin123  |
| Staff | staff1@cc.prachinburi.ac.th    | staff123  |
| Staff | staff2@cc.prachinburi.ac.th    | staff123  |

## Known Limitations & TODOs

1. **No staff assignment algorithm**: Appointments created without staffId, needs manual assignment
2. **Working hours hardcoded**: API routes use hardcoded 08:30-16:30 instead of Settings table
3. **Slot generation ignores service duration**: 30-min slots don't account for 45-min Network service
4. **No staff capacity check**: Multiple appointments can book same staff at same time
5. **Client-side auth only**: No server middleware protection, anyone can access API routes directly
6. **No timezone handling**: Assumes local timezone
7. **SQLite in production**: Should migrate to PostgreSQL/MySQL for production deployment

## Adding New API Routes

1. Create route handler: `src/app/api/[route]/route.ts`
2. Export async functions: GET, POST, PUT, DELETE, PATCH
3. Use prisma singleton from `@/lib/db`
4. Follow error handling pattern with try/catch
5. Return NextResponse.json() for all responses

Example:
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const data = await prisma.model.findMany();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

## Prisma Schema Changes

After modifying [prisma/schema.prisma](prisma/schema.prisma):

```bash
npx prisma db push        # Apply changes to dev database (no migration history)
npx prisma generate       # Regenerate TypeScript types
```

For production, use migrations:
```bash
npx prisma migrate dev --name description_of_change
```
