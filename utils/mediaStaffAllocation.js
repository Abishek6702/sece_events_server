const mongoose = require("mongoose");

const allocateDefaultMediaStaff = async (event) => {
  if (
    !event.mediaRequirementDetails?.mediaRequirements?.length
  ) {
    return;
  }

  // TODO:
  // Replace with DB fetch later
  const defaultPosterStaffs = [
    {
      facultyId: new mongoose.Types.ObjectId(),
      name: "Poster Staff 1",
      email:"poster.staff1@example.com"
    },
    // {
    //   facultyId: new mongoose.Types.ObjectId(),
    //   name: "Poster Staff 2",
    //   email:"poster.staff2@example.com"
    // },
  ];

  const defaultVideoStaffs = [
    {
      facultyId: new mongoose.Types.ObjectId(),
      name: "Video Staff 1",
      email:"video.staff1@example.com"
    },
    // {
    //   facultyId: new mongoose.Types.ObjectId(),
    //   name: "Video Staff 2",
    //   email:"video.staff2@example.com"
    // },
  ];

  event.mediaRequirementDetails.mediaRequirements.forEach(
    (media) => {

      if (
        media.typeOfMedia?.includes("poster")
      ) {
        media.poster.staff = defaultPosterStaffs;
      }

      if (
        media.typeOfMedia?.includes("video")
      ) {
        media.video.staff = defaultVideoStaffs;
      }
    }
  );
};

module.exports = {
  allocateDefaultMediaStaff,
};