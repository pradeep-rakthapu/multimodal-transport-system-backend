import razorpay from '../config/razorpay.config.js';
import crypto from 'crypto';

class RazorpayService {
    
  static async createOrder({ amount, currency = 'INR', receipt }) {
    const options = {
      amount: amount * 100, // convert to paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    };
    return await razorpay.orders.create(options);
  }


  static verifyPayment({ order_id, payment_id, signature }) {
    const hmac = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    return hmac === signature;
  }
}

export default RazorpayService;