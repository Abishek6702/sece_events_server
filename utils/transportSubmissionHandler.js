const {
    checkTransportAvailability,
    deductTransportInventory,
  } = require("./transport");
  
  const handleTransportSubmission = async (
    event,
    session = null
  ) => {
  
    if (
      !event.requestDetails?.requirementDetails?.transportRequired
    ) {
      return;
    }
  
    if (
      !event.transportDetails?.transports?.length
    ) {
      return;
    }
  
    for (const transport of event.transportDetails.transports) {
  
      await checkTransportAvailability(
        transport.vehicles
      );
  
      await deductTransportInventory(
        transport.vehicles,
        session
      );
    }
  };
  
  module.exports = {
    handleTransportSubmission,
  };