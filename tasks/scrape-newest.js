#!/usr/bin/env node

const axios = require('axios');

// HEROKU ADVANCED SCHEDULER ADD-ON => TASK

const URL = 'http://localhost:5000'(async function syncNewestData() {
	try {
		axios
			.post(URL + '/ha.api/v1/reviews/retrive-newest-reviews')
			.then(function (response) {
				console.log(response);
			});
		process.exit();
	} catch (err) {
		process.exit(1);
	}
})();
