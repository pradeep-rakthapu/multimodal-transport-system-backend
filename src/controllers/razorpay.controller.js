import RazorpayService from '../services/razorpay.service.js';

class RazorpayController {
  static async createOrder(req, res) {
    try {
      const { amount, currency, receipt } = req.body;
      const order = await RazorpayService.createOrder({ amount, currency, receipt });
      res.status(201).json(order);
    } catch (error) {
      console.error('Order creation error:', error);
      res.status(500).json({ error: 'Order creation failed' });
    }
  }

  static async verifyPayment(req, res) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const isValid = RazorpayService.verifyPayment({
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (isValid) {
        res.json({ status: 'success', message: 'Payment verified' });
      } else {
        res.status(400).json({ status: 'failure', message: 'Invalid signature' });
      }
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ error: 'Payment verification failed' });
    }
  }
}

export default RazorpayController;