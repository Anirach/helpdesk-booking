# 🖥️ Help Desk Appointment & Availability System

ระบบจองคิวและตรวจสอบสถานะเจ้าหน้าที่ สำหรับศูนย์คอมพิวเตอร์ปราจีนบุรี

A modern appointment booking and real-time availability system for the Prachinburi Computer Center Help Desk.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8)
![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748)

## ✨ Features

### 📊 Public Dashboard (No login required)
- Real-time availability status: Open / Limited / Closed
- Number of available staff displayed
- Service catalog with estimated duration
- Today's available time slots count

### 📅 Appointment Booking
- Browse available slots by date (calendar view)
- Select service category (Hardware, Software, Network, Account)
- Book with name, phone, email, and problem description
- Confirmation page with booking details

### 👨‍💻 Staff Portal
- View today's appointments
- Mark self as unavailable (with reason and return time)
- View own schedule

### ⚙️ Admin Panel
- Manage staff accounts
- View all appointments
- Statistics dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Anirach/helpdesk-booking.git
cd helpdesk-booking

# Install dependencies
npm install

# Set up the database
npx prisma db push

# Seed demo data
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cc.prachinburi.ac.th | admin123 |
| Staff | staff1@cc.prachinburi.ac.th | staff123 |
| Staff | staff2@cc.prachinburi.ac.th | staff123 |

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Public dashboard
│   ├── book/
│   │   ├── page.tsx          # Booking flow
│   │   └── [id]/page.tsx     # Confirmation
│   ├── staff/
│   │   ├── page.tsx          # Staff portal
│   │   └── login/page.tsx    # Staff login
│   ├── admin/
│   │   └── page.tsx          # Admin panel
│   └── api/
│       ├── dashboard/        # Public availability
│       ├── services/         # Service catalog
│       ├── slots/            # Available time slots
│       ├── appointments/     # CRUD appointments
│       ├── staff/            # Staff list
│       └── auth/login/       # Authentication
├── components/ui/            # shadcn/ui components
└── lib/
    ├── db.ts                 # Prisma client
    └── utils.ts              # Utilities
```

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Database:** SQLite (via Prisma)
- **Components:** shadcn/ui

## 📝 Services

| Service | Thai Name | Duration |
|---------|-----------|----------|
| Hardware | ฮาร์ดแวร์ | 30 min |
| Software | ซอฟต์แวร์ | 30 min |
| Network | เครือข่าย | 45 min |
| Account | บัญชีผู้ใช้ | 15 min |

## 🔧 Configuration

Edit `.env` for environment variables:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

## 📄 License

MIT License

---

Built with ❤️ for Prachinburi Computer Center
