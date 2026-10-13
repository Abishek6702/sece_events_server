const assert = require("assert");
const controller = require("../controllers/individual/individualSubmissionController");
const IndividualEventAttending = require("../models/individual/IndividualEventAttending");

const offCampusRequest = new IndividualEventAttending({
  offCampusFrom: "2026-10-01T09:00:00",
  offCampusTo: "2026-10-02T17:00:00",
  specialRequirement: "test",
  otherRequirements: "test",
  accommodation: "Yes",
  accommodationRequired: true,
  food: "Yes",
  foodRequired: true,
  transport: "Yes",
  transportRequired: true,
});
const offCampusResponse = offCampusRequest.toObject();
assert.strictEqual(
  offCampusResponse.offCampusFrom.toISOString(),
  new Date("2026-10-01T09:00:00").toISOString(),
);
assert.strictEqual(
  offCampusResponse.offCampusTo.toISOString(),
  new Date("2026-10-02T17:00:00").toISOString(),
);
assert.strictEqual(offCampusResponse.otherRequirements, "test");
assert.strictEqual(offCampusResponse.specialRequirement, "test");
assert.strictEqual(offCampusResponse.accommodation, "Yes");
assert.strictEqual(offCampusResponse.accommodationRequired, true);
assert.strictEqual(offCampusResponse.food, "Yes");
assert.strictEqual(offCampusResponse.foodRequired, true);
assert.strictEqual(offCampusResponse.transport, "Yes");
assert.strictEqual(offCampusResponse.transportRequired, true);

const initialEntry = controller.buildApprovalHistoryEntry({
  role: "hod",
  approvedBy: null,
  action: "Pending",
  remarks: "Waiting for HOD approval",
  actionDate: null,
});

assert.strictEqual(initialEntry.role, "hod");
assert.strictEqual(initialEntry.action, "Pending");
assert.strictEqual(initialEntry.remarks, "Waiting for HOD approval");

const item = { approvalHistory: [] };
controller.upsertApprovalHistoryEntry(item, initialEntry);
assert.strictEqual(item.approvalHistory.length, 1);

controller.upsertApprovalHistoryEntry(
  item,
  controller.buildApprovalHistoryEntry({
    role: "hod",
    approvedBy: "user-1",
    action: "Approved",
    remarks: "Approved",
    actionDate: new Date(),
  })
);

assert.strictEqual(item.approvalHistory[0].action, "Approved");
assert.strictEqual(item.approvalHistory[0].approvedBy, "user-1");

const mediaItem = { constructor: { modelName: "IndividualMedia" }, status: "Pending" };
controller.setSubmissionStatus(mediaItem, "Approved");
assert.strictEqual(mediaItem.status, "Completed");
controller.setSubmissionStatus(mediaItem, "Rejected");
assert.strictEqual(mediaItem.status, "Rejected");

const internalEvent = { constructor: { modelName: "IndividualEventAttending" }, externalTransportRequired: false };
assert.strictEqual(
  controller.applySuperAdminApprovalOutcome(internalEvent, IndividualEventAttending),
  null,
);
assert.strictEqual(internalEvent.workflowStage, "Completed");
assert.strictEqual(internalEvent.finalStatus, "Completed");
assert.strictEqual(internalEvent.status, "Completed");

const externalEvent = { constructor: { modelName: "IndividualEventAttending" }, externalTransportRequired: true };
assert.strictEqual(
  controller.applySuperAdminApprovalOutcome(externalEvent, IndividualEventAttending),
  "external transport head",
);
assert.strictEqual(externalEvent.workflowStage, "DepartmentReview");
assert.strictEqual(externalEvent.finalStatus, "Pending");

const externalHeadApprovedEvent = {
  constructor: { modelName: "IndividualEventAttending" },
  externalTransportRequired: true,
  approvalHistory: [],
};
controller.applyExternalTransportHeadApproval(externalHeadApprovedEvent, "head-1");
assert.strictEqual(externalHeadApprovedEvent.workflowStage, "Completed");
assert.strictEqual(externalHeadApprovedEvent.finalStatus, "Completed");
assert.strictEqual(externalHeadApprovedEvent.status, "Completed");
assert.strictEqual(externalHeadApprovedEvent.headApproval.status, "Completed");
assert.strictEqual(externalHeadApprovedEvent.approvalHistory[0].role, "external transport head");

const externalTransportResponse = controller.buildSubmissionItem(
  { _id: "request-1", externalTransportRequired: true },
  "Event Attending",
  null,
);
assert.strictEqual(externalTransportResponse.department, "Externaltransport");

const internalTransportResponse = controller.buildSubmissionItem(
  { _id: "request-2", externalTransportRequired: false },
  "Event Attending",
  null,
);
assert.strictEqual(Object.hasOwn(internalTransportResponse, "department"), false);

(async () => {
  const externalHeadFilter = await controller.buildSubmissionFilter({
    module: "eventattending",
    user: { role: "External Transport Head" },
    applyReviewFilter: true,
  });
  assert.strictEqual(externalHeadFilter.externalTransportRequired, true);
  assert.strictEqual(externalHeadFilter.employee, undefined);

  console.log("workflow history tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
