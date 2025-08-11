import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
  route: String,
  route_id: Number,
  origin_destination: String,
  stopIds: [Number], // ordered stop IDs
});


export default mongoose.model('Route', routeSchema);
