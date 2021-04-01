const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const Product = require('./products');
const Review = require('./reviews');

const restaurantSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    // image: {
    //     type: String,
    //     default: 'https://www.salonlfc.com/wp-content/uploads/2018/01/image-not-found-scaled-1150x647.png'
    // },
    image:
    {
        url: String,
        filename: String
    },
    products: [{
        type: Schema.Types.ObjectId,
        ref: "Product"
    }],
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: "Review"
    }],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
})

restaurantSchema.post('findOneAndDelete', async (restaurant) => {
    if (restaurant) {
        const products = await Product.deleteMany({ _id: { $in: restaurant.products } });
        const reviews = await Review.deleteMany({ _id: { $in: restaurant.reviews } });
        console.log(products, reviews);
    }
})

module.exports = mongoose.model('Restaurant', restaurantSchema);