const fs = require('fs');
const fetch = global.fetch;
const FormData = global.FormData;

(async () => {
  try {
    const eventId = '69f1cf0a9a4e104424f3f444';
    const fd = new FormData();
    fd.append('requestDetails', JSON.stringify({ eventDetails: { numberOfDays: 2, eventType: 'Seminar' } }));
    fd.append('isSubmitted', 'true');
    fd.append('referenceFiles', new Blob([fs.readFileSync('test.pdf')]), 'submit-ref.pdf');

    const res = await fetch(`http://localhost:5005/api/events/${eventId}/submit`, {
      method: 'PATCH',
      body: fd,
    });

    console.log('PATCH STATUS', res.status);
    console.log(await res.text());

    const getRes = await fetch(`http://localhost:5005/api/events/${eventId}`);
    console.log('GET STATUS', getRes.status);
    console.log(await getRes.text());
  } catch (err) {
    console.error('ERROR', err);
  }
})();
