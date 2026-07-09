const FinancialYearCounter = require("../models/FinancialYearCounter");
const DepartmentCounter = require("../models/DepartmentCounter");

async function generateIQACNumber(departmentCode, session = null) {
  // ===== Financial Year =====
  const today = new Date();

  let startYear;
  let endYear;

  // Financial year starts in April
  if (today.getMonth() >= 3) {
    startYear = today.getFullYear();
    endYear = startYear + 1;
  } else {
    endYear = today.getFullYear();
    startYear = endYear - 1;
  }

  const financialYear = `${startYear}-${String(endYear).slice(-2)}`;

  // ===== Global Counter =====
  const globalCounter = await FinancialYearCounter.findOneAndUpdate(
    { financialYear },
    {
      $inc: { counter: 1 },
      $setOnInsert: {
        financialYear,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      session,
    }
  );

  // ===== Department Counter =====
  const departmentCounter = await DepartmentCounter.findOneAndUpdate(
    {
      financialYear,
      department: departmentCode,
    },
    {
      $inc: { counter: 1 },
      $setOnInsert: {
        financialYear,
        department: departmentCode,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      session,
    }
  );

  const globalNo = String(globalCounter.counter).padStart(3, "0");
  const deptNo = String(departmentCounter.counter).padStart(3, "0");

  return `I/${financialYear}/${globalNo}/${departmentCode}/${deptNo}`;
}

module.exports = generateIQACNumber;