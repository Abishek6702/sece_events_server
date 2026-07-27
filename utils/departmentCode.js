const departmentCodeMap = {

  //  final departments
"CCE":"CCE",
"MECH":"MECH",
"AIML":"AIML",
"CSE":"CSE",
"ECE":"ECE",
"EEE":"EEE",
"AI&DS":"AI&DS",
"CFRD":"CFRD",
"IQAC":"IQAC",
"MATHS":"MATHS",
"S&H":"S&H",
"IR":"IR",
"CSBS":"CSBS",
"IT":"IT",
"CYS":"CYS",
"PLACEMENT":"PLACEMENT",
"PD":"PD",
"INNOVATION":"INNOVATION",
"COE":"COE",
"HR":"HR",

};

function getDepartmentCode(department) {
  return departmentCodeMap[department] || null;
}

module.exports = getDepartmentCode;
