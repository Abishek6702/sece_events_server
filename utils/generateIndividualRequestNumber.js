const FinancialYearCounter = require("../models/FinancialYearCounter");
const DepartmentCounter = require("../models/DepartmentCounter");

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

  const globalNo = String(globalCounterValue).padStart(6, "0");
  const deptNo = String(departmentCounterValue).padStart(4, "0");

  return `${normalizedModule}/${financialYear}/${globalNo}/${normalizedDepartment}/${deptNo}`;
}

async function generateIndividualRequestNumber(moduleName, departmentCode, session = null) {
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
    FinancialYearCounter.findOneAndUpdate(
      { financialYear },
      {
        $inc: { counter: 1 },
        $setOnInsert: { financialYear },
      },
      {
        returnDocument: "after",
        upsert: true,
        session,
      },
    ),
    DepartmentCounter.findOneAndUpdate(
      {
        financialYear,
        department: normalizedDepartment,
      },
      {
        $inc: { counter: 1 },
        $setOnInsert: {
          financialYear,
          department: normalizedDepartment,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        session,
      },
    ),
  ]);

  return formatIndividualRequestNumber({
    moduleName: normalizedModule,
    financialYear,
    globalCounterValue: globalCounter.counter,
    departmentCode: normalizedDepartment,
    departmentCounterValue: departmentCounter.counter,
  });
}

module.exports = generateIndividualRequestNumber;
module.exports.getFinancialYear = getFinancialYear;
module.exports.formatIndividualRequestNumber = formatIndividualRequestNumber;
