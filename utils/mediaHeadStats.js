const getMediaRequirementStats = (events, requirementKey) => {
  return events.reduce(
    (stats, event) => {
      for (const requirement of event[requirementKey] || []) {
        stats.total += 1;

        if (requirement.status === "Completed") {
          stats.completed += 1;
        } else if (requirement.status === "Acknowledged") {
          stats.acknowledged += 1;
          stats.approved += 1;
        } else {
          stats.pending += 1;
        }
      }
      return stats;
    },
    { total: 0, pending: 0, acknowledged: 0, approved: 0, completed: 0 },
  );
};

const getMediaDepartmentStats = (events, requirementKey) => {
  const counts = new Map();

  for (const event of events) {
    const department = event.organizingDepartment || "Unknown";
    const requestCount = (event[requirementKey] || []).length;
    counts.set(department, (counts.get(department) || 0) + requestCount);
  }

  return [...counts.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count || a.department.localeCompare(b.department));
};

const buildMediaHeadStatsPayload = (email, events, requirementKey) => ({
  success: true,
  email,
  totalEvents: events.length,
  stats: getMediaRequirementStats(events, requirementKey),
  departmentStats: getMediaDepartmentStats(events, requirementKey),
});

module.exports = {
  getMediaRequirementStats,
  getMediaDepartmentStats,
  buildMediaHeadStatsPayload,
};
