const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./users');
const Restaurant = require('./restaurants');

const reviewSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true
    },
    review: {
        type: String,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    restaurant: {
        type: Schema.Types.ObjectId,
        ref: "Restaurant"
    }
});

module.exports = mongoose.model('Review', reviewSchema);