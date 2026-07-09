const mongoose = require("mongoose");

const financialYearCounterSchema = new mongoose.Schema(
{
    financialYear:{
        type:String,
        unique:true,
        required:true
    },

    counter:{
        type:Number,
        default:0
    }
});

module.exports = mongoose.model(
    "FinancialYearCounter",
    financialYearCounterSchema
);