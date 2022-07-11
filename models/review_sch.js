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
	postId: {
		type: Number,
		required: true,
		unique: true,
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
		unique: false,
	},
	assignedAgent: {
		agentName: {
			type: String,
			required: false,
		},
		agentEmail: {
			type: String,
			required: false,
		},
		agentId: {
			type: Number,
			required: false,
		},
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model('Review', ReviewSchema);
