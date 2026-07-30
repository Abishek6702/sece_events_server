const mongoose = require("mongoose");

const dropLegacyFinancialYearIndex = async () => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return;
    }

    const collection = mongoose.connection.db.collection("individualfinancialyearcounters");
    const indexes = await collection.indexInformation();

    if (indexes.financialYear_1) {
      await collection.dropIndex("financialYear_1");
    }
  } catch (error) {
    if (!/index.*not found|not found/i.test(error.message)) {
      console.warn("Unable to drop legacy financialYear index:", error.message);
    }
  }
};

if (mongoose.connection.readyState === 1) {
  dropLegacyFinancialYearIndex().catch(() => {});
} else {
  mongoose.connection.once("open", () => {
    dropLegacyFinancialYearIndex().catch(() => {});
  });
}

const individualFinancialYearCounterSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      enum: ["FOOD", "PURCHASE", "MEDIA", "TRANSPORT"],
    },
    financialYear: {
      type: String,
      required: true,
    },
    lastSequence: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

individualFinancialYearCounterSchema.index(
  {
    module: 1,
    financialYear: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model(
  "IndividualFinancialYearCounter",
  individualFinancialYearCounterSchema,
);
