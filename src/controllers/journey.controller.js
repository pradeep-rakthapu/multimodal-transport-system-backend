import e from 'express';
import {
  getMultiModalRoute,
  getRouteById,
  bookingByStepId,
  multiModalRouteCheckout,
  bookMultiModalRoute
} from '../services/jourey.service.js';
import { rateCardService } from '../services/ratecard.service.js';

export const getOptions = async (req, res, next) => {
  try {
    const { source, destination } = req.body;
    if (!source || !destination) {
      return res.status(400).json({ message: 'Source or destination not provided' });
    }

    const data  = {};
    data.source = source;
    data.destination = destination;
    data.sortOrder = req.body.sortOrder || 'asc';
    data.departureTime = req.body.departureTime || new Date().toISOString();
    data.destinationName = req.body.destinationName || '';
    data.user_id = req.user ? req.user.id : null;
        if (!req.body.transitMode && req.body.transitMode !== 'BUS' && req.body.transitMode !== 'SUBWAY') {
      data.transitMode = ['BUS', 'SUBWAY'];
    } else if (req.body.transitMode === 'BUS') {
      data.transitMode = ['BUS'];
    } else if (req.body.transitMode === 'SUBWAY') {
      data.transitMode = ['SUBWAY'];  
    };
    const options = await getMultiModalRoute(data);
    if(!options || options.length === 0) {
      return res.status(404).json({ message: 'No routes found' });  
    }
     return res.status(200).json(options); 
  } catch (err) {
    next(err);
  }
};

export const getRouteByIdController = async (req, res, next) => {
  try {
    const routeId = req.params.routeId;
    if (!routeId) {
      return res.status(400).json({ message: 'Route ID not provided' });
    }
    const details = await getRouteById(routeId);
    if (!details) {
      return res.status(404).json({ message: 'Route not found' });
    }
    return res.status(200).json(details);
  } catch (err) {
    next(err);
  }
};

export const bookingByStepIdController = async (req, res, next) => {
  try {
    
    const routeId = req.params.routeId;
    const stepId = req.params.stepId;
    
    if (!routeId) {
      return res.status(400).json({ message: 'Route ID not provided' });
    }
    if (!stepId) {
      return res.status(400).json({ message: 'Step ID not provided' });
    }
    const data = req.body;
    const bookingDetails = await bookingByStepId(stepId, routeId, data);
    console.log(bookingDetails);
    if (!bookingDetails) {
      return res.status(404).json({ message: 'Booking details not found' });
    }
    return res.status(200).json({message:"Booking details retrieved successfully"});
  } catch (err) {
    next(err);
  }
}

export const multiModalRouteCheckoutController = async (req, res, next) => {
  try {
    const routeId = req.params.routeId;
    if (!routeId) {
      return res.status(400).json({ message: 'Route ID not provided' });
    }
    const checkoutDetails = await multiModalRouteCheckout(routeId);
    if (!checkoutDetails) {
      return res.status(404).json({ message: 'Checkout details not found' });
    }
    return res.status(200).json(checkoutDetails);
  } catch (err) {
    next(err);
  }
};
export const bookMultiModalRouteController = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const routeId = req.params.routeId;
    const transactionId = req.body.transactionId;
    if (!transactionId) {
      return res.status(400).json({ message: 'Transaction ID not provided' });
    }
    if (!routeId) {
      return res.status(400).json({ message: 'Route ID not provided' });
    }
    const bookingDetails = await bookMultiModalRoute(routeId, userId, transactionId);
    if (!bookingDetails) {
      return res.status(404).json({ message: 'Booking failed' });
    }
    return res.status(200).json({ message: 'Booking successful', bookingDetails });
  } catch (err) {
    next(err);
  }
}

export const getRateCard = async (req, res, next) => {
  try {
    console.log("Rate card request received",req.body); ;
    const { source, destination } = req.body;
    if (!source || !destination) {
      return res.status(400).json({ message: 'Source or destination not provided' });
    }
    const rateCard = await rateCardService({ source, destination });
    return res.status(200).json(rateCard);
  } catch (err) {
    next(err);
  }
} ;