const getStatusLabel = (value = "") => String(value || "").trim().toLowerCase();

const normalizeName = (value) => String(value || "").trim();

const getStatusCount = (record, status) => {
  const normalizedStatus = getStatusLabel(record?.finalStatus);

  if (status === "pending") {
    return ["pending", "", null, undefined].includes(normalizedStatus) ? 1 : 0;
  }

  if (status === "approved") {
    return normalizedStatus === "approved" ? 1 : 0;
  }

  if (status === "rejected") {
    return normalizedStatus === "rejected" ? 1 : 0;
  }

  if (status === "completed") {
    return ["completed", "closed"].includes(normalizedStatus) ? 1 : 0;
  }

  return 0;
};

exports.buildIndividualDashboardBreakdowns = (records = [], departmentHodMap = {}) => {
  const facultyMap = new Map();
  const departmentMap = new Map();
  const superadminMap = new Map();

  for (const record of records) {
    const facultyName = normalizeName(record?.employee?.name || record?.employee?.email || "Unknown");
    const departmentName = normalizeName(record?.employee?.department || "Unknown");
    const superadminName = normalizeName(
      record?.superAdminApproval?.approvedBy?.name ||
        record?.superAdminApproval?.approvedBy?.email ||
        "Unassigned",
    );
    const hodInfo = departmentHodMap[departmentName] || {};

    const facultyEntry = facultyMap.get(facultyName) || {
      label: facultyName,
      department: departmentName,
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };

    facultyEntry.total += 1;
    facultyEntry.pending += getStatusCount(record, "pending");
    facultyEntry.approved += getStatusCount(record, "approved");
    facultyEntry.rejected += getStatusCount(record, "rejected");
    facultyEntry.completed += getStatusCount(record, "completed");
    facultyMap.set(facultyName, facultyEntry);

    const departmentEntry = departmentMap.get(departmentName) || {
      department: departmentName,
      hodName: hodInfo.name || "",
      hodEmail: hodInfo.email || "",
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };

    departmentEntry.total += 1;
    departmentEntry.pending += getStatusCount(record, "pending");
    departmentEntry.approved += getStatusCount(record, "approved");
    departmentEntry.rejected += getStatusCount(record, "rejected");
    departmentEntry.completed += getStatusCount(record, "completed");
    departmentMap.set(departmentName, departmentEntry);

    const superadminEntry = superadminMap.get(superadminName) || {
      label: superadminName,
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };

    superadminEntry.total += 1;
    superadminEntry.pending += getStatusCount(record, "pending");
    superadminEntry.approved += getStatusCount(record, "approved");
    superadminEntry.rejected += getStatusCount(record, "rejected");
    superadminEntry.completed += getStatusCount(record, "completed");
    superadminMap.set(superadminName, superadminEntry);
  }

  return {
    facultyWise: [...facultyMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
    departmentWise: [...departmentMap.values()].sort((a, b) => a.department.localeCompare(b.department)),
    superadminWise: [...superadminMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
  };
};
