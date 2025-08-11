import metroData from '../json/metroData.js'; 
import metroStops from '../json/metroStops.js';
import metroticketsFare from '../json/metroFare.js' 
import _ from 'lodash';
import Ticket from '../models/ticket.model.js';
import cuid from 'cuid';

const connectedStops ={
    "MGB" : {
      "Red Line":[1,2],
      "Green Line":[3,4]
    },
    "AME" : {
      "Red Line":[1,2],
      "Blue Line":[3,4],
    },
    "PRG":{
      "Blue Line":[1,2],
      "Green Line":[3,4]
    }  
}

export const findRoute =  (fromId, toId) => {
  let sourceRoute = '';
  let destinationRoute = '';
  let cnt = 0;
  // Check if both stops are the same and exists
  if (fromId !=toId) {
    const fromStop = findStopById(fromId);
    const toStop = findStopById(toId);
    if (!fromStop || !toStop) {
      return [];
    }
  } else {
    return [];
  }
    

  for (const line of metroData) {
    
    const lineStops  = line['parentStopIds'];
    cnt++;
    
    if(lineStops.includes(fromId) && sourceRoute === ''){
      sourceRoute = line.route;
    }
    if(lineStops.includes(toId) && destinationRoute === '' ){
      destinationRoute = line.route;
    }
    
    if(sourceRoute !=='' && destinationRoute !=='' && sourceRoute === destinationRoute){
      
        const sourceStopIdx = lineStops.indexOf(fromId);
        const destinationStopIdx = lineStops.indexOf(toId);
        console.log(sourceStopIdx, destinationStopIdx);
        let platform = 1;
        if(destinationStopIdx - sourceStopIdx<0){
          platform = 2;
        }
        let noOfStops = Math.abs(sourceStopIdx-destinationStopIdx)+1;
        const fare = getMetroTicketFare(fromId,toId);
        const sourceStop = findStopById(fromId);
        const destinationStop = findStopById(toId);

        const result = {
          source_stop : sourceStop.stop_name,
          destination_stop : destinationStop.stop_name,
          metro_route:sourceRoute,
          boarding_platform : platform,
          no_of_stops:noOfStops,
          fare:fare
        }
        return result;
    } else if((sourceRoute != destinationRoute) && (cnt == 3)){
        const sourceRouteData = metroDataByRoute(sourceRoute);
        const destinationRouteData = metroDataByRoute(destinationRoute);
        console.log(destinationRoute);
        const intersectionStop = _.intersection(sourceRouteData['parentStopIds'],destinationRouteData['parentStopIds'])[0]
        
        let firstLength = Math.abs(sourceRouteData['parentStopIds'].indexOf(fromId) - sourceRouteData['parentStopIds'].indexOf(intersectionStop))+1;
        let secondLength = Math.abs(destinationRouteData['parentStopIds'].indexOf(intersectionStop) - destinationRouteData['parentStopIds'].indexOf(toId));
        let boardingPlatform  = getPlatform(fromId,intersectionStop,sourceRouteData);
        let switchPlatform = getPlatform(intersectionStop, toId, destinationRouteData);
        const fare =  getMetroTicketFare(fromId,toId);
        const sourceStop = findStopById(fromId);
        const intersectionStopData = findStopById(intersectionStop);
        const destinationStop = findStopById(toId);
        
        const result = {
          metro_route : sourceRoute,
          source_stop : sourceStop.stop_name,
          switch_stop : intersectionStopData.stop_name,
          destination_stop : destinationStop.stop_name,
          boarding_platform : boardingPlatform,
          switch_platform : switchPlatform,
          switch_stop: intersectionStopData.stop_name,
          switch_route : destinationRoute,
          switch_stop_id : intersectionStopData.stop_id,
          no_of_stops : firstLength+secondLength, 
          fare : fare
        }
        console.log(result);
        return result;

    }
  }
  
  
  throw new Error('Route not found');
};


function findStopById(stopId){
    const id = String(stopId);
  const stop = metroStops.find(s => String(s.stop_id) === id);
  return stop || null;
}


// export const bookTickets = (data) => {
  
//       const {
//       source_stop_id,
//       destination_stop_id,
//       source_route,
//       destination_route,
//       passengerCount,
//       switch_stop_id,
//       switch_route,
//       fare
//     } = data;
//   for (let i = 0; i < passengerCount; i++) {
//     tickets.push({
//       ticketId: `TICKET-${Date.now()}-${i+1}`,
//       from: fromId,
//       to: toId,
//       passenger: i+1,
//       fare: route.fare / passengerCount
//     });
//   }
//   return { bookingId: `BOOK-${Date.now()}`, tickets };
// };

export const getMetroTicketFare = (stop1, stop2) => {
  let finalFare = '';
  for(const fare of metroticketsFare){
    
      if(fare.includes(stop1) && fare.includes(stop2)){
      
        let data = fare[2];
        data = data.split('_')[1];
       finalFare = Number(data);
      }
  }
  return finalFare;
};

function metroDataByRoute(route){
 return metroData.filter(r=>r.route==route)[0]
}
function getPlatform(fromId, toId, route){
  let platform = '';
  if(route['parentStopIds'].indexOf(toId) - route['parentStopIds'].indexOf(fromId)>0){
    
    if(connectedStops[fromId]){
       platform = connectedStops[fromId][route.route][0];
    } else {
      platform  = 1;
    }
  } else {
    
    if(connectedStops[fromId]){
       platform = connectedStops[fromId][route.route][1];
    } else {
      platform  = 2;
    }
  }
  return platform;

}

export function searchMetroStopsService(query) {
    if (!query) {
        return [];
    }
    const normalize = str =>
    String(str)
      .toLowerCase()
      .trim();

  const lowerCaseQuery = normalize(query);

  
  const matches = metroStops
    .filter(stop => {
      if (!stop.stop_name) return false;
      return normalize(stop.stop_name).includes(lowerCaseQuery);
    });

  
  const seen = new Set();
  const unique = [];
  for (const stop of matches) {
    const name = normalize(stop.stop_name);
    if (!seen.has(name)) {
      seen.add(name);
      unique.push(stop);
    }
  }

  return unique.slice(0, 5);
}

export async function bookMetroTickets(data) {
      const mode = 'metro';
      console.log(data);
      const source_stop_id = data.source_stop_id;
      const destination_stop_id = data.destination_stop_id;
      const source_route = data.source_route;
      const destination_route = data.destination_route;
      const switch_stop_id = data.switch_stop_id || null;
      const switch_route = data.switch_route || null;
      const boarding_platform = data.boarding_platform || null;
      const switch_platform = data.switch_platform || null;
      const source_stop_name = data.source_stop_name || null;
      const destination_stop_name = data.destination_stop_name || null;
      const switch_stop_name = data.switch_stop_name || null;
      const source_lat_lng = data.source_lat_lng || null;
      const destination_lat_lng = data.destination_lat_lng || null;
      const fare = data.fare;
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const adult_count = 1;
      const passengerCount = data.passengerCount || 1;
      const child_count = data.childCount || 0;
      const user_id = data.user_id || null;
      const ticketId = cuid();
      const tickets = [];
      for(let i=0;i<passengerCount;i++){
        const ticket = await Ticket.create({
          source_stop_id,
          destination_stop_id,
          source_route,
          destination_route,
          switch_stop_id,
          switch_route,
          boarding_platform,
          switch_platform,
          source_stop_name,
          destination_stop_name,
          switch_stop_name,
          source_lat_lng,
          destination_lat_lng,
          mode,
          fare,
          adult_count: adult_count + i,
          child_count: child_count + i,
          expiry,
          user_id
        });
        tickets.push(ticket);
      }
        
    if (!tickets || tickets.length === 0) {
    
      throw new Error('No tickets booked'); 
    }
    return tickets;
};

export const getMetroTickets = async (userId) => {
   const groups = await Ticket.aggregate([
    
    {
      $addFields: {
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$issued_at'
          }
        }
      }
    },
    {
      $group: {
        _id: {
          source:      '$source_stop_name',
          destination: '$destination_stop_name',
          date:        '$date'
        },
        ticketCount: { $sum: 1 },
        totalFare:   { $sum: '$fare' }
      }
    },
    {
      $sort: {
        '_id.date':            1,
        '_id.source':          1,
        '_id.destination':     1
      }
    },
    {
      $project: {
        _id:                    0,
        source_stop_name:       '$_id.source',
        destination_stop_name:  '$_id.destination',
        date:                   '$_id.date',
        ticketCount:            1,
        totalFare:              1
      }
    }
  ]);

  return groups;
}