// src/controllers/weather.controller.js
import { getWeather } from '../services/weather.service.js';

export const currentWeather = async (req, res, next) => {
  try {
    const { lat, lon } = req.query;
    const weather = await getWeather({ latitude: lat, longitude: lon });
    res.json(weather);
  } catch (err) {
    next(err);
  }
};
