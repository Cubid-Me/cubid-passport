// Download the helper library from https://www.twilio.com/docs/node/install
// Set environment variables for your credentials
// Read more at http://twil.io/secure
const accountSid = 'AC9b65bde6e517e7a18b6c01e11a7c5493';
const authToken = '87d4a51cd3e208ab1f68e2988d628045';
const verifySid = 'VA627c33ab3023aa319bf6351a0367d2c8';
const client = require('twilio')(accountSid, authToken);

const sendOtp = (req:any, res:any) => {
  const { phone } = req.body;
  client.verify.v2
    .services(verifySid)
    .verifications.create({ to: phone, channel: 'sms' })
    .then(() => {
      res.send('otp sent');
    });
};
export default sendOtp;
