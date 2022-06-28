const mongoose = require('mongoose');
const colors = require('colors');

//DB Connection setup
const connectToDataBase = async () => {
	const connection = await mongoose.connect(
		'mongodb+srv://armin404:123123gg@maincluster.2ikel.mongodb.net/HulkAppsProject?retryWrites=true&w=majority'
	);
	console.log(
		colors.bgMagenta(`MongoDB Connected: ${connection.connection.host}`)
	);
	console.log(colors.bold('-Connection successful-'));
};

module.exports = connectToDataBase;
