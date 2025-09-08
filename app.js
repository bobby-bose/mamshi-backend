const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const errorMiddleware = require('./middlewares/error');
const cors = require('cors');
const app = express();
const path = require('path');

const allowedOrigins = [
  "http://localhost:3000",     // React dev server
  "https://slouch.netlify.app" // Production frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));


app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));


const user = require('./routes/userRoute');
const product = require('./routes/productRoute');
const order = require('./routes/orderRoute');
const payment = require('./routes/paymentRoute');
const giveaway = require('./routes/giveawayroute');
const addProduct = require('./routes/addProduct');
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use('/api/v1', user);
app.use('/api/v1', product);
app.use('/api/v1', order);
app.use('/api/v1', payment);
app.use('/api/v1', giveaway);
app.use('/api/v1', addProduct);


// error middleware
app.use(errorMiddleware);

module.exports = app;