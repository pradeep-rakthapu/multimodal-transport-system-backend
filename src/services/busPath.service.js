// import Route from '../models/model.route.js';
// import Stop from '../models/stop.model.js';
// import TinyQueue from 'tinyqueue';

// function getInterchanges(path) {
//   const interchanges = [];
//   for (let i = 1; i < path.length; i++) {
//     if (path[i].routeId !== path[i - 1].routeId) {
//       interchanges.push({
//         at_stop_id: path[i].stopId,
//         stop_name: path[i].stop_name,
//         from_route: path[i - 1].routeName,
//         to_route: path[i].routeName
//       });
//     }
//   }
//   return interchanges;
// }

// export default async function getShortestAndAlternatePaths(sourceStopId, destinationStopId, maxRoutes = 3) {
//   sourceStopId = Number(sourceStopId);
//   destinationStopId = Number(destinationStopId);

//   const [routes, stops] = await Promise.all([
//     Route.find({}),
//     Stop.find({})
//   ]);

//   const stopMap = Object.fromEntries(stops.map(stop => [stop.stop_id, stop]));
//   const routeMap = Object.fromEntries(routes.map(route => [route.route_id, route]));

//   const graph = {}; // stop_id => list of neighbor stops

//   // Initialize graph
//   for (const stop of stops) {
//     graph[stop.stop_id] = [];
//   }

//   // Build graph edges without distance
//   for (const route of routes) {
//     const stopIds = route.stopIds;
//     for (let i = 0; i < stopIds.length - 1; i++) {
//       const from = stopIds[i];
//       const to = stopIds[i + 1];

//       if (!stopMap[from] || !stopMap[to]) continue;

//       // Just track connection — no distance calculation
//       graph[from].push({
//         stopId: to,
//         routeId: route.route_id,
//         routeName: route.route
//       });
//       graph[to].push({
//         stopId: from,
//         routeId: route.route_id,
//         routeName: route.route
//       });
//     }
//   }

//   // MinHeap sorted by number of stops in path
//   const queue = new TinyQueue([], (a, b) => a.path.length - b.path.length);
//   const paths = [];
//   const visited = new Set();

//   queue.push({
//     stopId: sourceStopId,
//     path: [],
//     lastRouteId: null,
//     lastRouteName: null
//   });

//   while (queue.length ) {
//     const current = queue.pop();
//     const { stopId, path, lastRouteId, lastRouteName } = current;

//     const pathKey = `${stopId}-${lastRouteId}`;
//     if (visited.has(pathKey)) continue;
//     visited.add(pathKey);

//     const updatedPath = [...path, {
//       stopId,
//       stop_name: stopMap[stopId]?.stop_name || 'Unknown',
//       routeId: lastRouteId,
//       routeName: lastRouteName
//     }];

//     const firstRouteStop = updatedPath.find(p => p.routeId !== null);

//     if (stopId === destinationStopId) {
//       paths.push({
//         path: updatedPath,
//         total_distance_km: Number((updatedPath.length * 1.5).toFixed(2)), 
//         total_stops: updatedPath.length,
//         interchanges: getInterchanges(updatedPath),
//         boarding_bus: {
//           route_id: firstRouteStop?.routeId || null,
//           route_name: firstRouteStop?.routeName || null
//         }
//       });
//       continue;
//     }

//     for (const neighbor of graph[stopId]) {
//       if (updatedPath.find(p => p.stopId === neighbor.stopId)) continue;

//       queue.push({
//         stopId: neighbor.stopId,
//         path: updatedPath,
//         lastRouteId: neighbor.routeId,
//         lastRouteName: neighbor.routeName
//       });
//     }
//   }

//   return { routes: paths.slice(0, maxRoutes)  };
// }

import Route from '../models/model.route.js';
import Stop from '../models/stop.model.js';
import TinyQueue from 'tinyqueue';
import _ from 'lodash';
import Ticket from '../models/ticket.model.js';
import { ObjectId } from 'mongodb';

export default async function getShortestAndAlternatePaths(sourceStopId, destinationStopId, maxRoutes = 3) {
  sourceStopId = Number(sourceStopId);
  destinationStopId = Number(destinationStopId);

  const [routes, stops] = await Promise.all([
    Route.find({}),
    Stop.find({})
  ]);

  const stopMap = Object.fromEntries(stops.map(s => [s.stop_id, s]));
  
  
  const graph = {};
  stops.forEach(s => { graph[s.stop_id] = []; });
  const directrouteIds = [];

  routes.forEach(route => {
    if(route.stopIds.includes(sourceStopId) && route.stopIds.includes(destinationStopId)){
      directrouteIds.push(route);
    }
    
    const stopIds = route.stopIds;
    for (let i = 0; i < stopIds.length - 1; i++) {
      const a = stopIds[i], b = stopIds[i+1];
      if (graph[a] && graph[b]) {
        graph[a].push({
          stopId: b,
          routeId: route.route_id,
          routeName: route.route
        });
        graph[b].push({
          stopId: a,
          routeId: route.route_id,
          routeName: route.route
        });
      }
    }
  });

  const queue = new TinyQueue([], (a, b) => a.path.length - b.path.length);
  const visited = new Set();
  const results = [];

  // Initialize with source stop
  queue.push({ 
    stopId: sourceStopId, 
    path: [], 
    lastRoute: null 
  });

  while (queue.length > 0 && results.length<=maxRoutes ) {
    const { stopId, path, lastRoute } = queue.pop();
    
    // Create visited key: stopId + lastRouteId
    const visitedKey = `${stopId}-${lastRoute?.routeId || 'null'}`;
    if (visited.has(visitedKey)) continue;
    visited.add(visitedKey);

    
    const newPath = [...path, {
      stopId,
      routeId: lastRoute?.routeId || null,
      routeName: lastRoute?.routeName || null
    }];

    
    if (stopId === destinationStopId) {
      
      if (newPath.length > 1) {
        newPath[0].routeId = newPath[1].routeId;
        newPath[0].routeName = newPath[1].routeName;
      }

      const interchanges = [];
      
      for (let i = 1; i < newPath.length; i++) {
        if (newPath[i].routeId !== newPath[i-1].routeId) {
          interchanges.push({
            at_stop_id: newPath[i-1].stopId,
            stop_name: stopMap[newPath[i-1].stopId].stop_name,
            from_route_id: newPath[i-1].routeId,
            from_route_name: newPath[i-1].routeName,
            to_route_id: newPath[i].routeId,
            to_route_name: newPath[i].routeName
          });
        }
      }

      let interchangeNames = interchanges.map(i => i.to_route_name).join(" → ");

      // boarding bus info
      const boardingBus = newPath.length > 1 
        ? { 
            route_id: newPath[0].routeId, 
            route_name: newPath[0].routeName 
          } 
        : null;

      const formattedPath = newPath.map(p => ({
        stopId: p.stopId,
        stop_name: stopMap[p.stopId].stop_name,
        routeId: p.routeId,
        routeName: p.routeName
      }));

      results.push({
        is_direct_mode:false,
        path: formattedPath,
        boarding_bus: boardingBus,
        interchanges,
        total_stops: newPath.length,
        interchanges_names:interchangeNames
      });
      if(results.length == maxRoutes) break;
      continue;
    }

    // Explore neighbors
    for (const neighbor of graph[stopId]) {
      if (newPath.some(p => p.stopId === neighbor.stopId)) continue;
      
      queue.push({
        stopId: neighbor.stopId,
        path: newPath,
        lastRoute: {
          routeId: neighbor.routeId,
          routeName: neighbor.routeName
        }
      });
    }
  }
  const directRoutesData = [];
  directrouteIds.forEach(route=>{
    let sourceStopIndex = route.stopIds.indexOf(sourceStopId);
    let destinationStopIndex = route.stopIds.indexOf(destinationStopId);
    const total_stops = Math.abs(destinationStopIndex-sourceStopIndex)+1;
    const boardingBus = { 
            route_id: route.route_id, 
            route_name: route.route
          };

      const formattedPath = route.stopIds.map(p => ({
        stopId: p,
        stop_name: stopMap[p].stop_name,
        routeId: route.route_id,
        routeName: p.route
      }));

      directRoutesData.push({
        is_direct_mode:true,
        path: formattedPath,
        boarding_bus: boardingBus,
        interchanges:{},
        total_stops: total_stops
      });

  });
  
  directRoutesData.sort((a,b)=>a.total_stops-b.total_stops);
  results.push(...directRoutesData.slice(0,3));

  return { routes: results };
}

export const searchBusStopName = async (searchTerm) => {
  
  if (!searchTerm || typeof searchTerm !== 'string') {
    throw new Error('Invalid search term');
  }

  const stops = await Stop.find({
    stop_name: { $regex: searchTerm, $options: 'i' } 
  },{stop_id:1,stop_name:1,lat:1,lng:1}).limit(10);

  return stops;
};


export const bookBusTicket = async(data)=>{
  
  const mode = 'bus'
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
  const adult_count = data.adult_count || 0;
  const child_count = data.child_count || 0;
  const user_id = data.userId;
  const ticket = await Ticket.create({
    mode,
    source_stop_id,
    destination_stop_id,
    source_route,
    destination_route,
    switch_stop_id,
    switch_route,
    switch_stop_name,
    source_stop_name,
    destination_stop_name,
    source_lat_lng,
    destination_lat_lng,
    fare,
    expiry,
    adult_count,
    child_count,
    user_id
  });
  if (!ticket) {
    throw new Error('Ticket booking failed');
  }
  return ticket;
}

export const getTicket = async (ticketId) => {
  if (!ticketId) {
    throw new Error('Ticket ID is required');
  }

  const ticket = await Ticket.findById( new ObjectId(ticketId));
  if (!ticket) {
    throw new Error('Ticket not found');
  }
  return ticket;
};