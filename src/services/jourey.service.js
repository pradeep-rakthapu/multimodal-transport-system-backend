import redisClient from '../config/redis.js';

import axios from 'axios';
import cuid from 'cuid';
import  haversine  from 'haversine-distance';
import SearchHistory from '../models/searchHistory.model.js';
import { bookBusTicket } from '../services/busPath.service.js';
import {bookMetroTickets} from '../services/metro.service.js';

const CACHE_TTL = 300;
const geoCache = new Map();

async function reverseGeocode(lat, lng) {
  const key = `${lat},${lng}`;
  if (geoCache.has(key)) return geoCache.get(key);

  const resp = await axios.get(
    'https://maps.googleapis.com/maps/api/geocode/json',
    { params: { latlng: key, key: process.env.GOOGLE_MAPS_API_KEY } }
  );
  let addr = resp.data.results?.[0]?.formatted_address.split(',').slice(0,3).join(',').trim() || null;
  geoCache.set(key, addr);
  return addr;
}

export const getMultiModalRoute = async (data) => {

    const source = data.source;
    const destination = data.destination;
    const sortOrder = data.sortOrder? data.sortOrder: "asc";
    let departureTime = data.departureTime;
    const user_id = data.user_id;
    const transitMode = data.transitMode  || ['BUS', 'SUBWAY'];
    if (!source || !destination) {
      return res.status(400).json({ message: 'Source or destination not provided' });
    }

    
    // Check if the data is already cached in Redis
     const cacheKey = `multimodal_route_collection_${user_id}_${source.latitude}_${source.longitude}_${destination.latitude}_${destination.longitude}_${transitMode}_${sortOrder}`;
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log('Cache hit');
        return JSON.parse(cachedData);
      }
      
     
    try {
      const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  
      const payload = {
        origin: {
            location: {
              latLng: {
                latitude: source.latitude,
                longitude: source.longitude,
              },
            },
        },
        destination: {
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
          },
        },
        travelMode: 'TRANSIT',
        transitPreferences: {
          allowedTravelModes: transitMode,
          routingPreference: 'FEWER_TRANSFERS',
        },
        computeAlternativeRoutes: true,
        languageCode: 'en'
      };
  
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps,',
        },
      });
      
      if (!response || !response.data || !response.data.routes|| response.data.routes.length === 0) {
        
        console.log('No response data received.');
        return [];
      }
      if(!data.destinationName){
      const name = await reverseGeocode(destination.latitude, destination.longitude);
      data.destinationName = name.split(",")[1].trim() + ", " + name.split(",")[2].trim();
      }
      //store search history
      const searchHistory = await SearchHistory.create({ 
        userId: user_id,
        locationName: data.destinationName,
        latitude: destination.latitude,
        longitude: destination.longitude,
      });
      
      
    const fmtTime = (ts) => {
      if (!ts) return '';
      const date = new Date(ts);
      if (isNaN(date)) return '';
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const fmtSubtitle = (meters, secs) => {
      const km = (meters / 1000).toFixed(1) + ' KM';
      const mins = Math.ceil(secs / 60) + ' Minutes';
      return `${km} | ${mins}`;
    };
    const calculateFare = meters => {
      const km = meters / 1000;
      if (km <= 1) return 10;
      return 10 + Math.ceil((km - 1) / 5) * 5;
    };
    let index = 0;

  
    const routesData = response.data.routes
    const responses = [];

    for (const route of routesData) {
      const leg = route.legs[0];
      const rawSteps = leg.steps;
      const steps = [];
      let totalFare = 0;
      let currenttime = new Date().toISOString();
      let i = 0;
      const routeId = cuid();
      const coordSet = new Set();
      rawSteps.forEach(step => {
        const { latitude: slat, longitude: slng } = step.startLocation.latLng;
        const { latitude: elat, longitude: elng } = step.endLocation.latLng;
          coordSet.add(`${slat},${slng}`);
          coordSet.add(`${elat},${elng}`);
      });
      // Reverse-geocode all unique coords in parallel
      await Promise.all(
        [...coordSet].map(str => {
          const [lat, lng] = str.split(',').map(Number);
          return reverseGeocode(lat, lng);
        })
       );

      while (i < rawSteps.length) {
        const step = rawSteps[i];
        const stepId = cuid();
        

        if (step.travelMode === 'WALK') {
          let accDist = step.distanceMeters;
          let accDur = parseInt(step.staticDuration.replace('s', ''), 10);
          const startTS = step.startTime;
          const startLoc = step.startLocation;
          let endLoc = step.endLocation;
          let j = i + 1;

          while (j < rawSteps.length && rawSteps[j].travelMode === 'WALK') {
            accDist += rawSteps[j].distanceMeters;
            accDur += parseInt(rawSteps[j].staticDuration.replace('s', ''), 10);
            endLoc = rawSteps[j].endLocation;
            j++;
          }
          const { latitude: slat, longitude: slng } = step.startLocation.latLng;
          const { latitude: elat, longitude: elng } = step.endLocation.latLng;
          const startName = geoCache.get(`${slat},${slng}`) || '';
          const endName = geoCache.get(`${elat},${elng}`) || '';
          
          currenttime += accDur;
          steps.push({
            step_id: stepId,
            type: 'walk',
            time: currenttime,
            title: startName || '',
            subtitle: fmtSubtitle(accDist, accDur),
            description: `${startName|| ''} → ${endName || ''}`,
            startLocation: startLoc.latLng,
            endLocation: endLoc.latLng,
            bookingAvailable: true,

            bookingStatus: 'not_booked',
            bookingDetails: {
              rideId: null,
              fare: null,
              qrCodeUrl: null,
              bookedAt: null,
            },
          });

          i = j;

        } else if (step.travelMode === 'TRANSIT' && step.transitDetails) {
          const fare = calculateFare(step.distanceMeters);
          totalFare = Math.min(totalFare + fare, 60);
          const startLoc = step.startLocation;
          let endLoc = step.endLocation;

          const { latitude: slat, longitude: slng } = step.startLocation.latLng;
          const { latitude: elat, longitude: elng } = step.endLocation.latLng;
          const startName = geoCache.get(`${slat},${slng}`) || '';
          const endName = geoCache.get(`${elat},${elng}`) || '';
          
          steps.push({
            step_id: stepId,
            type: step.transitDetails.transitLine.vehicle.type === 'SUBWAY' ? 'metro' : step.transitDetails.transitLine.vehicle.type.toLowerCase(),
            time: fmtTime(step.startTime),
            line :step.transitDetails.transitLine.nameShort,
            title: startName || '',
            subtitle: fmtSubtitle(step.distanceMeters, parseInt(step.staticDuration.replace('s',''), 10)),
            description: `${startName || ''} → ${endName || ''}`,
            bookingAvailable: true,
            startLocation: step.startLocation.latLng,
            endLocation: step.endLocation.latLng,
            bookingStatus: 'not_booked',
            bookingDetails: {
              ticketId: null,
              fare: `₹${fare.toFixed(2)}`,
              qrCodeUrl: null,
              bookedAt: null,
            },
          });

          i++;
        } else {
          steps.push({
            step_id: stepId,
            type: step.travelMode.toLowerCase(),
            time: fmtTime(step.startTime),
            title: step.startLocation.name || '',
            startLocation: step.startLocation.latLng,
            endLocation: step.endLocation.latLng,
            subtitle: fmtSubtitle(step.distanceMeters, parseInt(step.staticDuration.replace('s',''),10)),
            description: `${step.startLocation.name || ''} → ${step.endLocation.name || ''}`,
          });
          i++;
        }
      }
      

      const response = {
        distance: `${(route.distanceMeters / 1000).toFixed(1)} KM`,
        duration: `${(parseInt(route.duration.replace('s',''), 10) / 60).toFixed(2)} Minutes`,
        price: `₹${totalFare.toFixed(2)}`,
        routeId: routeId,
        multimodalId: cacheKey,
        polyline: route.polyline.encodedPolyline,
        steps,
      };

      const mainRouteKey = `multimodal_route_${routeId}`;
      redisClient.set(mainRouteKey, JSON.stringify(response), {
        EX: 300, 
      });
      index++;
      responses.push(response);

    };

    routesData.sort((a, b) => {
      const da = parseFloat(a.duration);
      const db = parseFloat(b.duration);
      return sortOrder === 'desc' ? db - da : da - db;
    });
    
    const responseString = JSON.stringify(responses);
    await redisClient.set(cacheKey, responseString, {
      EX: 300, 
    });
    
    
    return responses;

  } catch (error) {
    console.error(error);
    return {};
  }
};

// Function to get route details by routeId
export const getRouteById = async (routeId) => {
  const cacheKey = `multimodal_route_${routeId}`;
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);    
  } 
  return null;
};
//function to book metro and bus with step_id and bookingDetails
export const bookingByStepId = async (step_id, routeId,data) => {
  const cacheKey = `multimodal_route_${routeId}`;
  const cachedData = await redisClient.get(cacheKey);
  
  if (!cachedData) {
    return null;
  }
  const routeData = JSON.parse(cachedData);
  console.log("step_id", step_id);
  routeData.steps.forEach(step => {
    if (step.step_id === step_id) {
      
       if( step.type === 'bus' ) {
        step.bookingStatus = 'booked';
        step.bookingDetails.adultCount = data.adultCount;
        step.bookingDetails.childCount = data.childCount;
        step.bookingDetails.bookedAt = new Date().toISOString();
    }
    if (step.type === 'metro') {
      step.bookingStatus = 'booked';
      step.bookingDetails.passengersCount = data.passengersCount;
      step.bookingDetails.journeyType = 'one-way';;
      step.bookingDetails.bookedAt = new Date().toISOString();
    }
    }
  });
  //update the cache with new booking details
  await redisClient.set(cacheKey, JSON.stringify(routeData), { EX: 86400 });
  return true;

}


export const multiModalRouteCheckout = async (routeId) => {

  const cacheKey = `multimodal_route_${routeId}`;
  const cachedData = await redisClient.get(cacheKey);
  if (!cachedData) {
    return { message: 'Route not found. Please go to the search routes screen.' };
  }

  const routeData = JSON.parse(cachedData);
  const Checkout = [];
  let finalFare  = 0;

    for (const step of routeData.steps) {
      if (step.bookingStatus === 'booked') {
        const bookingDetails = step.bookingDetails;
        if (step.type === 'bus') {
          const { adultCount, childCount, accomodation } = bookingDetails;
          if (typeof adultCount !== 'number' || typeof childCount !== 'number') {
            return {};
          }

          step.bookingDetails.adultCount = adultCount;
          step.bookingDetails.childCount = childCount;
          step.bookingDetails.accomodation = accomodation;

          const distance = haversine(
            step.startLocation.latitude,
            step.startLocation.longitude,
            step.endLocation.latitude,
            step.endLocation.longitude
          );
          step.bookingDetails.distance = distance;
          step.bookingDetails.duration = step.subtitle.split('|')[1].trim();
          const fare = Number(step.bookingDetails.fare) || 10; 
          const totalFare = fare * adultCount + (fare / 2) * childCount;
          step.bookingDetails.totalFare = totalFare;

          const mode = {
            type: 'bus',
            description: step.description,
            distance: step.subtitle.split('|')[0].trim(),
            duration: step.bookingDetails.duration,
            fare: totalFare
          };
          finalFare += totalFare;

          Checkout.push(mode);
        } else if (step.type === 'metro') {
          const { passengersCount, journeyType } = bookingDetails;
          if (typeof passengersCount !== 'number' || !['one-way', 'round-trip'].includes(journeyType)) {
            return {};
          }

          step.bookingDetails.passengersCount = passengersCount;
          step.bookingDetails.journeyType = journeyType;

          const mode = {
            type: 'metro',
            description: step.description,
            distance: step.subtitle.split('|')[0].trim(),
            duration: step.subtitle.split('|')[1].trim(),
            fare: Number(step.bookingDetails.fare.slice(1))*passengersCount|| 10
          };
          finalFare += Number(step.bookingDetails.fare.slice(1)*passengersCount) || 10;
          Checkout.push(mode);
        } else if (step.type === 'walk') {
          const walk = bookingDetails;
          if (
            typeof walk.vehicleType !== 'string' ||
            typeof walk.distance !== 'string' ||
            typeof walk.duration !== 'string' ||
            typeof walk.fare !== 'number'
          ) {
            return { message: 'Invalid walk bookingDetails' };
          }

          step.bookingDetails = walk;

          const mode = {
            type: 'walk',
            description: step.description,
            distance: walk.distance,
            duration: walk.duration,
            fare: walk.fare
          };

          Checkout.push(mode);
        }
      }
    }

  const routeBookingCache = `multimodal_route_booking_${routeId}`;
  await redisClient.set(routeBookingCache, JSON.stringify(routeData), { EX: 86400 });
  Checkout.push({
    type: 'total',
    fare: finalFare
  });
  return Checkout ;
};

// book metroTicket and busTicket with step_id and bookingDetails
export const bookMultiModalRoute = async (routeId, userId, transactionId) => {
  const cacheKey = `multimodal_route_${routeId}`;
  const cachedData = await redisClient.get(cacheKey);
  
  if (!cachedData) {
    return null;
  }
  const routeData = JSON.parse(cachedData);
  //if bbokingStatus is booked then call metroTicketBooking and busTicketBooking
    for (let i = 0; i < routeData.steps.length; i++) {
    const step = routeData.steps[i];

    if (step.bookingStatus === 'booked') {
      if (!step.bookingDetails) {
        console.warn(`Missing bookingDetails at step ${i}`);
        continue;
      }
      
      if (step.type === 'bus') {
        const fare = (Number(step.bookingDetails.totalFare)*Number(step.bookingDetails.adultCount))+(Number(step.bookingDetails.totalFare/2)*Number(step.bookingDetails.childCount)) || 10;
        const data = {
          userId,
          source_route: step.line,
          source_stop_name: step.title,
          source_lat_lng: step.startLocation.latitude + ',' + step.startLocation.longitude,
          destination_lat_lng: step.endLocation.latitude + ',' + step.endLocation.longitude,
          destination_stop_name: step.description?.split('→')[1]?.trim() || '',
          distance: step.subtitle?.split('|')[0]?.trim() || '',
          duration: step.subtitle?.split('|')[1]?.trim() || '',
          fare: fare,
          adult_count: step.bookingDetails.adultCount,
          child_count: step.bookingDetails.childCount,
          transactionId,
        };
        routeData.steps[i].bookingDetails.userId = userId;
        try {
          const ticket = await bookBusTicket(data);
           
          if (ticket?._id) {
            routeData.steps[i].bookingDetails.ticketId = ticket._id;
           
          } else {
            console.error('Bus ticket booking failed, no _id returned');
          }
        } catch (err) {
          console.error('Error booking bus ticket:', err);
        }

      } else if (step.type === 'metro') {
        const fare = Number(step.bookingDetails.fare.slice(1)) * step.bookingDetails.passengersCount || 10;
        const bookingDetails = step.bookingDetails;
        
        const data = {
          user_id: userId,
          source_route: step.line,
          source_stop_name: step.title,
          destination_stop_name: step.description?.split('→')[1]?.trim() || '',
          distance: step.subtitle?.split('|')[0]?.trim() || '',
          duration: step.subtitle?.split('|')[1]?.trim() || '',
          source_lat_lng: step.startLocation.latitude + ',' + step.startLocation.longitude,
          destination_lat_lng: step.endLocation.latitude + ',' + step.endLocation.longitude,
          fare: fare,
          passengerCount: bookingDetails.passengersCount,
          journeyType: bookingDetails.journeyType,
          transactionId,
        };
        routeData.steps[i].bookingDetails.userId = userId;
        try {
          const tickets = await bookMetroTickets(data);
          if (tickets && tickets.length > 0) {
            
            routeData.steps[i].bookingDetails.ticketIds = [];
            for (let j = 0; j < tickets.length; j++) {
              routeData.steps[i].bookingDetails.ticketIds.push(tickets[j]._id);
            }
          } else {
            console.error('Metro ticket booking failed, no _id returned');
          }
        } catch (err) {
          console.error('Error booking metro ticket:', err);
        }
  
      }
    }
  }
  await redisClient.set(cacheKey, JSON.stringify(routeData), { EX: 86400 });
  return true;
}
