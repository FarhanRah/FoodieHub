const mongoose = require('mongoose');
const Restaurant = require('./models/restaurants');

mongoose.connect('mongodb://localhost:27017/foodiehub', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connection established to database...")
    })
    .catch(err => {
        console.log("Failed to connect to database...")
        console.log(err);
    });

const data = async () => {
    const addedRestaurants = await Restaurant.insertMany([
        { name: "Anatolia's Gate", description: 'Great place for halal food. We guarantee food satisfication!', location: '4700 Kingsway', image: 'https://s3-media0.fl.yelpcdn.com/bphoto/xiHNB9sUCRVqrwP-bv8gYw/l.jpg' },
        { name: 'Saray Turkish', description: 'Great food, generous portions, great setting and welcoming service.', location: '6633 Hastings St', image: 'https://media-cdn.tripadvisor.com/media/photo-s/12/61/d9/1c/adana-kebab-with-cold.jpg' },
        { name: 'Park Crest Diner', description: 'Good food, excellent prices, family owned, good service with a smile!', location: '5901 Broadway', image: 'https://i2.wp.com/btr.michaelkwan.com/wp-content/uploads/2020/01/park-crest-diner.jpg?fit=1280%2C720&ssl=1' },
        { name: 'Cafeoca Brazilian Bistro', description: 'The service is constantly efficient, excellent atmosphere, super friendly staff.', location: '4092 Hastings St', image: 'https://images.dailyhive.com/20190310201634/44319681_447647602429219_1667607353454109481_n.jpg' }
    ])
    console.log(addedRestaurants);
};

data();