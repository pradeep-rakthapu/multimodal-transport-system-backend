import {
  findRoute,
  bookMetroTickets,
  searchMetroStopsService,
  getMetroTickets
} from '../services/metro.service.js';
import cuid from 'cuid';

export const searchMetroStops = (req, res, next) => {
  try {
    const searchTerm = req.query.q||'';
    const result = searchMetroStopsService(searchTerm);
    if (result.length === 0) {
      return res.status(404).json({ message: 'No stops found.' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};
export const searchRoute = (req, res, next) => {
  try {
    const { source_stop_id, destination_stop_id } = req.query;
    if (!source_stop_id || !destination_stop_id) {
      return res.status(400).json({ message: 'Source and destination stop IDs are required.' });
    }
    const result = findRoute(source_stop_id, destination_stop_id);
    if (!result) {
      return res.status(404).json({ message: 'No route found.' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const bookMetro = (req, res, next) => {
  try {
    
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is required.' });
    }
    const data = req.body;
    data.user_id = req.user.id;
    const {
      source_stop_id,
      destination_stop_id,
      source_route,
      destination_route,
      passengersCount,
      switch_stop_id,
      switch_route,
      fare
    } = data;
    const booking = bookMetroTickets(data);
    if (!booking) {
      return res.status(500).json({ message: 'Ticket booking failed.' });
    }
    res.status(201).json({
      message: 'Ticket booked successfully.'});
  } catch (err) {
    next(err);
  }
};

export const getMetroTicketsController = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;
    const tickets = await getMetroTickets(userId);
    if (!tickets || tickets.length === 0) {
      return res.status(404).json({ message: 'No tickets found.' });
    }
    res.json(tickets);
  } catch (err) {
    next(err);
  }
}
