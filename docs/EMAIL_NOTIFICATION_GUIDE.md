# Email Notification System - Event Workflow

## Overview
The email notification system automatically sends notifications to relevant stakeholders at each stage of the event approval workflow.

## Workflow Stages & Notifications

### 1. **Event Creation/Submission**
**Trigger:** Event is created with status "Submitted"

**Recipients:**
- ✉️ All Organizers (extracted from `requestDetails.organizerDetails.organizers`)
- ✉️ Head of Department (HOD) - for the organizing department
- ✉️ Super Admin

**Template:** `eventCreation.js`

**API Endpoint:**
```
POST /api/events
```

**Example Request:**
```json
{
  "requestDetails": {
    "organizerDetails": {
      "organizingDepartment": "Computer Science",
      "organizers": [
        {
          "name": "Dr. John Doe",
          "email": "john@example.com",
          "designation": "Professor",
          "department": "Computer Science"
        }
      ]
    },
    "eventDetails": {
      "eventName": "Tech Conference 2024",
      "eventSchedule": [
        {
          "eventDate": "2024-12-15T09:00:00"
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
  "isSubmitted": true
}
```

---

### 2. **HOD Approval**
**Trigger:** Event status changed to "HodApproved"

**Recipients:**
- ✉️ All Organizers

**Template:** `hodApproval.js`

**Note:** Super admin does NOT receive this notification

**API Endpoint:**
```
PUT /api/events/{eventId}/status
```

**Example Request:**
```json
{
  "action": "hodApprove"
}
```

---

### 3. **Admin Approval**
**Trigger:** Event status changed to "Approved" (AdminApproved)

**Recipients:**
- ✉️ All Organizers
- ✉️ Super Admin
- ✉️ All Department Heads (based on event requirements):
  - Venue Coordinator
  - Audio Coordinator
  - ICTS Coordinator
  - Transport Coordinator
  - Food Coordinator
  - Accommodation Coordinator
  - Purchase Coordinator
  - Media Coordinator

**Template:** `adminApproval.js`

**Also triggers:** Department head notifications

**API Endpoint:**
```
PUT /api/events/{eventId}/status
```

**Example Request:**
```json
{
  "action": "adminApprove"
}
```

---

### 4. **Department Head Notifications**
**Trigger:** Automatically sent after Admin Approval

**Recipients:** Individual emails sent to each department head based on event requirements

**Template:** `departmentHeadNotification.js`

**Department Mapping:**
- `venueRequired: true` → Venue Coordinator
- `audioRequired: true` → Audio Coordinator
- `ictsRequired: true` → ICTS Coordinator
- `transportRequired: true` → Transport Coordinator
- `accommodationRequired: true` → Accommodation Coordinator
- `mediaRequired: true` → Media Coordinator
- Food/Purchase coordinators (if configured)

---

### 5. **Event Rejection**
**Trigger:** Event status changed to "Rejected"

**Recipients:**
- ✉️ All Organizers

**Template:** `eventRejection.js`

**Note:** Super admin performs the rejection but does NOT receive notification

**API Endpoint:**
```
PUT /api/events/{eventId}/status
```

**Example Request:**
```json
{
  "action": "reject",
  "reason": "Budget not approved. Please resubmit with updated budget details."
}
```

---

### 6. **Event Closure**
**Trigger:** Event status changed to "Closed" (when organizer marks event as completed)

**Recipients:**
- ✉️ All Organizers
- ✉️ Head of Department (HOD)
- ✉️ Super Admin
- ✉️ All Department Heads (who were notified during approval)

**Template:** `eventClosed.js`

**API Endpoint:**
```
PUT /api/events/{eventId}/status
```

**Example Request:**
```json
{
  "action": "close",
  "reason": "Event has been completed successfully."
}
```

---

## Email Template Files

All templates are located in `/utils/mailTemplates/`:

1. **eventCreation.js** - New event created notification
2. **hodApproval.js** - HOD approval confirmation
3. **adminApproval.js** - Admin approval confirmation
4. **departmentHeadNotification.js** - Department head action required
5. **eventRejection.js** - Event rejection with reason
6. **eventClosed.js** - Event closure notification

---

## Utility Functions

### Event Notifications Module (`utils/eventNotifications.js`)

#### Main Notification Functions:
```javascript
// Send notification for event creation
await notifyEventCreation(event);

// Send notification for HOD approval
await notifyHODApproval(event);

// Send notification for admin approval
await notifyAdminApproval(event);

// Send notification to department heads
await notifyDepartmentHeads(event);

// Send notification for event rejection
await notifyEventRejection(event, reason);

// Send notification for event closure
await notifyEventClosure(event, closureReason);
```

#### Helper Functions:
```javascript
// Get super admin email
const email = await getSuperAdminEmail();

// Get HOD email for a department
const hodEmail = await getHODEmail("Computer Science");

// Get organizer emails from event
const emails = getOrganizersEmails(event);

// Get department head email for requirement type
const coordEmail = await getDepartmentHeadEmail("venue");

// Get all department head emails for an event
const deptHeads = await getAllDepartmentHeadEmails(event);
```

---

## Email Recipient Resolution

### How recipients are determined:

#### **Super Admin:**
1. Look for user with `isadmin: true` in User collection
2. Fallback to `process.env.SUPER_ADMIN_EMAIL`

#### **HOD:**
1. Search Faculty model for user with department matching event's organizing department and designation containing "HOD" or "Head"
2. Fallback to User model with HOD role
3. Returns null if not found (email won't be sent)

#### **Organizers:**
Extracted from event data: `event.requestDetails.organizerDetails.organizers[].email`

#### **Department Heads:**
Based on event's `requestDetails.requirementDetails`:
- Searches User collection for role matching the requirement type
- Maps requirement types: `venue` → Venue Coordinator, `audio` → Audio Coordinator, etc.
- Fallback to Faculty model search

---

## Configuration Requirements

### Environment Variables Needed:
```env
# Email configuration (for sendMail utility)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Optional: Super admin fallback email
SUPER_ADMIN_EMAIL=admin@example.com
```

### Database Models Required:
- **User:** Must have `email`, `isadmin`, `role`, `department` fields
- **Faculty:** Must have `email`, `department`, `designation` fields
- **Event:** Must have `requestDetails`, `status` fields

---

## Error Handling

The notification system includes error handling:
- Individual email failures don't stop the event operation
- Failed emails are logged to console with recipient email
- System continues with next recipient if one fails
- Overall operation success/failure is not dependent on email success

### Example Error Flow:
```
✓ Event approval successful
✗ Failed to send email to john@example.com
✓ Event approval notification sent to 5 recipients (4 successful, 1 failed)
```

---

## Testing

### Manual Testing with Postman:

**1. Create and Submit Event:**
```
POST /api/events
Body: (event data with isSubmitted: true)
```

**2. Approve by HOD:**
```
PUT /api/events/{eventId}/status
Body: { "action": "hodApprove" }
```

**3. Approve by Admin:**
```
PUT /api/events/{eventId}/status
Body: { "action": "adminApprove" }
```

**4. Reject Event:**
```
PUT /api/events/{eventId}/status
Body: { "action": "reject", "reason": "Budget issues" }
```

**5. Close Event:**
```
PUT /api/events/{eventId}/status
Body: { "action": "close", "reason": "Event completed" }
```

---

## Email Flow Diagram

```
Event Created
    ↓
[notifyEventCreation]
    ├→ All Organizers ✉️
    ├→ HOD ✉️
    └→ Super Admin ✉️
    
    ↓
    
HOD Approves
    ↓
[notifyHODApproval]
    └→ All Organizers ✉️
    
    ↓
    
Admin Approves
    ↓
[notifyAdminApproval] + [notifyDepartmentHeads]
    ├→ All Organizers ✉️
    ├→ Super Admin ✉️
    ├→ Venue Coordinator ✉️
    ├→ Audio Coordinator ✉️
    ├→ ICTS Coordinator ✉️
    ├→ Transport Coordinator ✉️
    ├→ Accommodation Coordinator ✉️
    ├→ Food Coordinator ✉️
    ├→ Purchase Coordinator ✉️
    └→ Media Coordinator ✉️
    
    ↓
    
Event Rejected (by Super Admin at any stage)
    ↓
[notifyEventRejection]
    └→ All Organizers ✉️
    
    ↓
    
Event Closed (when completed)
    ↓
[notifyEventClosure]
    ├→ All Organizers ✉️
    ├→ HOD ✉️
    ├→ Super Admin ✉️
    └→ All Notified Department Heads ✉️
```

---

## Customization

### To modify email templates:
1. Edit files in `/utils/mailTemplates/`
2. Update template function parameters if needed
3. Restart server

### To add new departments:
1. Add to `DEPARTMENT_HEAD_ROLES` mapping in `eventNotifications.js`
2. Add corresponding requirement type to event schema if needed
3. Users with matching role names will automatically be notified

### To change recipient selection logic:
1. Modify helper functions in `eventNotifications.js` (e.g., `getHODEmail`, `getDepartmentHeadEmail`)
2. Update database queries if needed
3. Add appropriate error handling

---

## Troubleshooting

### Emails not being sent:
1. Check EMAIL_USER and EMAIL_PASS in .env
2. Verify email account allows "Less Secure App Access" (Gmail)
3. Check console logs for specific error messages
4. Verify recipient emails exist in database

### Wrong recipients receiving emails:
1. Check User/Faculty database records
2. Verify role names and designations match `DEPARTMENT_HEAD_ROLES` mapping
3. Check event's `requirementDetails` are correctly set

### Email template issues:
1. Verify template files exist in `/utils/mailTemplates/`
2. Check template function parameters match what's being passed
3. Look for console errors during rendering

