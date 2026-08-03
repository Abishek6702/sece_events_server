const normalizeMediaTypes = (mediaTypes = []) => {
  if (!Array.isArray(mediaTypes)) {
    return [];
  }

  return mediaTypes
    .map((value) => String(value || "").trim())
    .filter(Boolean);
};

const getMediaDepartmentName = (mediaTypes = []) => {
  const types = normalizeMediaTypes(mediaTypes);

  if (types.includes("Video")) {
    return "Video";
  }

  if (types.includes("Poster")) {
    return "Poster";
  }

  return "Media";
};

const getDefaultMediaAdminEmail = (mediaTypes = []) => {
  const department = getMediaDepartmentName(mediaTypes);

  if (department === "Video") {
    return "balaji.s@sece.ac.in";
  }

  return "anand.p@sece.ac.in";
};

const isAllowedMediaAssignmentInterchange = (user = {}, departmentName = "", assignedOwner = null) => {
  const normalizedRole = String(user?.role || "").trim().toLowerCase();
  const normalizedDepartment = String(departmentName || "").trim().toLowerCase();
  const isAdmin = Boolean(user?.isadmin);
  const currentUserEmail = String(user?.email || "").trim().toLowerCase();
  const defaultAdminEmail = getDefaultMediaAdminEmail([normalizedDepartment === "video" ? "Video" : normalizedDepartment === "poster" ? "Poster" : "Media"]);
  const assignedOwnerEmail = String(assignedOwner?.email || "").trim().toLowerCase();
  const assignedOwnerId = assignedOwner?._id ? String(assignedOwner._id) : "";
  const currentUserId = user?._id ? String(user._id) : "";

  if (isAdmin) {
    return true;
  }

  const isDefaultAdmin = currentUserEmail === defaultAdminEmail;
  const isAssignedOwner = Boolean(assignedOwnerEmail && currentUserEmail && assignedOwnerEmail === currentUserEmail) ||
    (assignedOwnerId && currentUserId && assignedOwnerId === currentUserId);

  return isDefaultAdmin && isAssignedOwner;
};

const buildMediaRequestVisibilityFilter = (user = {}, mediaType = "") => {
  const normalizedMediaType = String(mediaType || "").trim().toLowerCase();
  const mediaValue = normalizedMediaType === "video" ? "Video" : "Poster";
  const currentUserEmail = String(user?.email || "").trim().toLowerCase();
  const defaultAdminEmail = normalizedMediaType === "video"
    ? "balaji.s@sece.ac.in"
    : "anand.p@sece.ac.in";

  if (currentUserEmail === defaultAdminEmail) {
    return {
      typeOfMedia: { $in: [mediaValue] },
    };
  }

  if (!user?._id) {
    return {
      typeOfMedia: { $in: [mediaValue] },
      _id: null,
    };
  }

  return {
    typeOfMedia: { $in: [mediaValue] },
    assignedTo: user._id,
  };
};

const isValidMediaAssignmentTargetDepartment = (user = {}, requestedDepartment = "", targetDepartment = "") => {
  const normalizedRequestedDepartment = String(requestedDepartment || "").trim().toLowerCase();
  const normalizedTargetDepartment = String(targetDepartment || "").trim().toLowerCase();
  const normalizedRole = String(user?.role || "").trim().toLowerCase();
  const isAdmin = Boolean(user?.isadmin);
  const isMediaHead = normalizedRole === "media head";

  if (!normalizedRequestedDepartment || !normalizedTargetDepartment) {
    return false;
  }

  if (isAdmin || isMediaHead) {
    return ["poster", "video", "media"].includes(normalizedTargetDepartment);
  }

  return normalizedTargetDepartment === normalizedRequestedDepartment || normalizedTargetDepartment === "media" || normalizedRequestedDepartment === "media";
};

module.exports = {
  normalizeMediaTypes,
  getMediaDepartmentName,
  getDefaultMediaAdminEmail,
  isAllowedMediaAssignmentInterchange,
  isValidMediaAssignmentTargetDepartment,
  buildMediaRequestVisibilityFilter,
};
