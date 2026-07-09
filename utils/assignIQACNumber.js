const generateIQACNumber = require("./generateIQACNumber");
const getDepartmentCode = require("./departmentCode");

async function assignIQACNumber(event, session = null) {
  // Already assigned
  if (event.iqacNumber) {
    return;
  }

  const department =
    event.requestDetails?.organizerDetails?.organizingDepartment;

  if (!department) {
    throw new Error("Organizer department is missing.");
  }

  const departmentCode = getDepartmentCode(department);

  if (!departmentCode) {
    throw new Error(
      `Department code not configured for '${department}'`
    );
  }

  event.iqacNumber = await generateIQACNumber(
    departmentCode,
    session
  );
}

module.exports = assignIQACNumber;