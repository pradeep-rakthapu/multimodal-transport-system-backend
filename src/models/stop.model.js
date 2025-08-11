import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema({
  stop_id: Number,
  stop_name: String,
  lat: Number,
  lng: Number,
  routeIds: [Number],
});

export default mongoose.model('busstops', stopSchema);
