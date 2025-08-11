import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';

import { bookTicket, getShortestPath, getTicketsByUser, searchByBusStopName, getTicketDetails  } from '../controllers/path.controller.js';

const router = Router();

router.get('/shortest-path', getShortestPath);

router.get('/bus-stops' , searchByBusStopName);
router.post('/book-ticket', authenticate, bookTicket);

router.get('/bus-ticket', authenticate, getTicketsByUser);
router.get('/ticket-details/:ticketId', authenticate, getTicketDetails);

export default router;
