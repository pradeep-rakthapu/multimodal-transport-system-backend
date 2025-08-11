import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  getOptions,
  getRouteByIdController,
  bookingByStepIdController,
  multiModalRouteCheckoutController,
  bookMultiModalRouteController,
  getRateCard
} from '../controllers/journey.controller.js';

const router = Router();

// body: { origin, destination, filter }
router.post('/multimodal', getOptions);
// params: { routeId }
router.get('/multimodal/:routeId', getRouteByIdController);
// params: { stepId, routeId }
router.post('/multimodal/:routeId/step/:stepId', bookingByStepIdController);
//params: { routeId }

router.get('/multimodal/:routeId/checkout',  multiModalRouteCheckoutController);
// params: { routeId }
router.post('/multimodal/:routeId/book', authenticate, bookMultiModalRouteController);
// body: { source, destination }
router.post('/ratecard', getRateCard);

export default router;