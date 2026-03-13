const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const leads = [
    {
        email: 'john.doe@example.com',
        subject: 'Following up on our recent chat',
        body: 'Hi John,\n\nJust wanted to follow up and see how things were progressing. Let me know if you need anything!\n\nBest,\nSahil'
    },
    {
        email: 'jane.smith@example.org',
        subject: 'Quick question about the project',
        body: 'Jane,\n\nI was looking through the notes and had a quick question. Give me a call when you have a minute.\n\nThanks!'
    },
    {
        email: 'hello@quinxai.com',
        subject: 'Checking in',
        body: 'Hey there,\n\nHope you are having a great week. I wanted to see if we could catch up next Tuesday.\n\nCheers!'
    }
];

const dest = path.join(__dirname, '..', 'leads.xlsx');
// Generate an Excel sheet containing sample leads
const ws = xlsx.utils.json_to_sheet(leads);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Leads");
xlsx.writeFile(wb, dest);

console.log('Successfully generated sample leads.xlsx in the root directory.');
