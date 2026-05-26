const TransportInventory = require("../models/TransportInventory");


// ============================================
// CHECK AVAILABILITY
// ============================================

const checkTransportAvailability = async (vehicles = []) => {
  for (const vehicle of vehicles) {

    const inventory = await TransportInventory.findOne({
      vehicleType: vehicle.type,
      isActive: true,
    });

    if (!inventory) {
      throw new Error(
        `${vehicle.type} inventory not found`
      );
    }

    if (inventory.availableCount < vehicle.count) {
      throw new Error(
        `${vehicle.type} only ${inventory.availableCount} available`
      );
    }
  }

  return true;
};


// ============================================
// DEDUCT VEHICLES
// ============================================

const deductTransportInventory = async (
  vehicles = [],
  session = null
) => {

  for (const vehicle of vehicles) {

    const inventory = await TransportInventory.findOne({
      vehicleType: vehicle.type,
      isActive: true,
    }).session(session);

    if (!inventory) {
      throw new Error(
        `${vehicle.type} inventory not found`
      );
    }

    if (inventory.availableCount < vehicle.count) {
      throw new Error(
        `${vehicle.type} insufficient availability`
      );
    }

    inventory.availableCount -= vehicle.count;

    await inventory.save({ session });
  }
};


// ============================================
// RESTORE VEHICLES
// ============================================

const restoreTransportInventory = async (
  vehicles = [],
  session = null
) => {

  for (const vehicle of vehicles) {

    await TransportInventory.updateOne(
      {
        vehicleType: vehicle.type,
      },
      {
        $inc: {
          availableCount: vehicle.count,
        },
      },
      { session }
    );
  }
};


// ============================================
// GET CURRENT INVENTORY
// ============================================

const getTransportInventory = async () => {

  return await TransportInventory.find({
    isActive: true,
  }).sort({
    vehicleType: 1,
  });
};


// ============================================
// EXPORTS
// ============================================

module.exports = {
  checkTransportAvailability,
  deductTransportInventory,
  restoreTransportInventory,
  getTransportInventory,
};