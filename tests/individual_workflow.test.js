const assert = require("assert");
const controller = require("../controllers/individual/individualSubmissionController");

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

console.log("workflow history tests passed");
