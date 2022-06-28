const mongoose = require('mongoose');

//User Schema
const AppList = new mongoose.Schema({
	appName: {
		type: String,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	displayAppName: {
		type: String,
		required: true,
	},
	appPhotoUrl: {
		type: String,
		required: false,
	},
});

module.exports = mongoose.model('Apps', AppList);
