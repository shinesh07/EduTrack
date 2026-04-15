# EduTrack

EduTrack is a full-stack student management system for handling attendance, academic results, and role-based dashboards for admins, teachers, and students.

## Highlights

- Admin dashboard for managing teachers, students, attendance, and results
- Teacher portal for assigned-student management, attendance marking, and result entry
- Student portal for attendance history, result tracking, and transcript PDF download
- JWT-based authentication with role-based route protection
- Email verification and resend-verification flow for new accounts
- MongoDB-backed backend with React + Vite frontend

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: JWT
- Utilities: Nodemailer, Brevo/Resend support, PDFKit

## Project Structure

```text
EduTrack/
├── backend/    # Express API, MongoDB models, auth, email, seed script
├── frontend/   # React app, dashboards, pages, shared UI
├── package.json
└── README.md
```

## Core Features

### Admin

- View platform statistics from a central dashboard
- Create, edit, and delete teacher accounts
- Create, edit, and delete student accounts
- Assign students to teachers
- Review attendance records and academic results

### Teacher

- View assigned students only
- Mark attendance in bulk by subject and date
- Update or delete attendance records
- Create and manage student results
- View teacher-specific dashboard stats

### Student

- View personal attendance history with summaries
- Mark attendance for the current day
- View semester-wise results and CGPA
- Download a transcript as PDF
- View assigned teacher details

### Authentication and Verification

- Public signup for teachers and students
- Email verification before login
- Resend verification support
- Protected routes for admin, teacher, and student roles

## Getting Started

### 1. Install dependencies

From the project root:

```bash
npm run install:all
```

Or install manually:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

Copy the backend example file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Required backend settings:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

Email setup options for verification emails:

- `BREVO_API_KEY` and `EMAIL_FROM`
- `RESEND_API_KEY` and optionally `EMAIL_FROM`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, and optionally `EMAIL_FROM`

### 3. Start the app in development

From the project root:

```bash
npm run dev
```

This starts:

- Frontend on `http://localhost:3000`
- Backend on `http://localhost:5000`

The Vite dev server proxies `/api` requests to the backend automatically.

## Seed the Admin Account

You can create a default admin account with:

```bash
npm run seed
```

Default seeded credentials:

- Email: `admin@school.com`
- Password: `admin123`

Change the password after first login.

## Available Scripts

### Root

- `npm run install:all` - install root, backend, and frontend dependencies
- `npm run dev` - run backend and frontend together in development
- `npm run build` - build the frontend for production
- `npm run start` - start the backend server
- `npm run seed` - create the default admin user
- `npm run deploy:render` - build frontend and start backend

### Backend

- `npm run dev` - start backend with nodemon
- `npm run start` - start backend with Node.js
- `npm run seed` - run the database seed script

### Frontend

- `npm run dev` - start Vite dev server
- `npm run build` - create production build
- `npm run preview` - preview production build locally

## Production Notes

- In production, the backend serves the built frontend from `frontend/dist`
- Run `npm run build` before `npm run start` if you want the backend to serve the frontend
- Make sure `CLIENT_URL` matches your deployed frontend URL for email verification links

## Email Verification Notes

- Self-signup for teachers and students sends a verification email
- If email delivery fails in local development, self-registered accounts are automatically verified to make development easier
- Admin-created teacher and student accounts work best with proper email configuration enabled

## API Areas

- `/api/auth` - signup, login, current user, email verification, password change
- `/api/admin` - admin stats, teacher management, student management, result and attendance access
- `/api/teacher` - teacher stats, assigned students, attendance, results
- `/api/student` - student stats, attendance, results, transcript download

