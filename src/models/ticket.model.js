// models/ticket.model.js
import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  source_stop_id: {
    type: String,
  },
  destination_stop_id: {
    type: String,
  },
  source_lat_lng: {
    type:String
  },
  destination_lat_lng: {
    type: String
  },
  source_stop_name: {
    type: String,
  },
  destination_stop_name: {
    type: String,
  },
  source_route: {
    type: String,
    required: true
  },
  destination_route: {
    type: String,
  },
  boarding_platform: {
    type: String, 
    default: null
  },
  switch_platform: {
    type: String, 
    default: null
  },
  switch_stop_id: {
    type: String,
    default: null
  },
  switch_stop_name: {
    type: String,
    default: null
  },
  switch_route: {
    type: String,
    default: null
  },
  mode: {
    type: String, 
    required: true
  },
  ticket_type: {
    type: String,
    enum: ['single', 'day-pass', 'monthly'],
    default: 'single'
  },
  adult_count: {
    type: Number,
    default: 0
  },
 child_count: {
    type: Number,
    default: 0
 },
 transactionId: {
    type: String,
 },
 distance: {
    type: String,
 },
  duration: {
    type: String,
  },
  expiry: {
    type: Date,
    required: true
  },
  issued_at: {
    type: Date,
    default: Date.now
  },
  fare: {
    type: Number,
    required: true
  }
});

export default mongoose.model('Ticket', ticketSchema);
