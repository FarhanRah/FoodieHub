if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const Restaurant = require('./models/restaurants');
const Product = require('./models/products');
const User = require('./models/users');
const Review = require('./models/reviews');
//const dbUrl = process.env.DB_URL;
const path = require('path');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const flash = require('connect-flash');
const { isLoggedIn } = require('./isLoggedIn');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const MongoDBStore = require('connect-mongo')(session);
const multer = require('multer');
// const storage = require('./cloudinary');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'FoodieHub',
        allowedFormats: ['jpeg', 'png', 'jpg']
    }
});

const upload = multer({ storage });
const mongoose = require('mongoose');
const geocoding = require('@mapbox/mapbox-sdk/services/geocoding');

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/foodiehub';
mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connection established to database...")
    })
    .catch(err => {
        console.log("Failed to connect to database...")
        console.log(err);
    });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'))

const secret = process.env.SECRET || 'thisismysecret';

const store = new MongoDBStore({
    url: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e);
})

const sessionConfig = {
    store,
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};
app.use(session(sessionConfig));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    if (!['/login'].includes(req.originalUrl)) {
        req.session.returnTo = req.originalUrl;
    }
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('home');
})

app.get('/restaurants', async function (req, res) {
    const restaurants = await Restaurant.find();
    const { resName } = req.query;
    let status = false;
    res.render('restaurants', { restaurants, status, resName });
})

app.get('/contact', (req, res) => {
    res.render('contact');
})

app.get('/register', (req, res) => {
    res.render('register');
})

app.get('/login', (req, res) => {
    res.render('login');
})

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
})

app.get('/restaurants/search', async (req, res) => {
    console.log(req.query);
    const { resName } = req.query;
    //const restaurants = await Restaurant.find({ name: resName });
    //const restaurants = await Restaurant.find({ $text: { $search: resName } });
    //const restaurants = await Restaurant.find({ name: { $regex: '.*' + resName + '.*' } });
    let restaurants = await Restaurant.find(
        { "name": { "$regex": resName, "$options": "i" } }
    );
    let status = false;
    if (restaurants.length === 0) {
        restaurants = await Restaurant.find({});
        status = true;
    }
    console.log(restaurants, status);
    res.render('restaurants', { restaurants, status, resName });
})

app.get('/restaurants/new', isLoggedIn, (req, res) => {
    res.render('new');
})

app.get('/restaurants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findById(id)
            .populate('products')
            .populate({
                path: 'reviews',
                populate: {
                    path: 'user'
                }
            });
        for (let review of restaurant.reviews)
            console.log(`${review._id}(Review ID) - Only for ADMINISTRATIVE purpose`);
        res.render('details', { restaurant });
    } catch (err) {
        console.log(err);
        res.render('404');
    }
})

app.get('/restaurants/:id/new', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findById(id);
        res.render('newproduct', { restaurant });
    } catch (err) {
        console.log(err);
        res.render('404');
    }
})

app.get('/restaurants/:id/edit', async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        res.render('editrestaurant', { restaurant });
    } catch (err) {
        console.log(err);
        res.render('404');
    }
})

app.all('/restaurants/:id/delete', async (req, res) => {
    try {
        const resToBeDeleted = await Restaurant.findById(req.params.id);
        await cloudinary.uploader.destroy(resToBeDeleted.image.filename);
        const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
        res.redirect('/restaurants');
    } catch (err) {
        console.log(err);
        res.render('404');
    }
})

app.get('/restaurants/:id/reviews/new', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findById(id);
        res.render('reviewNew', { restaurant });
    } catch (err) {
        console.log(err);
        res.render('404');
    }
})

app.all('/restaurants/:res_id/reviews/:rev_id/delete', isLoggedIn, async (req, res) => {
    const review = await Review.findByIdAndDelete(req.params.rev_id);
    res.redirect(`/restaurants/${req.params.res_id}`);
})

app.get('/restaurants/:res_id/products/:product_id/edit', isLoggedIn, async (req, res) => {
    try {
        const product = await Product.findById(req.params.product_id);
        const restaurant = await Restaurant.findById(req.params.res_id);
        res.render('editproduct', { product, restaurant });
    } catch (err) {
        console.log(err);
        res.render('404');
    }
})

app.post('/restaurants', upload.single('image'), async (req, res) => {
    const geoData = await geocoder.forwardGeocode({
        query: req.body.restaurant.location,
        limit: 1
    }).send()
    const newRestaurant = new Restaurant(req.body.restaurant);
    newRestaurant.geometry = geoData.body.features[0].geometry;
    newRestaurant.image.url = req.file.path;
    newRestaurant.image.filename = req.file.filename;
    newRestaurant.owner = req.user;
    await newRestaurant.save();
    console.log(newRestaurant);
    res.redirect('/restaurants');
})

app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        console.log(`Register user: ${registeredUser}`);
        req.login(registeredUser, err => {
            if (err)
                res.send('ERROR!');
            else
                res.redirect('/');
        })
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    const redirectUrl = req.session.returnTo || '/';
    console.log(redirectUrl);
    delete req.session.returnTo;
    res.redirect(redirectUrl);
})

app.post('/restaurants/:id', async (req, res) => {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id);
    const product = new Product(req.body.product);
    restaurant.products.push(product);
    await product.save();
    await restaurant.save();
    res.redirect(`/restaurants/${id}`);
})

app.post('/restaurants/:id/reviews', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const review = new Review(req.body.review);
    const restaurant = await Restaurant.findById(id);
    const user = await User.findById(req.user._id);
    review.restaurant = restaurant;
    review.user = user;
    restaurant.reviews.push(review);
    await review.save();
    await restaurant.save();
    res.redirect(`/restaurants/${id}`);
})

app.put('/restaurants/:id/edit', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const resToBeEdited = await Restaurant.findById(id);
    await cloudinary.uploader.destroy(resToBeEdited.image.filename);
    const restaurant = await Restaurant.findByIdAndUpdate(id, req.body.restaurant);
    const geoData = await geocoder.forwardGeocode({
        query: req.body.restaurant.location,
        limit: 1
    }).send();
    restaurant.geometry = geoData.body.features[0].geometry;
    restaurant.image.url = req.file.path;
    restaurant.image.filename = req.file.filename;
    await restaurant.save();
    res.redirect(`/restaurants/${id}`);
})

app.put('/restaurants/:res_id/products/:product_id', async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.product_id, req.body.product);
    console.log(product);
    res.redirect(`/restaurants/${req.params.res_id}`);
})

// app.delete('/restaurants/:id', async (req, res) => {
//     // const resToBeDeleted = await Restaurant.findById(req.params.id);
//     // console.log(`resToBeDeleted: ${resToBeDeleted}`);
//     // await cloudinary.uploader.destroy(resToBeDeleted.image.filename);
//     // const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
//     res.redirect('/restaurants');
// })

app.delete('/restaurants/:res_id/products/:prod_id', async (req, res) => {
    const { res_id, prod_id } = req.params;
    const product = await Product.findByIdAndDelete(prod_id);
    res.redirect(`/restaurants/${res_id}`);
})

app.all('*', (req, res) => {
    res.render('404');
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening to port ${port}...`)
})