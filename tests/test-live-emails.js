require("dotenv").config();

// MOCK the DB Models to return the specific emails WITHOUT saving to DB
const Faculty = require("../models/Faculty");
const User = require("../models/User");

// Mapping based on your provided live emails
const emails = {
  hod: "dharshanmohan2704@gmail.com",
  superAdmin: "abishek.k@sece.ac.in",
  venue: "fayazahammed.m@sece.ac.in",
  audio: "nishanth20112003@gmail.com",
  icts: "sathiyavijaya1999@gmail.com",
  transport: "dharshan.pm@sece.ac.in",
  food: "venkateshwaran.c@sece.ac.in",
  accommodation: "sathiya.p@sece.ac.in",
  purchase: "abishektkrishna@gmail.com",
  media: "abishekkrishna69@gmail.com"
};

// Override Mongoose methods to bypass DB completely and just return your emails
Faculty.findOne = function(query) {
  return {
    select: function(fields) {
      if (query.designation && query.designation.$regex && query.designation.$regex.includes("HOD")) {
        return Promise.resolve({ email: emails.hod });
      }
      return Promise.resolve(null);
    }
  };
};

User.findOne = function(query) {
  return {
    select: function(fields) {
      if (query.isadmin) return Promise.resolve({ email: emails.superAdmin });
      
      if (query.role && query.role.$regex) {
        const role = query.role.$regex.toLowerCase();
        if (role.includes("venue")) return Promise.resolve({ email: emails.venue });
        if (role.includes("audio")) return Promise.resolve({ email: emails.audio });
        if (role.includes("icts")) return Promise.resolve({ email: emails.icts });
        if (role.includes("transport")) return Promise.resolve({ email: emails.transport });
        if (role.includes("food")) return Promise.resolve({ email: emails.food });
        if (role.includes("accommodation")) return Promise.resolve({ email: emails.accommodation });
        if (role.includes("purchase")) return Promise.resolve({ email: emails.purchase });
        if (role.includes("media")) return Promise.resolve({ email: emails.media });
      }
      return Promise.resolve(null);
    }
  };
};

const {
  notifyEventCreation,
  notifyHODApproval,
  notifyAdminApproval,
  notifyDepartmentHeads,
  notifyEventRejection,
  notifyEventClosure,
} = require("../utils/eventNotifications");

// Fake Event using your organizers
const testEvent = {
  _id: "test_event_live_123",
  requestDetails: {
    organizerDetails: {
      organizingDepartment: "Computer Science",
      organizers: [
        { name: "Organizer 1", email: "venkateshwaran.c15@gmail.com" },
        { name: "Organizer 2", email: "abishekkrishnat2@gmail.com" } // fixed missing @
      ]
    },
    eventDetails: {
      eventName: "LIVE TEST SUMMIT 2024",
      eventSchedule: [{ eventDate: new Date() }]
    },
    requirementDetails: {
      venueRequired: true,
      audioRequired: true,
      ictsRequired: true,
      transportRequired: true,
      foodRequired: true,
      accommodationRequired: true,
      purchaseRequired: true,
      mediaRequired: true,
    }
  }
};

async function runLiveTest() {
  console.log("🚀 Running LIVE Email Test (NO DB CREATION)...");
  console.log("⚠️ THIS WILL SEND ACTUAL EMAILS!\n");
  
  try {
    // 1. Event Creation
    console.log("1️⃣ Sending Event Creation Emails...");
    await notifyEventCreation(testEvent);
    
    // 2. HOD Approval
    console.log("\n2️⃣ Sending HOD Approval Emails...");
    await notifyHODApproval(testEvent);
    
    // 3. Admin Approval
    console.log("\n3️⃣ Sending Admin Approval Emails...");
    await notifyAdminApproval(testEvent);
    
    // 4. Department Heads
    console.log("\n4️⃣ Sending Department Head Emails...");
    await notifyDepartmentHeads(testEvent);
    
    // 5. Event Rejection
    console.log("\n5️⃣ Sending Event Rejection Emails...");
    await notifyEventRejection(testEvent, "This is a live test rejection reason.");
    
    // 6. Event Closure
    console.log("\n6️⃣ Sending Event Closure Emails...");
    await notifyEventClosure(testEvent, "This is a live test closure reason.");
    
    console.log("\n✅ Live Email Test Completed successfully! Check the inboxes.");
  } catch (error) {
    console.error("\n❌ Error during live test:", error);
  } finally {
    process.exit(0);
  }
}

runLiveTest();
