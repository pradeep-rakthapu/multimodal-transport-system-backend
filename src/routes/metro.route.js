import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { searchMetroStops, bookMetro, searchRoute, getMetroTicketsController } from '../controllers/metro.controller.js';

const router = Router();



router.post('/book',authenticate, bookMetro);

router.get('/search-route', searchRoute);

router.get('/search-stops', searchMetroStops);

router.get('/tickets', authenticate, getMetroTicketsController);

router.get('/tickets/:ticketId', authenticate, getMetroTicketsController);
export default router;