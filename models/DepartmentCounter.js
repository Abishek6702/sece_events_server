const mongoose = require("mongoose");

const departmentCounterSchema = new mongoose.Schema(
{
    financialYear:{
        type:String,
        required:true
    },

    department:{
        type:String,
        required:true
    },

    counter:{
        type:Number,
        default:0
    }
});

departmentCounterSchema.index(
{
    financialYear:1,
    department:1
},
{
    unique:true
});

module.exports = mongoose.model(
    "DepartmentCounter",
    departmentCounterSchema
);