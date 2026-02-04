module.exports = {
  // M-Pesa credentials from Render environment
  MPESA_BASE_URL: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
  MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY || '',
  MPESA_CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET || '',
  MPESA_ENV: process.env.MPESA_ENV || 'sandbox',
  MPESA_PASSKEY: process.env.MPESA_PASSKEY || '',
  MPESA_SHORTCODE: process.env.MPESA_SHORTCODE || '',

  // M-Pesa API endpoints
  MPESA_AUTH_URL: process.env.MPESA_BASE_URL
    ? `${process.env.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',

  MPESA_STK_PUSH_URL: process.env.MPESA_BASE_URL
    ? `${process.env.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`
    : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',

  // Callback URL - will be dynamically set based on environment
  MPESA_CALLBACK_URL: process.env.MPESA_CALLBACK_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001'
};
