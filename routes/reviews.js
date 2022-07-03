const express = require('express');
const { protect, authorize } = require('../middleware/auth'); //Works the same for other routes that we want to protect

//Inporting controller files
const {
	retrieveReviewsAndUpdateDb,
	retrieveNewestReviewsAndUpdateDb,
	addAppName,
	getAllApps,
	getAllReviews,
	getNuberOfReviews,
	testRouteForScraper,
	getNumberOfReviewsByStarRating,
	deleteApp,
	getThisMonthLastMonth,
	getLast12Months,
} = require('../controllers/reviews_mech');

//Router setup
const router = express.Router();

//Routes
router.route('/retrive-reviews').post(retrieveReviewsAndUpdateDb); //This route is only one protected for testing
router.route('/retrive-newest-reviews').post(retrieveNewestReviewsAndUpdateDb);
router.route('/get-number-of-reviews').get(getNuberOfReviews);
router.route('/add-app-name').post(addAppName);
router.route('/get-all-apps').get(getAllApps);
router.route('/get-all-reviews').get(getAllReviews);
router.route('/test').get(testRouteForScraper);
router.route('/reviews-by-star-rating').get(getNumberOfReviewsByStarRating);
router.route('/delete-app').delete(deleteApp);
router.route('/this-month-last-month').get(getThisMonthLastMonth);
router.route('/get-last-12').get(getLast12Months);

module.exports = router;
