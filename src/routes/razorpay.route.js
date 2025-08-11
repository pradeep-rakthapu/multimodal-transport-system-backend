import express from 'express';
import RazorpayController from '../controllers/razorpay.controller.js';

const router = express.Router();

// POST /api/payments/create-order
router.post('/create-order', RazorpayController.createOrder);

// POST /api/payments/verify
router.post('/verify-payment', RazorpayController.verifyPayment);

export default router;