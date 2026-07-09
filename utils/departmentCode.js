const departmentCodeMap = {
  "Computer Science and Engineering": "CSE",
  "Computer Science & Engineering": "CSE",

  "Electronics and Communication Engineering": "ECE",
  "Electronics & Communication Engineering": "ECE",

  "Electrical and Electronics Engineering": "EEE",
  "Electrical & Electronics Engineering": "EEE",

  "Information Technology": "IT",

  "Mechanical Engineering": "MECH",

  "Civil Engineering": "CIVIL",

  "Artificial Intelligence and Data Science": "AIDS",

  "Artificial Intelligence & Data Science": "AIDS",

  "Artificial Intelligence and Machine Learning": "AIML",

  "Master of Business Administration": "MBA",

  "Master of Computer Applications": "MCA",

  "Science and Humanities": "S&H",

  "Physics": "PHY",

  "Chemistry": "CHEM",

  'Mathematics': "MATH",

  "English": "ENG",
  "CSE": "CSE",
  "ECE": "ECE",
  "EEE": "EEE",
  "IT": "IT",
  "MECH": "MECH",
  "CIVIL": "CIVIL",
  "AIDS": "AIDS",
  "AIML": "AIML",
  "MBA": "MBA",
  "MCA": "MCA",
  "S&H": "S&H",
  "PHY": "PHY",
  "CHEM": "CHEM",
  "MATH": "MATH",
  "ENG": "ENG",
};

function getDepartmentCode(department) {
  return departmentCodeMap[department] || null;
}

module.exports = getDepartmentCode;
