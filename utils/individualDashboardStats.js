const getStatusLabel = (value = "") => String(value || "").trim().toLowerCase();

const normalizeName = (value) => String(value || "").trim();

const getCurrentStatus = (record) => {
  const workflowStage = getStatusLabel(record?.workflowStage);
  const headStatus = getStatusLabel(record?.headApproval?.status);
  const finalStatus = getStatusLabel(record?.finalStatus);
  const status = getStatusLabel(
    typeof record?.status === "string" ? record.status : "",
  );

  if (workflowStage === "completed") return "completed";
  if (workflowStage === "rejected" || headStatus === "rejected" || finalStatus === "rejected") {
    return "rejected";
  }
  if (workflowStage === "pending" || headStatus === "pending" || finalStatus === "pending") {
    return "pending";
  }
  if (workflowStage === "approved" || finalStatus === "approved" || status === "approved") {
    return "approved";
  }
  if (status === "rejected") return "rejected";
  if (["completed", "closed"].includes(finalStatus)) return "completed";
  return "pending";
};

const getStatusCount = (record, status) => {
  return getCurrentStatus(record) === status ? 1 : 0;
};

const getSuperAdminApprover = (record) => {
  const roleSpecificApprovals = [
    record?.superAdmin1Approval,
    record?.superAdmin2Approval,
  ].filter((approval) => approval?.approvedBy);

  if (roleSpecificApprovals.length > 0) {
    return roleSpecificApprovals.sort((first, second) => {
      const firstDate = new Date(first.updatedAt || first.approvedAt || 0).getTime();
      const secondDate = new Date(second.updatedAt || second.approvedAt || 0).getTime();
      return secondDate - firstDate;
    })[0].approvedBy;
  }

  return record?.superAdminApproval?.approvedBy || null;
};

exports.getCurrentStatus = getCurrentStatus;

exports.buildIndividualDashboardBreakdowns = (records = [], departmentHodMap = {}) => {
  const facultyMap = new Map();
  const departmentMap = new Map();
  const superadminMap = new Map();
  const headMap = new Map();

  for (const record of records) {
    const facultyName = normalizeName(record?.employee?.name || record?.employee?.email || "");
    const departmentName = normalizeName(record?.employee?.department || "Unknown");
    const headName = normalizeName(
      record?.headApproval?.approvedBy?.name ||
        record?.headApproval?.approvedBy?.email ||
        "Unassigned",
    );
    const hodInfo = departmentHodMap[departmentName] || {};

    if (facultyName) {
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
    }

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

    const approver = getSuperAdminApprover(record);
    const superadminName = normalizeName(
      approver?.name || approver?.email || "Unassigned",
    );
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

    const headEntry = headMap.get(headName) || {
      label: headName,
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };

    headEntry.total += 1;
    headEntry.pending += getStatusCount(record, "pending");
    headEntry.approved += getStatusCount(record, "approved");
    headEntry.rejected += getStatusCount(record, "rejected");
    headEntry.completed += getStatusCount(record, "completed");
    headMap.set(headName, headEntry);
  }

  return {
    facultyWise: [...facultyMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
    departmentWise: [...departmentMap.values()].sort((a, b) => a.department.localeCompare(b.department)),
    superadminWise: [...superadminMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
    headWise: [...headMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
  };
};
