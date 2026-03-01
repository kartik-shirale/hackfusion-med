// Try sending with each sandbox pre-provisioned template to find order notifications SID
// Sandbox templates are auto-provisioned and don't show in the Content API list
require('dotenv').config();
const Twilio = require('twilio');

const client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// The sandbox pre-provisions templates. We know:
// HXb5b62575e6e4ff6129ad7c8efe1f983e = Appointment Reminders
// Let's fetch the SID for the specific template by fetching its details
async function findOrderTemplate() {
    const auth = Buffer.from(
        process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN
    ).toString('base64');

    // Try fetching the known SID to see its structure
    console.log('=== Checking known template ===');
    const res1 = await fetch(
        `https://content.twilio.com/v1/Content/HXb5b62575e6e4ff6129ad7c8efe1f983e`,
        { headers: { 'Authorization': `Basic ${auth}` } }
    );
    const t1 = await res1.json();
    console.log(JSON.stringify(t1, null, 2));

    // Also try ContentAndApprovals to see all including pre-provisioned
    console.log('\n=== Content and Approvals ===');
    const res2 = await fetch(
        'https://content.twilio.com/v1/ContentAndApprovals',
        { headers: { 'Authorization': `Basic ${auth}` } }
    );
    const t2 = await res2.json();
    console.log(JSON.stringify(t2, null, 2));
}

findOrderTemplate();
