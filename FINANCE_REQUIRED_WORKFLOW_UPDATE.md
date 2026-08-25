# Faculty Individual Request Workflow Update
## Finance Required (YES/NO) Implementation

### Overview
Updated the Faculty Individual Request workflow to ensure that when a faculty submits any Individual Request with `financeRequired` set to either "yes" or "no", **both Super Admin 1 and Super Admin 2** receive the request and can see it in their pending lists. Previously, the routing was based on the `financeRequired` value, restricting visibility to one Super Admin.

---

## Key Requirements Implemented

1. **Unified Visibility for Both Super Admins**
   - Both Super Admin 1 and Super Admin 2 can now see all individual requests
   - Regardless of `financeRequired` value (yes/no), both Super Admins receive notifications
   - Both appear in each Super Admin's pending request list

2. **Independent Approval Tracking**
   - Added separate approval fields for each Super Admin:
     - `superAdmin1Approval` - tracks Super Admin 1's approval status
     - `superAdmin2Approval` - tracks Super Admin 2's approval status
   - Each Super Admin updates only their own approval status
   - Legacy `superAdminApproval` field maintained for backward compatibility

3. **Finance Field Validation**
   - Finance-related fields (amount/purpose) remain **required** when `financeRequired = "yes"`
   - Finance-related fields are **not required** when `financeRequired = "no"`
   - No changes to existing HOD or module-head approval workflows

---

## Files Modified

### 1. Database Models (Schema Updates)

#### **models/individual/IndividualFood.js**
- Added `superAdmin1Approval` object with fields: `status`, `reason`, `approvedBy`, `approvedAt`, `updatedAt`
- Added `superAdmin2Approval` object with the same structure
- Kept existing `superAdminApproval` for backward compatibility

#### **models/individual/IndividualMedia.js**
- Added `superAdmin1Approval` object
- Added `superAdmin2Approval` object
- Kept existing `superAdminApproval` for backward compatibility

#### **models/individual/IndividualPurchase.js**
- Added `superAdmin1Approval` object
- Added `superAdmin2Approval` object
- Kept existing `superAdminApproval` for backward compatibility

#### **models/individual/IndividualTransport.js**
- Added `superAdmin1Approval` object
- Added `superAdmin2Approval` object
- Kept existing `superAdminApproval` for backward compatibility

---

### 2. Controller Logic Updates

#### **controllers/individual/individualSubmissionController.js**

**Changes in `buildSubmissionFilter()` function:**
- **Removed** financeRequired-based filtering that restricted visibility
- **Changed** Super Admin filter from:
  ```javascript
  filter.$or = [
    { workflowStage: superStage },  // Only their stage
    { workflowStage: "Submitted" },
    buildAdminApprovedFilter(normalizedModule),
  ];
  ```
  To:
  ```javascript
  filter.$or = [
    { workflowStage: "SuperAdmin1" },     // Both stages now visible
    { workflowStage: "SuperAdmin2" },     // Both stages now visible
    { workflowStage: "Submitted" },
    buildAdminApprovedFilter(normalizedModule),
  ];
  ```
- **Result**: Both Super Admin 1 and Super Admin 2 can see requests at either Super Admin stage

**Changes in `superAdminApproval()` function:**
- **Removed** financeRequired constraint checks:
  - Removed check preventing Super Admin 1 from acting on finance-required submissions
  - Removed check requiring Super Admin 2 to only handle finance-required submissions
- **Updated** stage validation to allow both Super Admins to act at either stage:
  ```javascript
  // Before
  if (![expectedStage, "Submitted"].includes(item.workflowStage))
  
  // After
  if (!["SuperAdmin1", "SuperAdmin2", "Submitted"].includes(item.workflowStage))
  ```
- **Added** role-specific approval field updates:
  ```javascript
  const approvalField = role === "super admin 1" ? "superAdmin1Approval" : "superAdmin2Approval";
  item[approvalField].status = action === "approve" ? "Approved" : "Rejected";
  item[approvalField].reason = reason;
  item[approvalField].approvedBy = currentUser._id;
  item[approvalField].approvedAt = new Date();
  ```
- **Maintained** backward compatibility by also updating `superAdminApproval` field

---

### 3. Notification Updates

#### **controllers/individual/foodController.js**
- **Changed** roleHint from:
  ```javascript
  roleHint: foodData.financeRequired === "Yes" ? "super-admin2" : "super-admin1"
  ```
  To:
  ```javascript
  roleHint: "super-admin"  // Notifies both Super Admins
  ```

#### **controllers/individual/mediaController.js**
- **Changed** roleHint to `"super-admin"` to notify both Super Admins regardless of financeRequired

#### **controllers/individual/purchaseController.js**
- **Changed** roleHint to `"super-admin"` to notify both Super Admins regardless of financeRequired

#### **controllers/individual/transportController.js**
- **Changed** roleHint to `"super-admin"` to notify both Super Admins regardless of financeRequired

---

## Workflow Behavior

### Before Changes
```
Faculty submits request
    ↓
HOD approval
    ↓
IF financeRequired="Yes" → Route to Super Admin 2 ONLY
IF financeRequired="No"  → Route to Super Admin 1 ONLY
    ↓
(Only assigned Super Admin sees it)
    ↓
Super Admin approval
    ↓
Module Head review
    ↓
Approved
```

### After Changes
```
Faculty submits request (with financeRequired="yes" or "no")
    ↓
Both Super Admin 1 & 2 receive notification
    ↓
HOD approval
    ↓
Request routed to Super Admin stage (based on financeRequired)
    ↓
Both Super Admins can see it in their pending lists
(Both see SuperAdmin1 and SuperAdmin2 stage requests)
    ↓
Either Super Admin can approve/reject
(Each updates their own superAdmin1Approval or superAdmin2Approval)
    ↓
Module Head review
    ↓
Approved
```

---

## API Changes

### GET /submissions/list (or relevant GET endpoints)
**Super Admin 1 now sees:**
- Requests at "SuperAdmin1" stage
- Requests at "SuperAdmin2" stage ✨ (NEW)
- Requests at "Submitted" stage
- Admin-approved requests

**Super Admin 2 now sees:**
- Requests at "SuperAdmin1" stage ✨ (NEW)
- Requests at "SuperAdmin2" stage
- Requests at "Submitted" stage
- Admin-approved requests

### PUT /submissions/:id/super-admin-approval
**Both Super Admins can now:**
- Approve/reject requests at any SuperAdmin stage
- Update their role-specific approval field:
  - Super Admin 1 → `superAdmin1Approval`
  - Super Admin 2 → `superAdmin2Approval`
- See requests regardless of financeRequired value

---

## Backward Compatibility

- The legacy `superAdminApproval` field is still updated alongside the new role-specific fields
- Existing API responses will continue to work
- Migration of old requests not required (new fields default to empty/Pending status)
- All existing queries and logic remain functional

---

## Testing Recommendations

1. **Visibility Test**
   - Submit a request with `financeRequired="yes"` and verify both Super Admins see it
   - Submit a request with `financeRequired="no"` and verify both Super Admins see it

2. **Approval Test**
   - Have Super Admin 1 approve a request routed to Super Admin 2
   - Verify `superAdmin1Approval.status` updates
   - Verify workflow continues to DepartmentReview

3. **Notification Test**
   - Verify both Super Admins receive email notifications on submission
   - Check notification recipients regardless of financeRequired value

4. **Finance Field Validation**
   - Ensure finance fields remain required when `financeRequired="yes"`
   - Ensure finance fields are optional when `financeRequired="no"`

5. **Approval History**
   - Verify approval history captures both Super Admin actions correctly
   - Check history for each Super Admin approval separately

---

## Database Migration (if needed)

No database migration is required. The new fields will be created as needed:
- Existing documents will have empty/null values for new fields
- When a Super Admin acts, the fields will be populated
- Default values ensure backward compatibility

---

## Notes

- The HOD routing logic still uses `financeRequired` to determine the initial Super Admin stage (SuperAdmin1 for "No", SuperAdmin2 for "Yes")
- Both Super Admins can now see and act on requests at any stage
- Each Super Admin's approval is tracked independently
- The workflow moves to DepartmentReview after the first Super Admin approval (unless HOD rejected it)
- Finance field validation remains unchanged and is based only on the `financeRequired` value
