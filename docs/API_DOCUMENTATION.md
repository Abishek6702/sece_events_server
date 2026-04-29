# SECE Events Server — API Documentation

This document describes the backend API for the SECE Events server, including authentication, faculty management, and venue management.

## Base URL

`http://localhost:<PORT>/api`

## Authentication

### POST /auth/login

Authenticate a user and return a JWT.

Request body:

```json
{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```

Success response:

```json
{
  "_id": "645a3f1c6b...",
  "name": "Admin User",
  "email": "admin@example.com",
  "token": "eyJhbGciOi..."
}
```

Errors:

- `401` if email is not found or password is invalid.

---

### POST /auth/forgot-password

Send a password reset OTP to the user's email.

Request body:

```json
{
  "email": "faculty@example.com"
}
```

Success response:

```json
{
  "message": "Otp sent to mail"
}
```

Errors:

- `404` if the email does not exist.

---

### POST /auth/reset-password

Reset a user's password using an OTP.

Request body:

```json
{
  "email": "faculty@example.com",
  "otp": "123456",
  "newPassword": "NewSecure@123"
}
```

Success response:

```json
{
  "message": "Password changed sucessfully"
}
```

Errors:

- `404` if the user is not found.
- `404` if the OTP is invalid or expired.

---

### POST /auth/change-password

Change a user's password directly.

Request body:

```json
{
  "email": "faculty@example.com",
  "newPassword": "NewSecure@123"
}
```

Success response:

```json
{
  "mesaage": "Password changed sucessfully"
}
```

Errors:

- `404` if the user is not found.

---

### POST /auth/add-admin

Create an admin user.

Request body:

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "department": "IT",
  "role": "admin"
}
```

Success response:

```json
{
  "message": "Admin created",
  "defaultPassword": "Admin@123",
  "data": {
    "_id": "645a3f1c6b...",
    "name": "Admin User",
    "email": "admin@example.com",
    "department": "IT",
    "role": "admin",
    "isadmin": true
  }
}
```

Errors:

- `400` if required fields are missing.
- `400` if the user already exists.

---

## Faculty Endpoints

### POST /faculty/import-faculty

Import multiple faculty records from an Excel file.

Form data:

- `faculties`: Excel file (`.xlsx`)

Expected Excel columns:

- `name`
- `empId`
- `email`
- `phone`
- `department`
- `dob`
- `gender`
- `doj`
- `designation`
- `employeeCategory`
- `location`

Success response:

```json
{
  "message": "Excel imported successfully",
  "count": 12
}
```

Errors:

- `400` if no file is uploaded.
- `400` if the Excel format is invalid.

---

### POST /faculty

Create a single faculty record.

Request body:

```json
{
  "name": "John Doe",
  "empId": "EMP123",
  "email": "john.doe@example.com",
  "phone": 9876543210,
  "department": "Science",
  "dob": "1985-02-15",
  "gender": "Male",
  "doj": "2020-08-01",
  "designation": "Professor",
  "employeeCategory": "Teaching",
  "location": "Main Campus",
  "profileImage": "https://.../profile.jpg"
}
```

Success response:

```json
{
  "message": "Faculty added successfully",
  "defaultPassword": "Sece@123",
  "data": {
    "_id": "645a3f1c6b...",
    "name": "John Doe",
    "empId": "EMP123",
    "email": "john.doe@example.com",
    "phone": 9876543210,
    "department": "Science",
    "dob": "1985-02-15T00:00:00.000Z",
    "gender": "Male",
    "doj": "2020-08-01T00:00:00.000Z",
    "designation": "Professor",
    "employeeCategory": "Teaching",
    "location": "Main Campus",
    "profileImage": "https://.../profile.jpg"
  }
}
```

Errors:

- `400` if required fields are missing.
- `400` if a faculty record with the same email, empId, or phone already exists.

---

### GET /faculty

Fetch all faculty records.

Success response:

```json
[
  {
    "_id": "645a3f1c6b...",
    "name": "John Doe",
    "empId": "EMP123",
    "email": "john.doe@example.com",
    "phone": 9876543210,
    "department": "Science",
    "dob": "1985-02-15T00:00:00.000Z",
    "gender": "Male",
    "doj": "2020-08-01T00:00:00.000Z",
    "designation": "Professor",
    "employeeCategory": "Teaching",
    "employmentStatus": true,
    "location": "Main Campus",
    "profileImage": "https://.../profile.jpg"
  }
]
```

---

### GET /faculty/:id

Fetch a faculty record by ID.

Success response:

```json
{
  "_id": "645a3f1c6b...",
  "name": "John Doe",
  "empId": "EMP123",
  "email": "john.doe@example.com",
  "phone": 9876543210,
  "department": "Science",
  "dob": "1985-02-15T00:00:00.000Z",
  "gender": "Male",
  "doj": "2020-08-01T00:00:00.000Z",
  "designation": "Professor",
  "employeeCategory": "Teaching",
  "employmentStatus": true,
  "location": "Main Campus",
  "profileImage": "https://.../profile.jpg"
}
```

Errors:

- `404` if the faculty record is not found.

---

### PUT /faculty/:id

Update a faculty record.

Request body example:

```json
{
  "location": "New Campus",
  "designation": "Associate Professor"
}
```

Success response:

```json
{
  "message": "Faculty updated successfully",
  "data": {
    "_id": "645a3f1c6b...",
    "name": "John Doe",
    "location": "New Campus",
    "designation": "Associate Professor"
  }
}
```

Errors:

- `404` if the faculty record is not found.

---

### DELETE /faculty/:id

Delete a faculty record and its linked user account.

Success response:

```json
{
  "message": "Faculty and login deleted successfully"
}
```

Errors:

- `404` if the faculty record is not found.

---

## Venue Endpoints

### POST /venues/import

Import venue records from an Excel file.

Form data:

- `file`: Excel file (`.xlsx`)

Expected columns:

- `Block`
- `Floor`
- `Venue`
- `Capacity`
- `Wired Mic`
- `HandMic`
- `CollarMic`
- `Hand Speaker`
- `Speaker set with Mixer`
- `PASystem`
- `Podium with mic`
- `Without Procotoring`
- `Procotoring`
- `Remarks`

Success response:

```json
{
  "message": "Import successful",
  "insertedCount": 18
}
```

Errors:

- `400` if no file is uploaded.
- `400` if invalid venue rows are detected.

---

### POST /venues

Create a single venue.

Request body example:

```json
{
  "block": "A",
  "floor": "3",
  "venue": "Lecture Hall 5",
  "capacity": 120,
  "audio": {
    "wiredMic": 1,
    "handMic": 2,
    "collarMic": 1,
    "handSpeaker": 0,
    "speakerWithMixer": 1,
    "paSystem": 1,
    "podiumWithMic": 1
  },
  "seating": {
    "withoutProctoring": 80,
    "withProctoring": 40
  },
  "remarks": "Projector available"
}
```

Success response:

```json
{
  "_id": "645a3f1c6b...",
  "block": "A",
  "floor": "3",
  "venue": "Lecture Hall 5",
  "capacity": 120,
  "audio": {
    "wiredMic": 1,
    "handMic": 2,
    "collarMic": 1,
    "handSpeaker": 0,
    "speakerWithMixer": 1,
    "paSystem": 1,
    "podiumWithMic": 1
  },
  "seating": {
    "withoutProctoring": 80,
    "withProctoring": 40
  },
  "remarks": "Projector available"
}
```

---

### GET /venues

Retrieve all venues.

Success response:

```json
[
  {
    "_id": "645a3f1c6b...",
    "block": "A",
    "floor": "3",
    "venue": "Lecture Hall 5",
    "capacity": 120,
    "audio": {
      "wiredMic": 1,
      "handMic": 2,
      "collarMic": 1,
      "handSpeaker": 0,
      "speakerWithMixer": 1,
      "paSystem": 1,
      "podiumWithMic": 1
    },
    "seating": {
      "withoutProctoring": 80,
      "withProctoring": 40
    },
    "remarks": "Projector available"
  }
]
```

---

### GET /venues/options

Retrieve a filtered set of venue options.

Query parameters:

- `type=venue|audio|proctoring`
- `minCapacity=<number>`

Example:

`/venues/options?type=audio&minCapacity=50`

Success response:

```json
{
  "count": 5,
  "data": [
    {
      "_id": "645a3f1c6b...",
      "venue": "Lecture Hall 5",
      "capacity": 120,
      "audio": {
        "wiredMic": 1,
        "handMic": 2,
        "collarMic": 1,
        "handSpeaker": 0,
        "speakerWithMixer": 1,
        "paSystem": 1,
        "podiumWithMic": 1
      }
    }
  ]
}
```

Errors:

- `400` if `type` is invalid.

---

### GET /venues/:id

Fetch venue details by ID.

Success response:

```json
{
  "_id": "645a3f1c6b...",
  "block": "A",
  "floor": "3",
  "venue": "Lecture Hall 5",
  "capacity": 120,
  "audio": {
    "wiredMic": 1,
    "handMic": 2,
    "collarMic": 1,
    "handSpeaker": 0,
    "speakerWithMixer": 1,
    "paSystem": 1,
    "podiumWithMic": 1
  },
  "seating": {
    "withoutProctoring": 80,
    "withProctoring": 40
  },
  "remarks": "Projector available"
}
```

Errors:

- `404` if the venue is not found.

---

### PUT /venues/:id

Update a venue.

Request body example:

```json
{
  "capacity": 150,
  "remarks": "Added new projector"
}
```

Success response:

```json
{
  "_id": "645a3f1c6b...",
  "venue": "Lecture Hall 5",
  "capacity": 150,
  "remarks": "Added new projector"
}
```

Errors:

- `404` if the venue is not found.

---

### DELETE /venues/:id

Delete a venue.

Success response:

```json
{
  "message": "Venue deleted successfully"
}
```

Errors:

- `404` if the venue is not found.

---

## Models

### User

- `name` (String, required)
- `email` (String, required, unique)
- `password` (String)
- `isFirstTimeLogin` (Boolean)
- `hasAccess` (Boolean)
- `facultyId` (ObjectId, ref `Faculty`)
- `department` (String, required)
- `role` (String, required)
- `isadmin` (Boolean)
- `resetOtp` (String)
- `resetOtpExpiry` (Date)

### Faculty

- `name` (String, required)
- `empId` (String, required)
- `email` (String, required)
- `phone` (Number, required)
- `department` (String, required)
- `dob` (Date, required)
- `gender` (String, required, enum: `Male`, `Female`, `Other`)
- `doj` (Date, required)
- `designation` (String, required)
- `employeeCategory` (String, required, enum: `Teaching`, `Non-Teaching`)
- `employmentStatus` (Boolean, default `true`)
- `location` (String, required)
- `profileImage` (String)

### Venue

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

## Authorization

- Authentication is not enforced on the current route definitions for faculty and venue operations.
- Use `/auth/login` to obtain a JWT.
- Include the token in requests as:

```
Authorization: Bearer <token>
```

## CORS

The backend allows requests from:

- `http://localhost:5173`
- `http://localhost:5174`

## Event Endpoints

- `POST /api/events`
  - Create a new event draft or submit with `isSubmitted: true`.
  - Supports multipart form-data for file uploads.
- `PUT /api/events/:id`
  - Update an existing event draft.
  - Allows new file uploads to attach to the existing record.
- `PATCH /api/events/:id/submit`
  - Submit an existing draft event.
  - Marks `status` as `Submitted` and `isSubmitted` as `true`.
- `GET /api/events`
  - Fetch all events.
- `GET /api/events/:id`
  - Fetch a single event by ID.
- `DELETE /api/events/:id`
  - Delete an event record.

Use the Postman collection below to run the draft / update / submit flow in one place.

## Notes

- The `uploads/` directory is created automatically by multer middleware.
- Excel venue import relies on column names matching the expected sheet headers.
- Faculty imports create linked `User` accounts with `Sece@123` as the default password.

## Postman

Import `Postman/SECE_Events.postman_collection.json` for ready-to-use requests.
