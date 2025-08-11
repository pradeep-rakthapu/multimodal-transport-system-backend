import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const vehicleRates = {
  car: { perKm: 15, perMin: 2 },
  bike: { perKm: 8, perMin: 1 },
  auto: { perKm: 12, perMin: 1.5 },
};

export const rateCardService = async ({ source, destination }) => {
  if (!source || !destination) {
    return { success: false, error: 'Source or destination not provided' };
  }

  try {
    const { data } = await axios.post(
      `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix?key=${process.env.GOOGLE_MAPS_API_KEY}`,
      {
        origins: [
          { waypoint: { location: { latLng: source } } }
        ],
        destinations: [
          { waypoint: { location: { latLng: destination } } }
        ],
        travelMode: 'DRIVE'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition' 
        }
      }
    );

    // Single origin & destination

    console.log('RateCard Response:', data);
    if (!data || !data[0]) {
      return { success: false, error: 'No route found' };
    }
    const element = data[0];

    const distanceKm = element.distanceMeters / 1000;
    const durationMin = Number((element.duration).slice(0,element.duration.length-1)) / 60;

    const rateInfo = Object.fromEntries(
      Object.entries(vehicleRates).map(([veh, { perKm, perMin }]) => {
        const estimatedFare = distanceKm * perKm + durationMin * perMin;
        return [
          veh,
          {
            distanceKm: distanceKm.toFixed(2),
            durationMin: durationMin.toFixed(2),
            estimatedFare: estimatedFare.toFixed(2),
          }
        ];
      })
    );

    return {
      success: true,
      rates: rateInfo
    };
  } catch (err) {
    console.error('RateCard Error:', err.response?.data || err.message);
    return {
      success: false,
      error: err.response?.data?.error?.message || 'Failed to fetch route matrix'
    };
  }
};
