const mongoose = require("mongoose");

const dropLegacyDepartmentCounterIndexes = async () => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return;
    }

    const collection = mongoose.connection.db.collection("individualdepartmentcounters");
    const indexes = await collection.indexInformation();

    ["financialYear_1", "departmentCode_1", "financialYear_1_departmentCode_1"].forEach((indexName) => {
      if (indexes[indexName]) {
        collection.dropIndex(indexName).catch(() => {});
      }
    });
  } catch (error) {
    if (!/index.*not found|not found/i.test(error.message)) {
      console.warn("Unable to drop legacy department counter indexes:", error.message);
    }
  }
};

if (mongoose.connection.readyState === 1) {
  dropLegacyDepartmentCounterIndexes().catch(() => {});
} else {
  mongoose.connection.once("open", () => {
    dropLegacyDepartmentCounterIndexes().catch(() => {});
  });
}

const individualDepartmentCounterSchema = new mongoose.Schema(
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
    departmentCode: {
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

individualDepartmentCounterSchema.index(
  {
    module: 1,
    financialYear: 1,
    departmentCode: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model(
  "IndividualDepartmentCounter",
  individualDepartmentCounterSchema,
);
