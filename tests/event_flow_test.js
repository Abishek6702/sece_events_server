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
            previousEventReason: 'Draft test event',
            isBudgetApproved: false,
            financeRequired: false,
            organizingDepartment: 'CSE',
            organizerCount: 1,
            organizers: [
              {
                name: 'Draft Organizer',
                department: 'CSE',
                mobile: 1234567890,
                designation: 'Faculty',
                email: 'draft@example.com',
                empId: 'EMP001',
                facultyId: '507f1f77bcf86cd799439012',
              },
            ],
          },
          eventDetails: {
            eventName: 'Draft Event',
            tagging: ['Draft'],
            eventType: 'Workshop',
            professionalSociety: ['IEEE'],
            logosInPoster: ['College Logo'],
            targetAudience: 'Students',
            numberOfDays: 1,
          },
          requirementDetails: {
            venueRequired: false,
          },
        },
        mediaRequirementDetails: {
          mediaRequirements: [
            {
              dayIndex: 0,
              typeOfMedia: ['poster'],
              poster: {
                posterContent: 'Draft poster content',
                referencePosterFiles: [],
                certificateContent: '',
                referenceCertificateFiles: [],
                trophyContent: '',
                displayNeeded: [],
                sizes: [],
                deliveryDate: null,
                priority: '',
                specialRequirements: '',
              },
              video: {
                videoContent: '',
                preEventVideos: [],
                eventCoverage: [],
                postEventVideos: [],
                specialVideos: [],
                referenceFiles: [],
                deliveryDate: null,
                priority: '',
                specialRequirements: '',
              },
            },
          ],
        },
      },
      files: {
        previousEventDocumentation: { path: testPdf, filename: 'draft-doc.pdf' },
        referencePosterFiles: { path: testPng, filename: 'draft-poster.png' },
      },
    });

    console.log('CREATE DRAFT RESPONSE:', draftCreate.status);
    console.log(JSON.stringify(draftCreate.body, null, 2));

    const eventId = draftCreate.body?.data?._id;
    if (!eventId) {
      throw new Error('Failed to create draft event');
    }

    const draftUpdate = await putForm({
      url: `${serverUrl}/api/events/${eventId}`,
      fields: {
        requestDetails: {
          organizerDetails: {
            previousEventReason: 'Updated draft reason',
            organizerCount: 2,
            organizers: [
              {
                name: 'Updated Organizer',
                department: 'CSE',
                mobile: 9876543210,
                designation: 'Assistant Professor',
                email: 'updated@example.com',
                empId: 'EMP002',
                facultyId: '507f1f77bcf86cd799439013',
              },
            ],
          },
          eventDetails: {
            eventName: 'Updated Draft Event',
            tagging: ['Draft', 'Updated'],
          },
        },
      },
      files: {
        referenceCertificateFiles: { path: testPng, filename: 'draft-cert.png' },
      },
    });

    console.log('UPDATE DRAFT RESPONSE:', draftUpdate.status);
    console.log(JSON.stringify(draftUpdate.body, null, 2));

    const getAfterUpdate = await getJson(`${serverUrl}/api/events/${eventId}`);
    console.log('GET AFTER UPDATE RESPONSE:', getAfterUpdate.status);
    console.log(JSON.stringify(getAfterUpdate.body, null, 2));

    const submitData = await patchForm({
      url: `${serverUrl}/api/events/${eventId}/submit`,
      fields: {
        requestDetails: {
          eventDetails: {
            eventType: 'Conference',
            numberOfDays: 2,
          },
        },
      },
      files: {
        referenceFiles: { path: testPdf, filename: 'draft-ref.pdf' },
      },
    });

    console.log('SUBMIT RESPONSE:', submitData.status);
    console.log(JSON.stringify(submitData.body, null, 2));

    const getAfterSubmit = await getJson(`${serverUrl}/api/events/${eventId}`);
    console.log('GET AFTER SUBMIT RESPONSE:', getAfterSubmit.status);
    console.log(JSON.stringify(getAfterSubmit.body, null, 2));

    const deleteResponse = await deleteJson(`${serverUrl}/api/events/${eventId}`);
    console.log('DELETE RESPONSE:', deleteResponse.status);
    console.log(JSON.stringify(deleteResponse.body, null, 2));

    const getAfterDelete = await getJson(`${serverUrl}/api/events/${eventId}`);
    console.log('GET AFTER DELETE RESPONSE:', getAfterDelete.status);
    console.log(JSON.stringify(getAfterDelete.body, null, 2));

    if (getAfterDelete.status !== 404) {
      throw new Error('Expected event to be deleted and return 404 after delete');
    }
  } catch (err) {
    console.error('TEST ERROR:', err);
    process.exit(1);
  }
})();
