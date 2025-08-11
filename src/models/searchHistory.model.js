import mongoose from "mongoose";
const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
  },
    locationName: {  
    type: String,
    required: true
    },
    latitude: {
    type: Number,
    required: true
    },
    longitude: {
    type: Number,
    required: true
    }
});
const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);
export default SearchHistory;