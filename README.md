# SECE Events Server

This repository contains the backend API for the SECE Events management system. It provides authentication, faculty management, and venue management endpoints built with Express and MongoDB.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Start the Server](#start-the-server)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Faculty](#faculty)
  - [Venues](#venues)
- [API Documentation](#api-documentation)
- [Schemas](#schemas)
- [File Uploads](#file-uploads)
- [Postman Collection](#postman-collection)
- [Notes](#notes)

---

## Features

- User authentication with JWT
- Admin user creation
- Password reset via email OTP
- Faculty import using Excel file upload
- Add, read, update, delete faculty records
- Venue import via Excel upload
- Venue CRUD operations
- Venue filtering options

---

## Tech Stack

- Node.js
- Express
- MongoDB / Mongoose
- JSON Web Tokens
- bcryptjs
- multer
- nodemailer
- dotenv

---

## Setup

1. Clone this repository.
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root.
4. Add the required environment variables.

---

## Environment Variables

Create a `.env` file with the following values:

```env
PORT=5000
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
FRONTEND_URL=http://localhost:5173
EMAIL_HOST=<smtp-host>
EMAIL_PORT=<smtp-port>
EMAIL_USER=<smtp-user>
EMAIL_PASS=<smtp-pass>
```

`EMAIL_*` variables are required only if the password reset email flow is used.

---

## Start the Server

```bash
npm run dev
```

If `nodemon` is not configured in `package.json`, use:

```bash
npx nodemon server.js
```

or:

```bash
node server.js
```

---

## API Endpoints

Base URL: `http://localhost:<PORT>/api`

### Authentication

| Endpoint | Method | Description | Body |
|---|---|---|---|
| `/auth/login` | POST | Authenticate user and receive JWT | `{ email, password }` |
| `/auth/forgot-password` | POST | Send OTP to user email | `{ email }` |
| `/auth/reset-password` | POST | Reset password with OTP | `{ email, otp, newPassword }` |
| `/auth/change-password` | POST | Change password directly | `{ email, newPassword }` |
| `/auth/add-admin` | POST | Create a new admin user | `{ name, email, department, role }` |

#### Login response

```json
{
  "_id": "...",
  "name": "...",
  "email": "...",
  "token": "..."
}
```

---

### Faculty

| Endpoint | Method | Description | Body / Query |
|---|---|---|---|
| `/faculty/import-faculty` | POST | Upload Excel file to import multiple faculty records | `multipart/form-data` with `faculties` file field |
| `/faculty` | POST | Add a single faculty member | JSON body |
| `/faculty` | GET | Get all faculty records | — |
| `/faculty/:id` | GET | Get faculty by ID | — |
| `/faculty/:id` | PUT | Update a faculty record | JSON body |
| `/faculty/:id` | DELETE | Delete a faculty record | — |

#### Faculty model fields

- `name` (String, required)
- `empId` (String, required)
- `email` (String, required)
- `phone` (Number, required)
- `department` (String, required)
- `dob` (Date, required)
- `gender` (String, required; one of `Male`, `Female`, `Other`)
- `doj` (Date, required)
- `designation` (String, required)
- `employeeCategory` (String, required; `Teaching` or `Non-Teaching`)
- `employmentStatus` (Boolean, default `true`)
- `location` (String, required)
- `profileImage` (String, optional)

#### Notes

- When faculty is created, a corresponding `User` account is created automatically.
- Default password generated for faculty imports and additions is `Sece@123`.

---

### Venues

| Endpoint | Method | Description | Body / Query |
|---|---|---|---|
| `/venues/import` | POST | Upload Excel file to import venue records | `multipart/form-data` with `file` field |
| `/venues` | POST | Create a new venue | JSON body |
| `/venues` | GET | Get all venues | — |
| `/venues/options` | GET | Get filtered venue options | `?type=venue|audio|proctoring&minCapacity=<number>` |
| `/venues/:id` | GET | Get venue by ID | — |
| `/venues/:id` | PUT | Update venue | JSON body |
| `/venues/:id` | DELETE | Delete venue | — |

#### Venue model fields

- `block` (String)
- `floor` (String)
- `venue` (String, required)
- `capacity` (Number, required)
- `audio` (Object)
  - `wiredMic` (Number)
  - `handMic` (Number)
  - `collarMic` (Number)
  - `handSpeaker` (Number)
  - `speakerWithMixer` (Number)
  - `paSystem` (Number)
  - `podiumWithMic` (Number)
- `seating` (Object)
  - `withoutProctoring` (Number)
  - `withProctoring` (Number)
- `remarks` (String)

---

## Schemas

### User

- `name` (String, required)
- `email` (String, required, unique)
- `password` (String)
- `isFirstTimeLogin` (Boolean)
- `hasAccess` (Boolean)
- `facultyId` (ObjectId ref Faculty)
- `department` (String, required)
- `role` (String, required)
- `isadmin` (Boolean)
- `resetOtp` (String)
- `resetOtpExpiry` (Date)

### Faculty

See [Faculty model fields](#faculty-model-fields).

### Venue

See [Venue model fields](#venue-model-fields).

---

## File Uploads

### Faculty Excel import

- Endpoint: `POST /api/faculty/import-faculty`
- Form field: `faculties`
- Expected file type: Excel (.xlsx)
- Required columns: `name`, `empId`, `email`, `phone`, `department`, `dob`, `gender`, `doj`, `designation`, `employeeCategory`, `location`

### Venue Excel import

- Endpoint: `POST /api/venues/import`
- Form field: `file`
- Expected columns: `Block`, `Floor`, `Venue`, `Capacity`, `Wired Mic`, `HandMic`, `CollarMic`, `Hand Speaker`, `Speaker set with Mixer`, `PASystem`, `Podium with mic`, `Without Procotoring`, `Procotoring`, `Remarks`

---

## Postman Collection

A Postman collection is available in `Postman/SECE_Events.postman_collection.json`.

---

## Notes

- CORS is restricted to `http://localhost:5173` and `http://localhost:5174`.
- Authentication middleware expects `Authorization: Bearer <token>`.
- The server entry point is `server.js`.
- Ensure `uploads/` exists or is created automatically when handling file uploads.

---

## API Documentation

Detailed API documentation is available in [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

---

## Troubleshooting

- If MongoDB fails to connect, verify `MONGO_URI` and network access.
- If JWT fails, verify `JWT_SECRET` is set and used consistently.
- If email OTP fails, verify SMTP credentials and `EMAIL_*` values.
