import { Router } from 'express';
import { currentWeather } from '../controllers/weather.controller.js';

const router = Router();

router.get('/weather', currentWeather);

export default router;
