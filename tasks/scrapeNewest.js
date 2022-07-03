#!/usr/bin/env node
const {
	retrieveNewestReviewsAndUpdateDb,
} = require('../controllers/reviews_mech');
// HEROKU ADVANCED SCHEDULER ADD-ON => TASK

(async function sendOutOfStockEmailOnCurrentROTMS() {
	try {
		const scrape = retrieveNewestReviewsAndUpdateDb();

		process.exit();
	} catch (err) {
		process.exit(1);
	}
})();
