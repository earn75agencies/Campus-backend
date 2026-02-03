module.exports = {
  SAFARICOM_DARAJA_CONSUMER_KEY: process.env.SAFARICOM_DARAJA_CONSUMER_KEY || '',
  SAFARICOM_DARAJA_CONSUMER_SECRET: process.env.SAFARICOM_DARAJA_CONSUMER_SECRET || '',
  SAFARICOM_DARAJA_PASSKEY: process.env.SAFARICOM_DARAJA_PASSKEY || '',
  SAFARICOM_DARAJA_SHORTCODE: process.env.SAFARICOM_DARAJA_SHORTCODE || '',
  DARAJA_ENVIRONMENT: process.env.DARAJA_ENVIRONMENT || 'sandbox',
  DARAJA_STK_PUSH_URL: process.env.DARAJA_STK_PUSH_URL || 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
  DARAJA_CALLBACK_URL: process.env.DARAJA_CALLBACK_URL || 'http://localhost:3001/api/payment/callback'
};
