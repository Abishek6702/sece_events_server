const IndividualFinancialYearCounter = require("../models/individual/IndividualFinancialYearCounter");
const IndividualDepartmentCounter = require("../models/individual/IndividualDepartmentCounter");

function getFinancialYear(date = new Date()) {
  const currentYear = date.getFullYear();
  const month = date.getMonth();

  const startYear = month >= 3 ? currentYear : currentYear - 1;
  const endYear = startYear + 1;

  return `${startYear}-${String(endYear).slice(-2)}`;
}

function formatIndividualRequestNumber({
  moduleName,
  financialYear,
  globalCounterValue,
  departmentCode,
  departmentCounterValue,
}) {
  const normalizedModule = String(moduleName || "").toUpperCase();
  const normalizedDepartment = String(departmentCode || "").trim().toUpperCase();

  if (
    globalCounterValue === null ||
    globalCounterValue === undefined ||
    departmentCounterValue === null ||
    departmentCounterValue === undefined
  ) {
    throw new Error("Counter values are required for request number generation.");
  }

  const globalNo = String(globalCounterValue).padStart(6, "0");
  const deptNo = String(departmentCounterValue).padStart(4, "0");

  return `${normalizedModule}/${financialYear}/${globalNo}/${normalizedDepartment}/${deptNo}`;
}

async function generateIndividualRequestNumber(moduleName, departmentCode, session = null, options = {}) {
  const normalizedModule = String(moduleName || "").trim().toUpperCase();
  const normalizedDepartment = String(departmentCode || "").trim().toUpperCase();

  if (!normalizedModule) {
    throw new Error("Module name is required for request number generation.");
  }

  if (!normalizedDepartment) {
    throw new Error("Department code is required for request number generation.");
  }

  const financialYear = getFinancialYear();

  const [globalCounter, departmentCounter] = await Promise.all([
    IndividualFinancialYearCounter.findOneAndUpdate(
      { module: normalizedModule, financialYear },
      {
        $inc: { lastSequence: 1 },
        $setOnInsert: { module: normalizedModule, financialYear },
      },
      {
        returnDocument: "after",
        upsert: true,
        session,
      },
    ),
    IndividualDepartmentCounter.findOneAndUpdate(
      {
        module: normalizedModule,
        financialYear,
        departmentCode: normalizedDepartment,
      },
      {
        $inc: { lastSequence: 1 },
        $setOnInsert: {
          module: normalizedModule,
          financialYear,
          departmentCode: normalizedDepartment,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        session,
      },
    ),
  ]);

  if (!globalCounter || !departmentCounter) {
    throw new Error("Unable to initialize request counters for the current financial year.");
  }

  const globalCounterValue = Number(globalCounter.lastSequence);
  const departmentCounterValue = Number(departmentCounter.lastSequence);

  if (!Number.isFinite(globalCounterValue) || !Number.isFinite(departmentCounterValue)) {
    throw new Error("Counter values are required for request number generation.");
  }

  const result = {
    moduleName: normalizedModule,
    financialYear,
    requestSequence: globalCounterValue,
    departmentCode: normalizedDepartment,
    departmentSequence: departmentCounterValue,
    requestNo: formatIndividualRequestNumber({
      moduleName: normalizedModule,
      financialYear,
      globalCounterValue,
      departmentCode: normalizedDepartment,
      departmentCounterValue,
    }),
  };

  if (options?.returnDetails) {
    return result;
  }

  return result.requestNo;
}

module.exports = generateIndividualRequestNumber;
module.exports.getFinancialYear = getFinancialYear;
module.exports.formatIndividualRequestNumber = formatIndividualRequestNumber;
