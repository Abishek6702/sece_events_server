# Email Notification System - API Testing Guide

## Quick Test API Calls

### 1. Create & Submit Event
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "requestDetails": {
      "organizerDetails": {
        "organizingDepartment": "Computer Science",
        "organizers": [
          {
            "name": "Dr. John Doe",
            "email": "john@college.edu",
            "department": "Computer Science",
            "designation": "Associate Professor",
            "mobile": 9876543210,
            "empId": "EMP001",
            "facultyId": "507f1f77bcf86cd799439011"
          }
        ]
      },
      "eventDetails": {
        "eventName": "Tech Conference 2024",
        "eventType": "Conference",
        "eventSchedule": [
          {
            "eventDate": "2024-12-15T09:00:00Z"
          }
        ]
      },
      "requirementDetails": {
        "venueRequired": true,
        "audioRequired": true,
        "ictsRequired": true,
        "transportRequired": true,
        "accommodationRequired": false,
        "mediaRequired": true
      }
    },
    "isSubmitted": true,
    "status": "Submitted"
  }'
```

**Expected Response:**
```json
{
  "message": "Event created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "Submitted",
    ...
  }
}
```

**Console Output:**
```
✓ Event creation notification sent to 3 recipients
```

**Emails Sent To:**
- john@college.edu (organizer)
- cse-hod@college.edu (HOD - if exists)
- admin@college.edu (Super Admin - if exists)

---

### 2. HOD Approves Event
```bash
curl -X PUT http://localhost:3000/api/events/507f1f77bcf86cd799439012/status \
  -H "Content-Type: application/json" \
  -d '{
    "action": "hodApprove"
  }'
```

**Expected Response:**
```json
{
  "message": "Status updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "HodApproved",
    "isHodApproved": true,
    ...
  }
}
```

**Console Output:**
```
✓ HOD approval notification sent to 2 recipients
```

**Emails Sent To:**
- john@college.edu (organizer)
- admin@college.edu (Super Admin)

---

### 3. Admin Approves Event
```bash
curl -X PUT http://localhost:3000/api/events/507f1f77bcf86cd799439012/status \
  -H "Content-Type: application/json" \
  -d '{
    "action": "adminApprove"
  }'
```

**Expected Response:**
```json
{
  "message": "Status updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "Approved",
    "adminApproval": true,
    ...
  }
}
```

**Console Output:**
```
✓ Admin approval notification sent to 5 recipients
✓ Department head notifications sent to 4 departments
```

**Emails Sent To:**
- john@college.edu (organizer)
- admin@college.edu (Super Admin)
- venue-coordinator@college.edu (Venue Coordinator)
- audio-coordinator@college.edu (Audio Coordinator)
- icts-coordinator@college.edu (ICTS Coordinator)
- transport-coordinator@college.edu (Transport Coordinator)

---

### 4. Reject Event (With Reason)
```bash
curl -X PUT http://localhost:3000/api/events/507f1f77bcf86cd799439012/status \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reject",
    "reason": "Budget approval pending. Please resubmit with updated budget breakdown."
  }'
```

**Expected Response:**
```json
{
  "message": "Status updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "Rejected",
    ...
  }
}
```

**Console Output:**
```
✓ Event rejection notification sent to 2 recipients
```

**Emails Sent To:**
- john@college.edu (organizer) - with rejection reason
- admin@college.edu (Super Admin) - with rejection reason

---

### 5. Close Event (With Reason)
```bash
curl -X PUT http://localhost:3000/api/events/507f1f77bcf86cd799439012/status \
  -H "Content-Type: application/json" \
  -d '{
    "action": "close",
    "reason": "Event completed successfully on 2024-12-15. Thank you for your coordination."
  }'
```

**Expected Response:**
```json
{
  "message": "Status updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "Closed",
    ...
  }
}
```

**Console Output:**
```
✓ Event closure notification sent to 7 recipients
```

**Emails Sent To:**
- john@college.edu (organizer)
- admin@college.edu (Super Admin)
- venue-coordinator@college.edu (Venue)
- audio-coordinator@college.edu (Audio)
- icts-coordinator@college.edu (ICTS)
- transport-coordinator@college.edu (Transport)

---

## Testing with Postman

### Setup Postman Collection:

#### Create Event Request
```
Method: POST
URL: {{base_url}}/api/events
Headers:
  Content-Type: application/json
  Authorization: Bearer {{token}}

Body:
{
  "requestDetails": {
    "organizerDetails": {
      "organizingDepartment": "Computer Science",
      "organizers": [
        {
          "name": "Dr. Sample",
          "email": "sample@college.edu",
          "department": "Computer Science",
          "designation": "Professor",
          "mobile": 9876543210,
          "empId": "CSE001",
          "facultyId": "507f1f77bcf86cd799439011"
        }
      ]
    },
    "eventDetails": {
      "eventName": "Annual Tech Summit",
      "eventType": "Seminar",
      "eventSchedule": [
        {
          "eventDate": "{{date_field}}"
        }
      ]
    },
    "requirementDetails": {
      "venueRequired": true,
      "audioRequired": true,
      "ictsRequired": true,
      "transportRequired": true,
      "mediaRequired": true
    }
  },
  "isSubmitted": true,
  "status": "Submitted"
}

Pre-request Script:
var dateObj = new Date(Date.now() + 30*24*60*60*1000);
var dateString = dateObj.toISOString();
postman.setEnvironmentVariable("date_field", dateString);
```

#### Update Status Request
```
Method: PUT
URL: {{base_url}}/api/events/{{event_id}}/status
Headers:
  Content-Type: application/json
  Authorization: Bearer {{token}}

Body (for HOD Approval):
{
  "action": "hodApprove"
}

Body (for Admin Approval):
{
  "action": "adminApprove"
}

Body (for Rejection):
{
  "action": "reject",
  "reason": "Missing mandatory documentation"
}

Body (for Closure):
{
  "action": "close",
  "reason": "Event completed successfully"
}
```

---

## Environment Variables for Testing

Create in Postman Environment:
```json
{
  "base_url": "http://localhost:3000",
  "event_id": "507f1f77bcf86cd799439012",
  "token": "your_auth_token_here"
}
```

After creating event, copy response `_id` and set:
```json
{
  "event_id": "{{response body _id}}"
}
```

---

## Expected Email Subject Lines

1. **Event Creation:**
   `[SECE Events] Event Created: Tech Conference 2024`

2. **HOD Approval:**
   `[SECE Events] HOD Approved: Tech Conference 2024`

3. **Admin Approval:**
   `[SECE Events] Admin Approved: Tech Conference 2024`

4. **Department Head Notification:**
   `[SECE Events] Action Required: Tech Conference 2024 - VENUE`
   `[SECE Events] Action Required: Tech Conference 2024 - AUDIO`
   `[SECE Events] Action Required: Tech Conference 2024 - ICTS`
   `[SECE Events] Action Required: Tech Conference 2024 - TRANSPORT`

5. **Rejection:**
   `[SECE Events] Event Rejected: Tech Conference 2024`

6. **Closure:**
   `[SECE Events] Event Closed: Tech Conference 2024`

---

## Email Preview Content

### Event Creation Email
```
Subject: [SECE Events] Event Created: Tech Conference 2024

Dear Team,

A new event has been created and requires your attention.

Event Details:
  Event Name: Tech Conference 2024
  Organizer: Dr. Sample
  Department: Computer Science
  Event Date: December 15, 2024

Please log in to the SECE Events Portal to review and approve the event details.
```

### HOD Approval Email
```
Subject: [SECE Events] HOD Approved: Tech Conference 2024

Dear Organizers,

Great news! Your event has been approved by the Head of Department.

Event Details:
  Event Name: Tech Conference 2024
  Department: Computer Science
  Event Date: December 15, 2024

Your event is now awaiting super admin approval. You will be notified once 
the super admin reviews and approves your event.
```

### Admin Approval Email
```
Subject: [SECE Events] Admin Approved: Tech Conference 2024

Dear Team,

The event has been approved by the Super Admin. Department heads have been 
notified for their respective departments.

Event Details:
  Event Name: Tech Conference 2024
  Department: Computer Science
  Event Date: December 15, 2024

Departments Notified:
  - VENUE
  - AUDIO
  - ICTS
  - TRANSPORT

The event coordinators for these departments are now working on the event requirements.
```

### Department Head Notification Email
```
Subject: [SECE Events] Action Required: Tech Conference 2024 - VENUE

Dear Department Head,

An event has been approved and requires your department's attention.

Event Details:
  Event Name: Tech Conference 2024
  Organizing Department: Computer Science
  Event Date: December 15, 2024
  Department Requirement: VENUE

Please log in to the SECE Events Portal to review and acknowledge the requirements 
for the VENUE department.
```

### Rejection Email
```
Subject: [SECE Events] Event Rejected: Tech Conference 2024

Dear Dr. Sample,

Unfortunately, your event submission has been rejected.

Reason for Rejection:
  Missing mandatory documentation

Please review the feedback and feel free to resubmit the event with corrections. 
If you have any questions, please contact the administration.
```

### Closure Email
```
Subject: [SECE Events] Event Closed: Tech Conference 2024

Dear Team,

The event has been officially closed.

Event Details:
  Event Name: Tech Conference 2024
  Department: Computer Science
  Event Date: December 15, 2024

Closure Reason:
  Event completed successfully on 2024-12-15

Thank you for organizing this event. You can view the event details in 
the SECE Events Portal.
```

---

## Troubleshooting Test Scenarios

### Scenario 1: Email not sent despite API success
**Check:**
1. Console logs - look for "✓ Event ... notification sent"
2. Email credentials in .env - verify EMAIL_USER and EMAIL_PASS
3. Gmail security - check "Allow Less Secure App Access"
4. Recipient exists - verify organizer email is valid

**Expected Console:**
```
✓ Event creation notification sent to 3 recipients
```

### Scenario 2: Wrong number of recipients
**Check:**
1. Verify HOD exists in database - search Faculty with department + "HOD" designation
2. Verify super admin exists - check User with `isadmin: true`
3. Verify event's `requirementDetails` flags are set correctly
4. Check console for failed emails

**Expected Console for Admin Approval:**
```
✓ Admin approval notification sent to X recipients
✓ Department head notifications sent to Y departments
```

### Scenario 3: Department heads not notified on admin approval
**Check:**
1. Event's `requirementDetails` has flags set:
   - `venueRequired: true`
   - `audioRequired: true`
   - etc.
2. Database has coordinator users with matching roles:
   - User.role = "Venue Coordinator"
   - User.role = "Audio Coordinator"
   - etc.
3. Check console for department head notification success

### Scenario 4: Same recipient getting multiple emails
**This is expected behavior!** A single person can have multiple roles:
- Organizer + Department Head
- HOD + Super Admin
- Etc.

Each role gets separate notification to ensure they see all relevant contexts.

---

## Automated Testing Script (Node.js)

```javascript
// test-notifications.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const DELAY = 2000; // 2 seconds between API calls

async function testNotifications() {
  try {
    // 1. Create event
    console.log('1. Creating event...');
    const createRes = await axios.post(`${BASE_URL}/api/events`, {
      requestDetails: {
        organizerDetails: {
          organizingDepartment: "Computer Science",
          organizers: [{
            name: "Test Organizer",
            email: "organizer@test.com",
            department: "Computer Science",
            designation: "Professor"
          }]
        },
        eventDetails: {
          eventName: "Test Event",
          eventSchedule: [{ eventDate: new Date() }]
        },
        requirementDetails: {
          venueRequired: true,
          audioRequired: true
        }
      },
      isSubmitted: true,
      status: "Submitted"
    });
    
    const eventId = createRes.data.data._id;
    console.log('✓ Event created:', eventId);
    await new Promise(r => setTimeout(r, DELAY));

    // 2. HOD Approve
    console.log('2. HOD approving event...');
    await axios.put(`${BASE_URL}/api/events/${eventId}/status`, {
      action: "hodApprove"
    });
    console.log('✓ HOD approved');
    await new Promise(r => setTimeout(r, DELAY));

    // 3. Admin Approve
    console.log('3. Admin approving event...');
    await axios.put(`${BASE_URL}/api/events/${eventId}/status`, {
      action: "adminApprove"
    });
    console.log('✓ Admin approved');
    await new Promise(r => setTimeout(r, DELAY));

    // 4. Close Event
    console.log('4. Closing event...');
    await axios.put(`${BASE_URL}/api/events/${eventId}/status`, {
      action: "close",
      reason: "Test completed"
    });
    console.log('✓ Event closed');

    console.log('\n✓ All tests completed!');
  } catch (error) {
    console.error('✗ Test failed:', error.message);
  }
}

testNotifications();
```

Run with: `node test-notifications.js`

