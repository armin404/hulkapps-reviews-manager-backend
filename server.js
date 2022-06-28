const express = require('express');
const colors = require('colors');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Files
const auth = require('./routes/auth'); //Route Files
const review = require('./routes/reviews'); //Route Files

const connectDB = require('./config/dataBase'); //DB Files

//App
const app = express();

//Body parser
app.use(express.json());

app.use(cors());

//DBconnection
connectDB();

//Sanitize data
app.use(mongoSanitize());

//Set security headers
app.use(helmet());

//XSS Protection
app.use(xss());

//Rate limiting
const limiter = rateLimit({
	windowsMs: 10 * 60 * 1000, //10 Minutes
	max: 10000,
});

app.use(limiter);

//Prevent HPP
app.use(hpp());

//Ruters
app.use('/ha.api/v1/reviews', review);
// app.use("/ha.api/v1/comments", comments);
app.use('/ha.api/v1/auth', auth);

// var port = process.env.PORT || 3000;
app.listen(process.env.PORT || 5000, function () {
	console.log('Listening on Port 3000');
});

//Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
	console.log(colors.red.underline(`Error: ${err.message}`));
	//When DB fails to connect server crashes
	server.close(() => process.exit(1));
});
