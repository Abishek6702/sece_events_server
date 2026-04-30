const fs = require('fs');
const path = require('path');
const FormData = global.FormData;

const ensureFile = (filePath, contents) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, contents);
  }
};

const serverUrl = 'http://localhost:5005';
const testPdf = path.join(__dirname, 'test.pdf');
const testPng = path.join(__dirname, 'test.png');

ensureFile(testPdf, '%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj<< /Type /Pages /Kids [3 0 R]/Count 1>>\nendobj\n3 0 obj<< /Type /Page /Parent 2 0 R/MediaBox [0 0 200 200]/Contents 4 0 R>>\nendobj\n4 0 obj<< /Length 44>>\nstream\nBT /F1 24 Tf 72 712 Td (Hello) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000103 00000 n \n0000000157 00000 n \ntrailer<< /Root 1 0 R/Size 5>>\nstartxref\n224\n%%EOF');
ensureFile(testPng, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64'));

const postForm = async ({ url, fields, files }) => {
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([key, value]) => {
    fd.append(key, typeof value === 'string' ? value : JSON.stringify(value));
  });

  Object.entries(files || {}).forEach(([key, file]) => {
    const blob = new Blob([fs.readFileSync(file.path)]);
    fd.append(key, blob, file.filename);
  });

  const res = await fetch(url, {
    method: 'POST',
    body: fd,
  });
  const body = await res.text();
  let parsed;
  try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
  return { status: res.status, body: parsed };
};

const putForm = async ({ url, fields, files }) => {
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([key, value]) => {
    fd.append(key, typeof value === 'string' ? value : JSON.stringify(value));
  });
  Object.entries(files || {}).forEach(([key, file]) => {
    const blob = new Blob([fs.readFileSync(file.path)]);
    fd.append(key, blob, file.filename);
  });
  const res = await fetch(url, {
    method: 'PUT',
    body: fd,
  });
  const body = await res.text();
  let parsed;
  try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
  return { status: res.status, body: parsed };
};

const patchForm = async ({ url, fields, files }) => {
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([key, value]) => {
    fd.append(key, typeof value === 'string' ? value : JSON.stringify(value));
  });
  Object.entries(files || {}).forEach(([key, file]) => {
    const blob = new Blob([fs.readFileSync(file.path)]);
    fd.append(key, blob, file.filename);
  });
  const res = await fetch(url, {
    method: 'PATCH',
    body: fd,
  });
  const body = await res.text();
  let parsed;
  try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
  return { status: res.status, body: parsed };
};

const getJson = async (url) => {
  const res = await fetch(url);
  const body = await res.text();
  let parsed;
  try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
  return { status: res.status, body: parsed };
};

const deleteJson = async (url) => {
  const res = await fetch(url, { method: 'DELETE' });
  const body = await res.text();
  let parsed;
  try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
  return { status: res.status, body: parsed };
};

(async () => {
  try {
    const draftCreate = await postForm({
      url: `${serverUrl}/api/events`,
      fields: {
        organizerId: '507f1f77bcf86cd799439011',
        requestDetails: {
          organizerDetails: {
            previousEventDocumentation: true,
            previousEventReason: 'Full flow creation test with Cloudinary references',
            isBudgetApproved: true,
            financeRequired: true,
            organizingDepartment: 'CSE',
            organizerCount: 3,
            organizers: [
              {
                name: 'Dr. John Doe',
                department: 'CSE',
                mobile: 9876543210,
                designation: 'Professor',
                email: 'john.doe@college.edu',
                empId: 'EMP001',
                facultyId: '507f1f77bcf86cd799439012',
              },
              {
                name: 'Jane Smith',
                department: 'CSE',
                mobile: 9876543211,
                designation: 'Assistant Professor',
                email: 'jane.smith@college.edu',
                empId: 'EMP002',
                facultyId: '507f1f77bcf86cd799439013',
              },
              {
                name: 'Bob Johnson',
                department: 'CSE',
                mobile: 9876543212,
                designation: 'Lecturer',
                email: 'bob.johnson@college.edu',
                empId: 'EMP003',
                facultyId: '507f1f77bcf86cd799439014',
              },
            ],
          },
          eventDetails: {
            eventName: 'Advanced Machine Learning Workshop',
            involvedIIC: false,
            eventType: 'Workshop',
            eventTypeOther: '',
            professionalSociety: ['IEEE', 'ACM'],
            professionalSocietyOther: '',
            logosInPoster: ['College Logo', 'IEEE Logo'],
            logosOther: '',
            targetAudience: 'Students/Faculty',
            numberOfDays: 3,
            eventSchedule: [
              {
                eventDate: '2026-05-01T00:00:00.000Z',
                startTime: '09:00',
                endTime: '17:00',
                totalGuests: 2,
                guests: [
                  {
                    name: 'Dr. Alice Cooper',
                    organization: 'Tech Corp',
                    designation: 'Senior Engineer',
                    mobile: 9876543213,
                    gender: 'Female',
                  },
                  {
                    name: 'Mr. Charlie Brown',
                    organization: 'Data Solutions Inc',
                    designation: 'Data Scientist',
                    mobile: 9876543214,
                    gender: 'Male',
                  },
                ],
              },
              {
                eventDate: '2026-05-02T00:00:00.000Z',
                startTime: '09:00',
                endTime: '17:00',
                totalGuests: 1,
                guests: [
                  {
                    name: 'Prof. Diana Prince',
                    organization: 'University of Tech',
                    designation: 'Associate Professor',
                    mobile: 9876543215,
                    gender: 'Female',
                  },
                ],
              },
              {
                eventDate: '2026-05-03T00:00:00.000Z',
                startTime: '09:00',
                endTime: '15:00',
                totalGuests: 0,
                guests: [],
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
        venueDetails: {
          totalParticipants: 150,
          venues: [
            {
              dayIndex: 0,
              venueName: 'Seminar Hall A',
              numberOfParticipants: 100,
              seatingCapacity: 120,
              hallRequirements: [
                { type: 'Projector', quantity: 1 },
                { type: 'Whiteboard', quantity: 2 },
                { type: 'Microphone', quantity: 3 },
              ],
              specialRequirements: 'High-speed internet required',
            },
            {
              dayIndex: 1,
              venueName: 'Lab 101',
              numberOfParticipants: 50,
              seatingCapacity: 60,
              hallRequirements: [
                { type: 'Computer', quantity: 50 },
                { type: 'Projector', quantity: 1 },
              ],
              specialRequirements: 'Access to development tools',
            },
            {
              dayIndex: 2,
              venueName: 'Auditorium',
              numberOfParticipants: 150,
              seatingCapacity: 200,
              hallRequirements: [
                { type: 'Stage', quantity: 1 },
                { type: 'Sound System', quantity: 1 },
              ],
              specialRequirements: 'Valedictory ceremony setup',
            },
          ],
        },
        ictsDetails: {
          ictses: [
            {
              dayIndex: 0,
              venueId: '507f1f77bcf86cd799439015',
              venueName: 'Seminar Hall A',
              desktopLaptop: true,
              internetFacility: 'WiFi',
              expectedInternetUsers: 100,
              proctoringUsers: 0,
              guestWifiNeeded: true,
              guestWifiExceed5: false,
              totalGuestCount: 2,
              requirements: ['High-speed internet', 'Presentation tools'],
              otherRequirements: 'Video conferencing setup',
              specialRequirements: 'Backup power for equipment',
            },
            {
              dayIndex: 1,
              venueId: '507f1f77bcf86cd799439016',
              venueName: 'Lab 101',
              desktopLaptop: true,
              internetFacility: 'LAN',
              expectedInternetUsers: 50,
              proctoringUsers: 0,
              guestWifiNeeded: false,
              guestWifiExceed5: false,
              totalGuestCount: 1,
              requirements: ['Development environment', 'Code repositories'],
              otherRequirements: '',
              specialRequirements: 'Software licenses for ML tools',
            },
            {
              dayIndex: 2,
              venueId: '507f1f77bcf86cd799439017',
              venueName: 'Auditorium',
              desktopLaptop: false,
              internetFacility: 'WiFi',
              expectedInternetUsers: 150,
              proctoringUsers: 0,
              guestWifiNeeded: true,
              guestWifiExceed5: true,
              totalGuestCount: 0,
              requirements: ['Presentation equipment'],
              otherRequirements: '',
              specialRequirements: 'Live streaming setup',
            },
          ],
        },
        audioDetails: {
          audios: [
            {
              dayIndex: 0,
              venueId: '507f1f77bcf86cd799439015',
              venueName: 'Seminar Hall A',
              audioItems: [
                { type: 'Microphone', quantity: 3 },
                { type: 'Speaker', quantity: 2 },
                { type: 'Mixer', quantity: 1 },
              ],
              otherRequirements: 'Wireless microphones',
              specialRequirements: 'Sound check before event',
            },
            {
              dayIndex: 1,
              venueId: '507f1f77bcf86cd799439016',
              venueName: 'Lab 101',
              audioItems: [
                { type: 'Headphones', quantity: 50 },
                { type: 'Microphone', quantity: 2 },
              ],
              otherRequirements: '',
              specialRequirements: 'Quiet environment for sessions',
            },
            {
              dayIndex: 2,
              venueId: '507f1f77bcf86cd799439017',
              venueName: 'Auditorium',
              audioItems: [
                { type: 'Microphone', quantity: 5 },
                { type: 'Speaker', quantity: 4 },
                { type: 'Amplifier', quantity: 2 },
              ],
              otherRequirements: 'Stage lighting',
              specialRequirements: 'Professional sound engineering',
            },
          ],
        },
        transportDetails: {
          transports: [
            {
              pickupDateTime: '2026-05-01T07:00:00.000Z',
              dropDateTime: '2026-05-01T18:00:00.000Z',
              pickupLocation: 'Railway Station',
              checkpoints: [
                { location: 'Airport' },
                { location: 'Bus Stand' },
              ],
              dropLocation: 'College Campus',
              totalPassengers: 5,
              vehicles: [
                { type: 'Car', count: 2 },
                { type: 'Bus', count: 1 },
              ],
              accompanyingStaff: [
                { name: 'Staff Member 1', mobile: 9876543216 },
                { name: 'Staff Member 2', mobile: 9876543217 },
              ],
              specialRequirements: 'VIP transport for guests',
            },
          ],
        },
        refreshmentDetails: {
          refreshments: [
            {
              date: '2026-05-01T00:00:00.000Z',
              resourcePersonType: ['Guest Speaker', 'Faculty'],
              numberOfResourcePersons: 3,
              numberOfInternalAccompanyingStaff: 2,
              accompanyingStaff: [
                { name: 'Staff 1', mobile: 9876543218 },
                { name: 'Staff 2', mobile: 9876543219 },
              ],
              foodTypes: [
                {
                  type: 'Lunch',
                  participants: { vegCount: 80, nonVegCount: 20 },
                  vipGuests: { vegCount: 2, nonVegCount: 0 },
                },
                {
                  type: 'Tea',
                  participants: { vegCount: 100, nonVegCount: 0 },
                  vipGuests: { vegCount: 2, nonVegCount: 0 },
                },
              ],
              specialRequirements: 'Dietary restrictions to be considered',
            },
          ],
        },
        accommodationDetails: {
          accommodations: [
            {
              checkInDateTime: '2026-04-30T18:00:00.000Z',
              checkOutDateTime: '2026-05-03T12:00:00.000Z',
              guests: [
                {
                  guestId: '507f1f77bcf86cd799439018',
                  name: 'Dr. Alice Cooper',
                  mobile: 9876543213,
                  gender: 'Female',
                },
                {
                  guestId: '507f1f77bcf86cd799439019',
                  name: 'Mr. Charlie Brown',
                  mobile: 9876543214,
                  gender: 'Male',
                },
                {
                  guestId: '507f1f77bcf86cd799439020',
                  name: 'Prof. Diana Prince',
                  mobile: 9876543215,
                  gender: 'Female',
                },
              ],
              roomOccupancy: [
                { type: 'Single', count: 1 },
                { type: 'Double', count: 1 },
              ],
              roomCategory: [
                { type: 'AC', count: 2 },
                { type: 'Non-AC', count: 0 },
              ],
              dineInRequired: true,
              dineInCounts: [
                { type: 'Breakfast', count: 3 },
                { type: 'Dinner', count: 3 },
              ],
              specialRequirements: 'Near conference venue',
            },
          ],
        },
        purchaseDetails: {
          purchases: [
            {
              dayIndex: 0,
              requirementNeeded: [
                { type: 'Laptop', hardCount: 2, softCount: 0 },
                { type: 'Projector', hardCount: 1, softCount: 0 },
              ],
              requiredFor: ['Presentations', 'Demos'],
              students: {
                giftItems: [
                  {
                    giftType: 'Certificate',
                    trophy: [],
                    cashPrizeAmount: 0,
                    voucherAmount: 0,
                  },
                ],
                registrationKitNeeded: true,
                registrationKitQty: 100,
                specialRequirements: 'Include event schedule',
              },
              guests: {
                giftItems: [
                  {
                    giftType: 'Memento',
                    trophy: [],
                    glassCupQty: 2,
                    voucherAmount: 1000,
                  },
                ],
                registrationKitNeeded: false,
                registrationKitQty: 0,
                specialRequirements: 'Personalized gifts',
              },
            },
            {
              dayIndex: 1,
              requirementNeeded: [
                { type: 'Software License', hardCount: 50, softCount: 0 },
              ],
              requiredFor: ['Hands-on sessions'],
              students: {
                giftItems: [],
                registrationKitNeeded: false,
                registrationKitQty: 0,
                specialRequirements: '',
              },
              guests: {
                giftItems: [],
                registrationKitNeeded: false,
                registrationKitQty: 0,
                specialRequirements: '',
              },
            },
            {
              dayIndex: 2,
              requirementNeeded: [
                { type: 'Trophy', hardCount: 3, softCount: 0 },
                { type: 'Certificate', hardCount: 150, softCount: 0 },
              ],
              requiredFor: ['Awards ceremony'],
              students: {
                giftItems: [
                  {
                    giftType: 'Trophy',
                    trophy: [
                      { trophyType: 'First Prize', quantity: 1 },
                      { trophyType: 'Second Prize', quantity: 1 },
                      { trophyType: 'Third Prize', quantity: 1 },
                    ],
                    cashPrizeAmount: 5000,
                    voucherAmount: 1000,
                  },
                ],
                registrationKitNeeded: false,
                registrationKitQty: 0,
                specialRequirements: 'Engraved names',
              },
              guests: {
                giftItems: [
                  {
                    giftType: 'Certificate',
                    trophy: [],
                    glassCupQty: 0,
                    voucherAmount: 0,
                  },
                ],
                registrationKitNeeded: false,
                registrationKitQty: 0,
                specialRequirements: 'Appreciation certificates',
              },
            },
          ],
        },
        mediaRequirementDetails: {
          mediaRequirements: [
            {
              dayIndex: 0,
              typeOfMedia: ['poster', 'video'],
              poster: {
                posterContent: 'Event announcement with schedule',
                referencePosterFiles: [],
                certificateContent: 'Participation certificate template',
                referenceCertificateFiles: [],
                trophyContent: 'Winner trophy design',
                displayNeeded: ['Campus', 'Department'],
                sizes: [
                  { type: 'A3', value: 10 },
                  { type: 'A4', value: 50 },
                ],
                deliveryDate: '2026-04-25T00:00:00.000Z',
                priority: 'High',
                specialRequirements: 'Include sponsor logos',
              },
              video: {
                videoContent: 'Promotional video for the workshop',
                preEventVideos: ['https://cloudinary.com/pre1.mp4'],
                eventCoverage: ['Full day recording'],
                postEventVideos: ['Highlights reel'],
                specialVideos: ['Guest interviews'],
                referenceFiles: [],
                deliveryDate: '2026-04-28T00:00:00.000Z',
                priority: 'Medium',
                specialRequirements: 'Professional editing required',
              },
            },
          ],
        },
      },
      files: {
        previousEventDocumentation: { path: testPdf, filename: 'draft-doc.pdf' },
        referencePosterFiles: { path: testPng, filename: 'draft-poster.png' },
        referenceCertificateFiles: { path: testPng, filename: 'draft-cert.png' },
        referenceFiles: { path: testPdf, filename: 'draft-ref.pdf' },
      },
    });

    console.log('CREATE DRAFT RESPONSE:', draftCreate.status);
    console.log(JSON.stringify(draftCreate.body, null, 2));

    const eventId = draftCreate.body?.data?._id;
    if (!eventId) {
      throw new Error('Failed to create draft event');
    }

    const createdEvent = draftCreate.body?.data;
    if (!createdEvent) {
      throw new Error('Missing created event data in response');
    }

    const prevDoc = createdEvent.requestDetails?.organizerDetails?.previousEventDocumentationDetails;
    const posterFiles = createdEvent.mediaRequirementDetails?.mediaRequirements?.[0]?.poster?.referencePosterFiles;
    const certFiles = createdEvent.mediaRequirementDetails?.mediaRequirements?.[0]?.poster?.referenceCertificateFiles;
    const videoFiles = createdEvent.mediaRequirementDetails?.mediaRequirements?.[0]?.video?.referenceFiles;

    if (!prevDoc || !prevDoc.url || !prevDoc.publicId) {
      throw new Error('Expected Cloudinary previousEventDocumentationDetails to include url and publicId');
    }

    if (!Array.isArray(posterFiles) || posterFiles.length === 0 || !posterFiles[0].url || !posterFiles[0].publicId) {
      throw new Error('Expected Cloudinary poster.referencePosterFiles to include url and publicId');
    }

    if (!Array.isArray(certFiles) || certFiles.length === 0 || !certFiles[0].url || !certFiles[0].publicId) {
      throw new Error('Expected Cloudinary poster.referenceCertificateFiles to include url and publicId');
    }

    if (!Array.isArray(videoFiles) || videoFiles.length === 0 || !videoFiles[0].url || !videoFiles[0].publicId) {
      throw new Error('Expected Cloudinary video.referenceFiles to include url and publicId');
    }

    console.log('Cloudinary file links validated');

    // const draftUpdate = await putForm({
    //   url: `${serverUrl}/api/events/${eventId}`,
    //   fields: {
    //     requestDetails: {
    //       organizerDetails: {
    //         previousEventReason: 'Updated draft reason',
    //         organizerCount: 2,
    //         organizers: [
    //           {
    //             name: 'Updated Organizer',
    //             department: 'CSE',
    //             mobile: 9876543210,
    //             designation: 'Assistant Professor',
    //             email: 'updated@example.com',
    //             empId: 'EMP002',
    //             facultyId: '507f1f77bcf86cd799439013',
    //           },
    //         ],
    //       },
    //       eventDetails: {
    //         eventName: 'Updated Draft Event',
    //         tagging: ['Draft', 'Updated'],
    //       },
    //     },
    //   },
    //   files: {
    //     referenceCertificateFiles: { path: testPng, filename: 'draft-cert.png' },
    //   },
    // });

    // console.log('UPDATE DRAFT RESPONSE:', draftUpdate.status);
    // console.log(JSON.stringify(draftUpdate.body, null, 2));

    // const getAfterUpdate = await getJson(`${serverUrl}/api/events/${eventId}`);
    // console.log('GET AFTER UPDATE RESPONSE:', getAfterUpdate.status);
    // console.log(JSON.stringify(getAfterUpdate.body, null, 2));

    // const submitData = await patchForm({
    //   url: `${serverUrl}/api/events/${eventId}/submit`,
    //   fields: {
    //     requestDetails: {
    //       eventDetails: {
    //         eventType: 'Conference',
    //         numberOfDays: 2,
    //       },
    //     },
    //   },
    //   files: {
    //     referenceFiles: { path: testPdf, filename: 'draft-ref.pdf' },
    //   },
    // });

    // console.log('SUBMIT RESPONSE:', submitData.status);
    // console.log(JSON.stringify(submitData.body, null, 2));

    // const getAfterSubmit = await getJson(`${serverUrl}/api/events/${eventId}`);
    // console.log('GET AFTER SUBMIT RESPONSE:', getAfterSubmit.status);
    // console.log(JSON.stringify(getAfterSubmit.body, null, 2));

    // const deleteResponse = await deleteJson(`${serverUrl}/api/events/${eventId}`);
    // console.log('DELETE RESPONSE:', deleteResponse.status);
    // console.log(JSON.stringify(deleteResponse.body, null, 2));

    // const getAfterDelete = await getJson(`${serverUrl}/api/events/${eventId}`);
    // console.log('GET AFTER DELETE RESPONSE:', getAfterDelete.status);
    // console.log(JSON.stringify(getAfterDelete.body, null, 2));
  } catch (err) {
    console.error('TEST ERROR:', err);
    process.exit(1);
  }
})();
