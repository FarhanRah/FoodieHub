const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: String,
    onSale: {
        type: String,
        default: 'No'
    }
})

module.exports = mongoose.model('Product', productSchema);