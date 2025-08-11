import getShortestAndAlternatePaths from '../services/busPath.service.js';
import {searchBusStopName} from '../services/busPath.service.js';
import { bookBusTicket } from '../services/busPath.service.js';
import Ticket from '../models/ticket.model.js';
import { getTicket} from '../services/busPath.service.js';
export const getShortestPath = async (req, res) => {
  try {
    const { sourceStopId, destinationStopId } = req.query;

    if (!sourceStopId || !destinationStopId) {
        return res.status(400).json({ message: 'sourceStopId and destinationStopId are required.' });
    }

    const result = await getShortestAndAlternatePaths(sourceStopId, destinationStopId);
    
    if (result.length === 0) {
        return res.status(404).json({ message: 'No path found between the stops.' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in getShortestPath:', error);
     return  res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const searchByBusStopName = async(req,res)=>{
  try{console.log("enter");
    const searchTerm = req.query.q;
    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({ message: 'Invalid search term' });  
    }

    const result = await searchBusStopName(searchTerm);
    if(result.length == 0) {
      return res.status(404).json({message : 'No path found between the stops'});
    }
    return res.status(200).json(result);
  } catch(error) {
    console.error('Error in getShortestPath:', error);
     return  res.status(500).json({ message: 'Internal Server Error' });
  }
}

export const bookTicket = async (req, res) => {
  try {
    const data = {
      ...req.body,
      userId: req.user?.id,
    };
    let requiredFields = ['source_stop_id', 'destination_stop_id', 'source_route', 'destination_route', 'adult_count', 'child_count', 'fare'];
  
    for (let field of requiredFields) {
      if (!data[field]) {
        return res.status(400).json({ message: `Field ${field} is required.` });
      }
    }
  
    const ticket = await bookBusTicket(data);
    if (!ticket) {
      return res.status(500).json({ message: 'Ticket booking failed.' });
    }
    return res.status(201).json(ticket);
  } catch (error) {
    console.error('Error in bookTicket:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

//get getTickets by userId and check if expried
export const getTicketsByUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tickets = await Ticket.find({ user_id: userId, mode: 'bus', expiry: { $gt: new Date() } });
    return res.status(200).json(tickets);
  } catch (error) {
    console.error('Error in getTicketsByUser:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getTicketDetails = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    if (!ticketId) {
      return res.status(400).json({ message: 'Ticket ID is required.' });
    }

    const ticket = await getTicket(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }
    
    return res.status(200).json(ticket);
  } catch (error) {
    console.error('Error in getTicketDetails:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}