// src/services/weather.service.js
import axios from 'axios';

const BASE_URL = 'https://weather.googleapis.com/v1';
const API_KEY = process.env.GOOGLE_API_KEY;

export const getWeather = async ({ latitude, longitude }) => {
  const url = `${BASE_URL}/forecast:latest`;
  const params = {
    location: { latitude, longitude },
    // optional: request_current_conditions, hourly_forecast, daily_forecast, hourly_history
    weatherFields: 'temperature,wind,humidity,precipitation,visibility,uvIndex,skyConditions',
    fcstHours: 240,     // up to 10 days
    fxTemplate: 'BASIC'  // basic or EXTENDED
  };

  const { data } = await axios.post(
    url,
    params,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY
      }
    }
  );

  return data;
};
