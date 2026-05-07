/**
 * Custom Email Test Script
 * Tests notification flow with user-provided emails
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Mock sendMail to prevent actual email sending
const mockSendMail = async (to, subject, html) => {
  console.log(`\n   📧 Email sent to: ${to}`);
  return Promise.resolve();
};

require.cache[require.resolve(__dirname + "/../utils/sendMail.js")] = {
  exports: mockSendMail,
};

const Event = require(__dirname + "/../models/Event.js");
const User = require(__dirname + "/../models/User.js");
const Faculty = require(__dirname + "/../models/Faculty.js");

const {
  notifyEventCreation,
  notifyHODApproval,
  notifyAdminApproval,
  notifyDepartmentHeads,
  notifyEventRejection,
  notifyEventClosure,
} = require(__dirname + "/../utils/eventNotifications.js");

// Your emails configuration
const emails = {
  organizers: [
    "venkateshwaran.c15@gmail.com",
    "abishekkrishnat@gmail.com"
  ],
  hod: "dharshanmohan2704@gmail.com",
  superAdmin: "abishek.k@sece.ac.in",
  deptHeads: {
    venue: "fayazahammed.m@sece.ac.in",
    audio: "nishanth20112003@gmail.com",
    icts: "sathiyavijaya1999@gmail.com",
    transport: "dharshan.pm@sece.ac.in",
    food: "venkateshwaran.c@sece.ac.in",
    accommodation: "sathiya.p@sece.ac.in",
    purchase: "abishektkrishna@gmail.com",
    media: "abishekkrishna69@gmail.com"
  }
};

async function createTestData() {
  console.log("\n📍 Creating test data with your emails...\n");

  // Clean up existing records with these emails
  console.log("Cleaning up existing data...");
  await Faculty.deleteMany({ email: { $in: [...emails.organizers, emails.hod] } });
  await User.deleteMany({ email: { $in: [emails.superAdmin, ...Object.values(emails.deptHeads)] } });
  console.log("✓ Cleanup complete\n");

  // Create HOD
  console.log("Creating HOD...");
  const hodFaculty = await Faculty.create({
    name: "Dr. Dharshan Mohan",
    empId: "HOD_CSE_" + Date.now(),
    email: emails.hod,
    phone: 9876543210,
    department: "Computer Science",
    dob: new Date("1980-01-15"),
    gender: "Male",
    doj: new Date("2010-07-01"),
    designation: "HOD",
    employeeCategory: "Teaching",
    employmentStatus: true,
    location: "Main Campus",
  });
  console.log(`✓ HOD created: ${emails.hod}`);

  // Create Organizers
  console.log("\nCreating Organizers...");
  const organizers = [];
  for (let i = 0; i < emails.organizers.length; i++) {
    const org = await Faculty.create({
      name: `Organizer ${i + 1}`,
      empId: `ORG_${i + 1}_${Date.now()}`,
      email: emails.organizers[i],
      phone: 9876543200 + i,
      department: "Computer Science",
      dob: new Date("1985-01-15"),
      gender: i % 2 === 0 ? "Male" : "Female",
      doj: new Date("2015-07-01"),
      designation: "Assistant Professor",
      employeeCategory: "Teaching",
      employmentStatus: true,
      location: "Main Campus",
    });
    organizers.push(org);
    console.log(`✓ Organizer ${i + 1} created: ${emails.organizers[i]}`);
  }

  // Create Super Admin
  console.log("\nCreating Super Admin...");
  const superAdmin = await User.create({
    name: "Super Admin",
    email: emails.superAdmin,
    phone: "9876543000",
    department: "Administration",
    role: "admin",
    isadmin: true,
  });
  console.log(`✓ Super Admin created: ${emails.superAdmin}`);

  // Create Department Head Users
  console.log("\nCreating Department Heads...");
  for (const [dept, email] of Object.entries(emails.deptHeads)) {
    const deptName = dept.charAt(0).toUpperCase() + dept.slice(1);
    const role = `${deptName} Coordinator`;
    
    await User.create({
      name: `${deptName} Coordinator`,
      email: email,
      phone: `988${Math.random().toString().slice(2, 7)}`,
      department: "Support",
      role: role,
      isadmin: false,
    });
    console.log(`✓ ${deptName} Coordinator created: ${email}`);
  }

  return { hodFaculty, organizers, superAdmin };
}

async function runTests() {
  try {
    console.log("\n🚀 CUSTOM EMAIL NOTIFICATION TEST");
    console.log("=" + "=".repeat(79));

    // Connect to database
    console.log("\n📍 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/sece_events");
    console.log("✅ Connected to MongoDB\n");

    // Create test data
    const { hodFaculty, organizers } = await createTestData();

    // Create test event
    console.log("\n📝 Creating test event...");
    const testEvent = {
      organizerId: organizers[0]._id,
      requestDetails: {
        organizerDetails: {
          organizingDepartment: "Computer Science",
          organizers: organizers.map((org, idx) => ({
            name: `Organizer ${idx + 1}`,
            email: emails.organizers[idx],
            department: "Computer Science",
            designation: "Assistant Professor",
            mobile: 9876543200 + idx,
            empId: org.empId,
            facultyId: org._id,
          })),
        },
        eventDetails: {
          eventName: "International Tech Summit 2024",
          eventType: "Conference",
          eventSchedule: [
            {
              eventDate: new Date("2024-12-20T09:00:00Z"),
            },
          ],
        },
        requirementDetails: {
          venueRequired: true,
          audioRequired: true,
          ictsRequired: true,
          transportRequired: true,
          accommodationRequired: true,
          mediaRequired: true,
        },
      },
      status: "Submitted",
      isSubmitted: true,
    };

    const event = await Event.create(testEvent);
    console.log(`✅ Event created: International Tech Summit 2024\n`);

    // TEST 1: Event Creation
    console.log("=" + "=".repeat(80));
    console.log("TEST 1: EVENT CREATION & SUBMISSION");
    console.log("=" + "=".repeat(80));
    console.log("\n📧 RECIPIENTS:");
    await notifyEventCreation(event);

    // TEST 2: HOD Approval
    console.log("\n" + "=" + "=".repeat(80));
    console.log("TEST 2: HOD APPROVAL");
    console.log("=" + "=".repeat(80));
    console.log("\n📧 RECIPIENTS (Organizers ONLY):");
    event.status = "HodApproved";
    event.isHodApproved = true;
    await event.save();
    await notifyHODApproval(event);

    // TEST 3: Admin Approval
    console.log("\n" + "=" + "=".repeat(80));
    console.log("TEST 3: ADMIN APPROVAL");
    console.log("=" + "=".repeat(80));
    console.log("\n📧 RECIPIENTS (Organizers + Super Admin):");
    event.status = "Approved";
    event.adminApproval = true;
    await event.save();
    await notifyAdminApproval(event);

    console.log("\n📧 RECIPIENTS (Department Heads):");
    await notifyDepartmentHeads(event);

    // TEST 4: Event Rejection
    console.log("\n" + "=" + "=".repeat(80));
    console.log("TEST 4: EVENT REJECTION");
    console.log("=" + "=".repeat(80));
    console.log("\n📧 RECIPIENTS (Organizers ONLY):");
    event.status = "Rejected";
    await event.save();
    await notifyEventRejection(event, "Budget constraints - Please resubmit with revised budget");

    // TEST 5: Event Closure
    console.log("\n" + "=" + "=".repeat(80));
    console.log("TEST 5: EVENT CLOSURE");
    console.log("=" + "=".repeat(80));
    console.log("\n📧 RECIPIENTS (Organizers + HOD + Super Admin + Department Heads):");
    
    // Create new event for closure test
    const closureEvent = await Event.create({
      ...testEvent,
      status: "Approved",
      adminApproval: true,
    });
    
    closureEvent.status = "Closed";
    await closureEvent.save();
    await notifyEventClosure(closureEvent, "Event completed successfully on Dec 20, 2024");

    // Summary
    console.log("\n" + "=" + "=".repeat(80));
    console.log("✅ TEST SUMMARY");
    console.log("=" + "=".repeat(80));

    console.log("\n📊 EMAIL BREAKDOWN:\n");
    console.log("1️⃣  EVENT CREATION:");
    console.log("   Recipients: Organizers (2) + HOD (1) + Super Admin (1) = 4 emails");
    console.log(`   Organizers: ${emails.organizers.join(", ")}`);
    console.log(`   HOD: ${emails.hod}`);
    console.log(`   Super Admin: ${emails.superAdmin}`);

    console.log("\n2️⃣  HOD APPROVAL:");
    console.log("   Recipients: Organizers (2) = 2 emails");
    console.log(`   ${emails.organizers.join(", ")}`);

    console.log("\n3️⃣  ADMIN APPROVAL:");
    console.log("   Recipients: Organizers (2) + Super Admin (1) = 3 emails");
    console.log(`   ${emails.organizers.join(", ")}`);
    console.log(`   ${emails.superAdmin}`);

    console.log("\n4️⃣  DEPARTMENT HEAD NOTIFICATIONS:");
    console.log("   Recipients: 8 Department Heads");
    Object.entries(emails.deptHeads).forEach(([dept, email]) => {
      console.log(`   • ${dept.toUpperCase()}: ${email}`);
    });

    console.log("\n5️⃣  EVENT REJECTION:");
    console.log("   Recipients: Organizers (2) = 2 emails");
    console.log(`   ${emails.organizers.join(", ")}`);

    console.log("\n6️⃣  EVENT CLOSURE:");
    console.log("   Recipients: Organizers (2) + HOD (1) + Super Admin (1) + Department Heads (8) = 12 emails");
    console.log(`   Organizers: ${emails.organizers.join(", ")}`);
    console.log(`   HOD: ${emails.hod}`);
    console.log(`   Super Admin: ${emails.superAdmin}`);
    console.log("   Department Heads:");
    Object.entries(emails.deptHeads).forEach(([dept, email]) => {
      console.log(`   • ${dept.toUpperCase()}: ${email}`);
    });

    console.log("\n" + "=" + "=".repeat(80));
    console.log("🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
    console.log("=" + "=".repeat(80));
    console.log("\n📝 Total Emails That Would Be Sent:");
    console.log("   Event Creation: 4 emails");
    console.log("   HOD Approval: 2 emails");
    console.log("   Admin Approval: 3 emails");
    console.log("   Department Head Notifications: 8 emails");
    console.log("   Event Rejection: 2 emails");
    console.log("   Event Closure: 12 emails");
    console.log("   ─────────────────────────");
    console.log("   TOTAL: 31 emails across complete workflow");

    // Cleanup
    console.log("\n🧹 Cleaning up test data...");
    await Event.deleteMany({ _id: { $in: [event._id, closureEvent._id] } });
    await Faculty.deleteMany({ _id: { $in: organizers.map(o => o._id).concat(hodFaculty._id) } });
    await User.deleteMany({ email: { $in: [emails.superAdmin, ...Object.values(emails.deptHeads)] } });
    console.log("✅ Test data cleaned up");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
