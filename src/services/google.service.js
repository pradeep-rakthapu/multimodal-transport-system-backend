import axios from 'axios';
export const getRoutesFromGoogle = async (origin, destination) => {
  const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;
  const { data } = await axios.post(url,
    {
      origin: { address: origin },
      destination: { address: destination },
      travelMode: 'TRANSIT',
      computeAlternativeRoutes: true,
      transitPreferences: { allowedTravelModes: ['BUS','RAIL','SUBWAY','TRAM'] }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_API_KEY,
        'X-Goog-FieldMask': '*'
      }
    }
  );
  return data.routes;
};

async function getLocationName(lat, lng) {
  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          latlng: `${lat},${lng}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    if (response && response.data) {
      console.log('📍 Geocoding API response:', response.data);
      const results = response.data.results;
      if (results.length > 0) {
        const formattedAddress = results[0].formatted_address;
        console.log('📍 Location:', formattedAddress);
        return formattedAddress;
      } else {
        console.log('❗No results found.');
        return null;
      }
    } else {
      console.error('❌ Invalid response format.');
      return null;
    }
  } catch (error) {
    console.error('🚨 Request failed:', error.message);
    return null;
  }
}
export default {getLocationName};