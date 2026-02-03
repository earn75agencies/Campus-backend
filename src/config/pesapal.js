module.exports = {
  PESAPAL_CONSUMER_KEY: process.env.PESAPAL_CONSUMER_KEY || '',
  PESAPAL_CONSUMER_SECRET: process.env.PESAPAL_CONSUMER_SECRET || '',
  PESAPAL_URL: process.env.PESAPAL_URL || 'https://pay.pesapal.com/api/v2/Transaction/RequestInvoice',
  PESAPAL_RETURN_URL: process.env.PESAPAL_RETURN_URL || 'http://localhost:3000/payment/success',
  PESAPAL_CANCEL_URL: process.env.PESAPAL_CANCEL_URL || 'http://localhost:3000/payment/failed'
};
