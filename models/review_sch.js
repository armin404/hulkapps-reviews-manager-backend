const mongoose = require('mongoose');

//User Schema
const ReviewSchema = new mongoose.Schema({
	rating: {
		type: Number,
		required: true,
	},
	date: {
		type: String,
		required: true,
		unique: false,
	},
	storeName: {
		type: String,
		required: true,
		unique: false,
	},
	location: {
		type: String,
		required: false,
	},
	comment: {
		type: String,
		required: false,
	},
	reviewDateStamp: {
		type: Date,
	},
	isReplied: {
		type: Boolean,
	},
	app: {
		type: String,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model('Review', ReviewSchema);
