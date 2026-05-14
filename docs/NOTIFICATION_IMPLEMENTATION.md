# Email Notification System - Implementation Summary

## ✅ What Has Been Implemented

### Email Templates Created:
1. ✅ **eventCreation.js** - Sent when event is created/submitted
2. ✅ **hodApproval.js** - Sent when HOD approves event
3. ✅ **adminApproval.js** - Sent when admin approves event
4. ✅ **departmentHeadNotification.js** - Sent to individual department heads
5. ✅ **eventRejection.js** - Sent when event is rejected
6. ✅ **eventClosed.js** - Sent when event is closed

### Utility Functions Created:
✅ **eventNotifications.js** with functions:
- `notifyEventCreation(event)` - Sends to organizers, HOD, super admin
- `notifyHODApproval(event)` - Sends to organizers, super admin
- `notifyAdminApproval(event)` - Sends to organizers, super admin, dept heads
- `notifyDepartmentHeads(event)` - Sends to individual department heads
- `notifyEventRejection(event, reason)` - Sends to organizers, super admin
- `notifyEventClosure(event, reason)` - Sends to all stakeholders

### Event Controller Integration:
✅ Updated **eventController.js**:
- Import event notification functions
- Added notification in `createEvent()` when event is submitted
- Added notifications in `updateEventStatus()` for all status changes:
  - Submit → notifyEventCreation
  - HOD Approve → notifyHODApproval
  - Admin Approve → notifyAdminApproval + notifyDepartmentHeads
  - Reject → notifyEventRejection
  - Close → notifyEventClosure

### Documentation:
✅ **EMAIL_NOTIFICATION_GUIDE.md** - Comprehensive guide covering:
- Workflow stages and recipients
- API endpoints and examples
- Template files overview
- Utility functions
- Configuration requirements
- Error handling
- Testing procedures
- Email flow diagram
- Troubleshooting guide

---

## 📋 Complete Email Workflow (Updated)

### Stage 1: Event Creation
```
Action: Create event with status "Submitted"
Recipients: Organizers + HOD + Super Admin
Notification: New event created - requires approval
```

### Stage 2: HOD Approval
```
Action: HOD approves event (status → "HodApproved")
Recipients: Organizers ONLY
Notification: Event approved by HOD - awaiting super admin approval
⚠️  Super Admin does NOT receive this notification
```

### Stage 3: Admin Approval
```
Action: Admin approves event (status → "Approved")
Recipients: 
  - Organizers + Super Admin (adminApproval email)
  - Department Heads (separate notification emails)
Notification: Event approved by admin - department heads notified to start work
```

### Stage 4: Event Rejection
```
Action: Event rejected by Super Admin (status → "Rejected")
Recipients: Organizers ONLY
Notification: Event rejected with reason - resubmit with corrections
⚠️  Super Admin does NOT receive notification (they did the rejecting)
```

### Stage 5: Event Closure
```
Action: Event closed when completed (status → "Closed")
Recipients: Organizers + HOD + Super Admin + Department Heads
Notification: Event officially closed - all stakeholders informed
```

---

## 🔧 Database Requirements Check

Your system already has all required fields:

### User Model ✅
- `email` - Used to find super admin and coordinators
- `isadmin` - Used to identify super admin
- `role` - Used to find department coordinators
- `department` - Used in HOD search

### Faculty Model ✅
- `email` - Used for HOD and coordinator searches
- `department` - Used to find HOD for event's department
- `designation` - Used to find HOD and coordinators

### Event Model ✅
- `requestDetails.organizerDetails.organizers[].email` - Organizer emails
- `requestDetails.organizerDetails.organizingDepartment` - Department for HOD lookup
- `requestDetails.eventDetails.eventName` - Event name for emails
- `requestDetails.eventDetails.eventSchedule[].eventDate` - Event date for emails
- `requestDetails.requirementDetails` - Determines which dept heads to notify
- `status` - Current event status

---

## 🚀 How to Use (Updated Flow)

### 1. Create & Submit Event
```bash
POST /api/events
{
  "requestDetails": {
    "organizerDetails": {
      "organizingDepartment": "Computer Science",
      "organizers": [
        {
          "name": "Prof. John",
          "email": "john@college.edu",
          ...
        }
      ]
    },
    ...
  },
  "isSubmitted": true  ← This triggers notifyEventCreation
}
```
**Emails sent to:**
- prof.john@college.edu (organizer)
- hod.cse@college.edu (HOD)
- admin@college.edu (Super Admin)

---

### 2. HOD Reviews & Approves ⭐ UPDATED
```bash
PUT /api/events/{eventId}/status
{
  "action": "hodApprove"
}
```
**Emails sent to:**
- All organizers ONLY
- ❌ Super admin does NOT receive notification

---

### 3. Admin Reviews & Approves
```bash
PUT /api/events/{eventId}/status
{
  "action": "adminApprove"
}
```
**Emails sent to:**
- All organizers + Super admin (adminApproval template)
- Venue coordinator (departmentHeadNotification template)
- Audio coordinator (departmentHeadNotification template)
- ICTS coordinator (departmentHeadNotification template)
- Transport coordinator (departmentHeadNotification template)
- And others based on event requirements

---

### 4. Reject Event ⭐ UPDATED
```bash
PUT /api/events/{eventId}/status
{
  "action": "reject",
  "reason": "Budget approval pending"
}
```
**Emails sent to:**
- All organizers ONLY
- ❌ Super admin does NOT receive (they did the rejection)
**With reason in email:**
"Budget approval pending"

---

### 5. Close Event ⭐ UPDATED
```bash
PUT /api/events/{eventId}/status
{
  "action": "close",
  "reason": "Event completed successfully"
}
```
**Emails sent to:**
- All organizers
- HOD (newly added)
- Super admin
- All department heads who were notified

---

## 🔍 How Recipients Are Found

### Super Admin
1. Look for user with `isadmin: true` in User collection
2. Or use `SUPER_ADMIN_EMAIL` from .env
3. Fallback: No email sent if not found

### HOD
1. Search Faculty with `department` matching event's `organizingDepartment`
2. And `designation` containing "HOD" or "Head"
3. Fallback: Search User model for HOD role
4. Fallback: Skip if not found

### Organizers
Directly from event: `event.requestDetails.organizerDetails.organizers[].email`

### Department Heads/Coordinators
Based on event's `requestDetails.requirementDetails`:
1. `venueRequired: true` → Find user with role "Venue Coordinator"
2. `audioRequired: true` → Find user with role "Audio Coordinator"
3. `ictsRequired: true` → Find user with role "ICTS Coordinator"
4. `transportRequired: true` → Find user with role "Transport Coordinator"
5. Similar for: accommodation, media, food, purchase
6. Fallback: Search Faculty model if User search fails
7. Skip if coordinator not found

---

## 📧 Email Configuration

Make sure your `.env` has:
```env
# Gmail SMTP configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Optional fallback for super admin
SUPER_ADMIN_EMAIL=admin@college.edu
```

**Important:** Gmail app passwords work better than regular passwords. Follow these steps:
1. Enable 2FA on Gmail
2. Go to myaccount.google.com/apppasswords
3. Generate app-specific password for "Mail"
4. Use that in EMAIL_PASS

---

## 🧪 Quick Test Steps

1. **Create event in Postman:**
   - POST /api/events with event data and `isSubmitted: true`
   - Check recipient emails in logs
   - Verify emails sent to organizers, HOD, super admin

2. **Test HOD approval:**
   - PUT /api/events/{id}/status with `action: "hodApprove"`
   - Check if organizers and super admin received email

3. **Test admin approval:**
   - PUT /api/events/{id}/status with `action: "adminApprove"`
   - Check if department heads received individual emails

4. **Check email logs:**
   - Terminal should show: `✓ [Function] notification sent to N recipients`
   - Or error messages if emails failed

---

## ⚠️ Important Notes

1. **Async Operations:** Emails are sent asynchronously (no blocking)
2. **Error Handling:** Individual email failures don't stop the event process
3. **Recipient Validation:** Invalid emails are silently skipped
4. **Department Logic:** Based on `requestDetails.requirementDetails` flags
5. **Status Updates:** Use `updateEventStatus` endpoint for all workflow changes

---

## 📞 Common Issues & Solutions

### "No emails being sent"
- [ ] Check EMAIL_USER and EMAIL_PASS in .env
- [ ] Check Gmail allows "Less Secure App Access"
- [ ] Look for console errors starting with "Error sending email"
- [ ] Verify recipient emails exist in database

### "Wrong recipients"
- [ ] Verify User/Faculty records have correct roles/designations
- [ ] Check event's `requirementDetails` has correct flags
- [ ] Ensure HOD designation contains "HOD" or "Head" keyword
- [ ] Check coordinator user roles match mapping in eventNotifications.js

### "Email templates not found"
- [ ] Verify all 6 template files exist in /utils/mailTemplates/
- [ ] Check file names exactly match require statements
- [ ] Restart Node server after adding templates

---

## 🎯 Next Steps (Optional Enhancements)

1. Add email tracking/logging to database
2. Create email templates UI for customization
3. Add email retry mechanism
4. Implement email scheduling (send at specific times)
5. Add email preview functionality in admin panel
6. Create email analytics dashboard
7. Add SMS notifications as fallback
8. Implement notification preferences per user

---

## 📞 Support

For issues or questions:
1. Check EMAIL_NOTIFICATION_GUIDE.md for detailed information
2. Review console logs for error messages
3. Verify database records have required email fields
4. Check .env configuration
5. Test with sample data from Postman collection

