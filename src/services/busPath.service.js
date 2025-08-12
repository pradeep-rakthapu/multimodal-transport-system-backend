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

export default async function getShortestAndAlternatePaths(
  sourceStopId,
  destinationStopId,
  maxRoutes = 3,
  maxDepth = 300
) {
  sourceStopId = Number(sourceStopId);
  destinationStopId = Number(destinationStopId);

  const [routes, stops] = await Promise.all([Route.find({}), Stop.find({})]);
  const stopMap = Object.fromEntries(stops.map((s) => [s.stop_id, s]));

  // build adjacency
  const graph = {};
  stops.forEach((s) => (graph[s.stop_id] = []));
  const directRouteObjects = [];

  for (const route of routes) {
    const stopIds = route.stopIds || [];
    if (stopIds.includes(sourceStopId) && stopIds.includes(destinationStopId)) {
      directRouteObjects.push(route);
    }
    for (let i = 0; i < stopIds.length - 1; i++) {
      const a = stopIds[i],
        b = stopIds[i + 1];
      if (graph[a] && graph[b]) {
        graph[a].push({ stopId: b, routeId: route.route_id, routeName: route.route });
        graph[b].push({ stopId: a, routeId: route.route_id, routeName: route.route });
      }
    }
  }

  // minimal binary heap
  class MinHeap {
    constructor(compare) {
      this.arr = [];
      this.compare = compare;
    }
    push(x) {
      this.arr.push(x);
      this._up(this.arr.length - 1);
    }
    pop() {
      if (!this.arr.length) return undefined;
      const top = this.arr[0];
      const last = this.arr.pop();
      if (this.arr.length) {
        this.arr[0] = last;
        this._down(0);
      }
      return top;
    }
    size() {
      return this.arr.length;
    }
    _up(i) {
      const { arr, compare } = this;
      let idx = i;
      const item = arr[idx];
      while (idx > 0) {
        const p = Math.floor((idx - 1) / 2);
        if (compare(item, arr[p]) < 0) {
          arr[idx] = arr[p];
          idx = p;
        } else break;
      }
      arr[idx] = item;
    }
    _down(i) {
      const { arr, compare } = this;
      const n = arr.length;
      let idx = i;
      const item = arr[idx];
      while (true) {
        let l = 2 * idx + 1;
        let r = l + 1;
        let smallest = idx;
        if (l < n && compare(arr[l], arr[smallest]) < 0) smallest = l;
        if (r < n && compare(arr[r], arr[smallest]) < 0) smallest = r;
        if (smallest === idx) break;
        arr[idx] = arr[smallest];
        idx = smallest;
      }
      arr[idx] = item;
    }
  }

  // comparator: lexicographic (interchanges, pathLength)
  // Note: node.interchanges is numeric (fewest transfers), node.path.length measures traversed length
  const cmp = (a, b) => {
    if (a.interchanges !== b.interchanges) return a.interchanges - b.interchanges;
    return a.path.length - b.path.length;
  };

  // Best cost map for (stopId|lastRouteId) -> { interchanges, length }
  const bestCostMap = new Map();
  function bestKey(stopId, lastRouteId) {
    return `${stopId}::${lastRouteId ?? 'null'}`;
  }
  function isBetterCost(newCost, oldCost) {
    if (!oldCost) return true;
    if (newCost.interchanges !== oldCost.interchanges) {
      return newCost.interchanges < oldCost.interchanges;
    }
    return newCost.length < oldCost.length;
  }

  const heap = new MinHeap(cmp);
  // node: { stopId, path: [{stopId, routeId, routeName}], lastRouteId, lastRouteName, interchanges }
  heap.push({
    stopId: sourceStopId,
    path: [],
    lastRouteId: null,
    lastRouteName: null,
    interchanges: 0,
  });
  bestCostMap.set(bestKey(sourceStopId, null), { interchanges: 0, length: 0 });

  const results = [];

  while (heap.size() > 0 && results.length < maxRoutes) {
    const node = heap.pop();
    const { stopId, path, lastRouteId, lastRouteName, interchanges } = node;

    // safety
    if (path.length > maxDepth) continue;

    // build newPath (append current stop with info about how we arrived)
    const newPath = path.concat({ stopId, routeId: lastRouteId, routeName: lastRouteName });

    // if reached destination, format and add
    if (stopId === destinationStopId) {
      // set first stop's route info to the first real boarding route (so null -> route isn't counted)
      if (newPath.length > 1) {
        newPath[0].routeId = newPath[1].routeId;
        newPath[0].routeName = newPath[1].routeName;
      }

      // Build interchanges array but DO NOT count boarding as a transfer (null -> route).
      const interchangesArr = [];
      for (let i = 1; i < newPath.length; i++) {
        const prev = newPath[i - 1];
        const cur = newPath[i];
        // only count a transfer if previous route was a real route (not null) and it changed
        if (prev.routeId !== null && prev.routeId !== cur.routeId) {
          interchangesArr.push({
            at_stop_id: prev.stopId,
            stop_name: stopMap[prev.stopId]?.stop_name ?? null,
            from_route_id: prev.routeId,
            from_route_name: prev.routeName,
            to_route_id: cur.routeId,
            to_route_name: cur.routeName,
          });
        }
      }

      const interchangeNames = interchangesArr.length
        ? interchangesArr.map((it) => it.to_route_name).join(' → ')
        : '';

      const boardingBus = newPath.length > 1 ? { route_id: newPath[0].routeId, route_name: newPath[0].routeName } : null;

      const formattedPath = newPath.map((p) => ({
        stopId: p.stopId,
        stop_name: stopMap[p.stopId]?.stop_name ?? null,
        routeId: p.routeId,
        routeName: p.routeName,
      }));

      // Push numeric interchange_count to make sorting unambiguous and consistent with search internal metric
      results.push({
        is_direct_mode: false,
        path: formattedPath,
        boarding_bus: boardingBus,
        interchanges: interchangesArr,
        interchange_count: interchanges, // numeric, matches node.interchanges used by comparator
        total_stops: newPath.length,
        interchanges_names: interchangeNames,
      });

      // do not expand neighbors from destination
      continue;
    }

    // Expand neighbors
    const neighbors = graph[stopId] || [];
    for (const nb of neighbors) {
      // avoid cycles on stops
      if (newPath.some((p) => p.stopId === nb.stopId)) continue;

      // compute new interchange count
      // boarding first route (lastRouteId === null) should NOT increment interchanges
      const willIncrement = lastRouteId !== null && nb.routeId !== lastRouteId ? 1 : 0;
      const newInterchanges = interchanges + willIncrement;
      const newLength = newPath.length + 1;

      const key = bestKey(nb.stopId, nb.routeId);
      const newCost = { interchanges: newInterchanges, length: newLength };
      const oldCost = bestCostMap.get(key);

      if (!oldCost || isBetterCost(newCost, oldCost)) {
        bestCostMap.set(key, newCost);
        heap.push({
          stopId: nb.stopId,
          path: newPath,
          lastRouteId: nb.routeId,
          lastRouteName: nb.routeName,
          interchanges: newInterchanges,
        });
      }
    }
  }

   // Build direct routes as single-route candidates (only include stops between source and destination)
  const directRoutesData = [];

  // helper: find all indices of value in array
  function findAllIndexes(arr, val) {
    const res = [];
    for (let i = 0; i < arr.length; i++) if (arr[i] === val) res.push(i);
    return res;
  }

  for (const route of directRouteObjects) {
    // normalize to numbers to avoid type mismatches
    const stopIdsRaw = route.stopIds || [];
    const stopIds = stopIdsRaw.map((x) => Number(x));

    const sIdxs = findAllIndexes(stopIds, sourceStopId);
    const dIdxs = findAllIndexes(stopIds, destinationStopId);
    if (sIdxs.length === 0 || dIdxs.length === 0) continue;

    // choose best pair of indices: minimal distance between source and dest
    let best = null;
    for (const si of sIdxs) {
      for (const di of dIdxs) {
        const dist = Math.abs(di - si);
        const forward = si <= di;
        // prefer the smallest dist; if tie prefer forward (optional)
        if (best === null || dist < best.dist || (dist === best.dist && forward && !best.forward)) {
          best = { si, di, dist, forward };
        }
      }
    }
    if (!best) continue;

    const { si, di, forward } = best;
    const slice = forward ? stopIds.slice(si, di + 1) : stopIds.slice(di, si + 1).reverse();

    const formattedPath = slice.map((p) => ({
      stopId: p,
      stop_name: stopMap[p]?.stop_name ?? null,
      routeId: route.route_id,
      routeName: route.route,
    }));

    directRoutesData.push({
      is_direct_mode: true,
      path: formattedPath,
      boarding_bus: { route_id: route.route_id, route_name: route.route },
      interchanges: [],        // human-readable transfers (none for direct)
      interchange_count: 0,    // numeric (used for sorting)
      total_stops: formattedPath.length,
      interchanges_names: '',
    });
  }
   const combinedRaw = [...results, ...directRoutesData];

  // dedupe by path stopIds + routeIds to avoid duplicate candidates
  const seen = new Set();
  const combined = [];
  for (const r of combinedRaw) {
    const pathKey = r.path.map((p) => `${p.stopId}:${p.routeId ?? 'null'}`).join('|');
    if (seen.has(pathKey)) continue;
    seen.add(pathKey);
    combined.push(r);
  }


  combined.sort((a, b) => {
    const aInter = typeof a.interchange_count === 'number' ? a.interchange_count : (Array.isArray(a.interchanges) ? a.interchanges.length : 0);
    const bInter = typeof b.interchange_count === 'number' ? b.interchange_count : (Array.isArray(b.interchanges) ? b.interchanges.length : 0);
    if (aInter !== bInter) return aInter - bInter;

    const aStops = a.total_stops || (Array.isArray(a.path) ? a.path.length : Infinity);
    const bStops = b.total_stops || (Array.isArray(b.path) ? b.path.length : Infinity);
    if (aStops !== bStops) return aStops - bStops;

    if ((a.is_direct_mode ? 1 : 0) !== (b.is_direct_mode ? 1 : 0)) return (b.is_direct_mode ? 1 : 0) - (a.is_direct_mode ? 1 : 0);

    return 0;
  });

  // limit and return
  return { routes: combined.slice(0, maxRoutes) };
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