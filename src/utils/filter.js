export const sortByFastest = routes =>
  [...routes].sort((a, b) => a.duration.seconds - b.duration.seconds);
export const sortByCheapest = routes =>
  [...routes].sort((a, b) => (a.transitFare?.amount || 0) - (b.transitFare?.amount || 0));
export const sortByTransfers = routes =>
  [...routes].sort((a, b) =>
    a.legs.reduce((sum, leg) => sum + (leg.transitDetails?.numStops || 0), 0) -
    b.legs.reduce((sum, leg) => sum + (leg.transitDetails?.numStops || 0), 0)
  );