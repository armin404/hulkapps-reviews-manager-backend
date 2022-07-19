const Review = require('../models/review_sch');
const Apps = require('../models/appList_sch');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandeler = require('../middleware/async');
const cheerio = require('cheerio');
const axios = require('axios');
const delay = require('delay');
const moment = require('moment');
const User = require('../models/user_sch');
const dotenv = require('dotenv');
const { search } = require('../routes/reviews');

// Route http://localhost:5000/ha.api/v1/reviews/retrive-reviews
// POST Req
exports.retrieveReviewsAndUpdateDb = asyncHandeler(async (req, res, next) => {
	// Get all app names
	const apps = await Apps.find();

	// Map app names
	const refined = apps.map((item) => item.appName);
	let pageCountTemp = 2;
	//Run for each APP
	for (let i = 0; i < refined.length; i++) {
		let item = refined[i];

		// Get nuber of avalible pages for each app (ONCE!!!)
		const url2 = `https://apps.shopify.com/${refined[i]}/reviews`;
		const imgUrl = await Apps.find({
			appName: {
				$eq: item,
			},
		}).select('appPhotoUrl displayAppName -_id');
		await axios.get(url2).then((res) => {
			const $ = cheerio.load(res.data);

			const numberOfPages = $('a.search-pagination__link--hide')
				.last()
				.text();

			pageCountTemp = parseInt(numberOfPages);
		});

		//Run for each page of the app
		for (let pageTemp = 1; pageTemp <= pageCountTemp; pageTemp++) {
			try {
				const url = `https://apps.shopify.com/${refined[i]}/reviews?page=${pageTemp}`;
				console.log(url);

				//Scraper Query (Do not change)!!!
				await axios.get(url).then((res) => {
					const $ = cheerio.load(res.data);

					$('.review-listing ').each(function (i, element) {
						const $element = $(element);

						const $reviewScore = $element
							.find('div div div div div div')
							.attr('data-rating');
						const $postId = $element
							.find('div')
							.attr('data-review-id');
						const $reviewDate = $element
							.find('div div div .review-metadata__item-label')
							.text()
							.trim();

						const $reviewStore = $element
							.find(
								'div div .review-listing-header .review-listing-header__text'
							)
							.text()
							.trim();

						const $reviewLocation = $element
							.find(
								'div div .review-merchant-characteristic__item span'
							)
							.text()
							.trim();

						const $reviewComment = $element
							.find(
								'div div .review-content .truncate-content-copy'
							)
							.children()
							.first()
							.text()
							.trim();
						const $isReplied = $element
							.find('.review-reply .review-reply__header')
							.children()
							.first()
							.text();

						const $developerResponse = $element
							.find(
								'.review-reply .review-content .truncate-content-copy'
							)
							.children()
							.text()
							.trim();

						let developerResponse = $developerResponse;
						if (!$developerResponse) {
							developerResponse = 'This Review has No response';
						}

						let isReplied = false;
						if ($isReplied) {
							isReplied = true;
						}
						let reviewDateStamp = new Date($reviewDate);

						//Review Object
						const review = {
							rating: $reviewScore,
							date: $reviewDate,
							postId: $postId,
							storeName: $reviewStore,
							location: $reviewLocation,
							comment: $reviewComment,
							developerReply: developerResponse,
							isReplied: isReplied,
							isSentToSlack: true,
							app: item,
							reviewDateStamp: reviewDateStamp,
						};

						//Check if Review Exists in DB
						Review.exists(
							{ postId: review.postId },
							function (err, result) {
								if (err) {
									res.send(err);
								} else if (result === null) {
									//If no write it
									console.log('Writing New Review');
									console.log(review.postId);

									const data = Review.create(review);
									//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

									let stars = '';

									if (review.rating === '1') {
										stars = ':star:';
									} else if (review.rating === '2') {
										stars = ':star::star:';
									} else if (review.rating === '3') {
										stars = ':star::star::star:';
									} else if (review.rating === '4') {
										stars = ':star::star::star::star:';
									} else {
										stars =
											':star::star::star::star::star:';
									}

									const webhookURL =
										'https://hooks.slack.com/services/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';
									const message = {
										blocks: [
											{
												type: 'divider',
											},
											{
												type: 'section',
												text: {
													type: 'mrkdwn',
													text: `*App*: ${imgUrl[0].displayAppName}\n\n *${review.storeName}*\n *Location*: ${review.location} \n ${stars} ${review.rating} of 5 Star Review\n ${review.comment}`,
												},
												accessory: {
													type: 'image',
													image_url:
														imgUrl[0].appPhotoUrl,
													alt_text:
														'alt text for image',
												},
											},
											{
												type: 'section',
												text: {
													type: 'mrkdwn',
													text: `Date of Review: ${review.date}`,
												},
											},
											{
												type: 'divider',
											},
										],
									};
									axios.post(webhookURL, message);

									//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
								} else {
									//If yes skip
									console.log('Review exists');
								}
							}
						);
					});
				});

				//Delay 1.2 sec (Shopify limits 50 req per min)
				await delay(1200);
			} catch (error) {
				res.status(500).json({
					success: false,
				});
			}
		}

		await delay(1000);
	}

	res.status(200).json({
		success: true,
		msg: 'Reviews Retrived Susscessfuly. All up to Date',
	});
});

// Route http://localhost:5000/ha.api/v1/reviews/retrive-newest-reviews
// POST Req
exports.retrieveNewestReviewsAndUpdateDb = asyncHandeler(
	async (req, res, next) => {
		// Get all app names
		const apps = await Apps.find();

		// Map app names
		const refined = apps.map((item) => item.appName);

		for (let i = 0; i < refined.length; i++) {
			let item = refined[i];

			try {
				//Hitting only page 1 of every app since all newest reviews are on page one
				const url = `https://apps.shopify.com/${item}/reviews`;
				const imgUrl = await Apps.find({
					appName: {
						$eq: item,
					},
				}).select('appPhotoUrl displayAppName -_id');
				console.log(url);

				//Scraper Query (Do not change)!!!
				await axios.get(url).then((res) => {
					const $ = cheerio.load(res.data);

					pageCountTemp = $('a.search-pagination__link--hide')
						.last()
						.text();

					$('.review-listing ').each(function (i, element) {
						const $element = $(element);
						const $postId = $element
							.find('div')
							.attr('data-review-id');
						// console.log(element);
						const $reviewScore = $element
							.find('div div div div div div')
							.attr('data-rating');

						const $reviewDate = $element
							.find('div div div .review-metadata__item-label')
							.text()
							.trim();

						const $reviewStore = $element
							.find(
								'div div .review-listing-header .review-listing-header__text'
							)
							.text()
							.trim();

						const $reviewLocation = $element
							.find(
								'div div .review-merchant-characteristic__item span'
							)
							.text()
							.trim();

						const $reviewComment = $element
							.find(
								'div div .review-content .truncate-content-copy'
							)
							.children()
							.first()
							.text()
							.trim();
						const $isReplied = $element
							.find('.review-reply .review-reply__header')
							.children()
							.first()
							.text();

						const $developerResponse = $element
							.find(
								'.review-reply .review-content .truncate-content-copy'
							)
							.children()
							.text()
							.trim();

						let developerResponse = $developerResponse;
						if (!$developerResponse) {
							developerResponse = 'This Review has No response';
						}
						let isReplied = false;
						if ($isReplied) {
							isReplied = true;
						}

						let reviewDateStamp = new Date($reviewDate);

						//Review Object
						const review = {
							rating: $reviewScore,
							date: $reviewDate,
							postId: $postId,
							storeName: $reviewStore,
							location: $reviewLocation,
							comment: $reviewComment,
							developerReply: developerResponse,

							isReplied: isReplied,
							isSentToSlack: true,
							app: item,
							reviewDateStamp: reviewDateStamp,
						};

						// Check if Review Exists in DB
						Review.exists(
							{ postId: review.postId },
							function (err, result) {
								if (err) {
									res.send(err);
								} else if (result === null) {
									//If no write it
									console.log(review.postId);
									console.log('Writing New Review');
									const data = Review.create(review);
									//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

									let stars = '';

									if (review.rating === '1') {
										stars = ':star:';
									} else if (review.rating === '2') {
										stars = ':star::star:';
									} else if (review.rating === '3') {
										stars = ':star::star::star:';
									} else if (review.rating === '4') {
										stars = ':star::star::star::star:';
									} else {
										stars =
											':star::star::star::star::star:';
									}

									const webhookURL =
										'https://hooks.slack.com/services/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';
									const message = {
										blocks: [
											{
												type: 'divider',
											},
											{
												type: 'section',
												text: {
													type: 'mrkdwn',
													text: `*App*: ${imgUrl[0].displayAppName}\n\n *${review.storeName}*\n *Location*: ${review.location} \n ${stars} ${review.rating} of 5 Star Review\n ${review.comment}`,
												},
												accessory: {
													type: 'image',
													image_url:
														imgUrl[0].appPhotoUrl,
													alt_text:
														'alt text for image',
												},
											},
											{
												type: 'section',
												text: {
													type: 'mrkdwn',
													text: `Date of Review: ${review.date}`,
												},
											},
											{
												type: 'divider',
											},
										],
									};
									axios.post(webhookURL, message);

									//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
								} else {
									//If yes skip
									console.log('Review exists');
								}
							}
						);
					});
				});

				//Delay 1.2 sec (Shopify limits 50 req per min)
				await delay(1200);
			} catch (error) {
				console.log(error);
			}
		}

		res.status(200).json({
			success: true,
			msg: 'Reviews Retrived Susscessfuly. All up to Date',
		});
	}
);

exports.getAllApps = asyncHandeler(async (req, res, next) => {
	const apps = await Apps.find({});

	res.status(200).json({
		success: true,
		data: apps,
	});
});

exports.deleteApp = asyncHandeler(async (req, res, next) => {
	await Apps.findByIdAndDelete(req.params.id);

	res.status(200).json({
		success: true,
		data: {},
	});
});

exports.getNumberOfReviewsByStarRating = asyncHandeler(
	async (req, res, next) => {
		const reviewsOneStar = await Review.find({ rating: { $eq: 1 } });
		const reviewsTwoStar = await Review.find({ rating: { $eq: 2 } });
		const reviewsThreeStar = await Review.find({ rating: { $eq: 3 } });
		const reviewsFourStar = await Review.find({ rating: { $eq: 4 } });
		const reviewsFiveStar = await Review.find({ rating: { $eq: 5 } });

		const reviews = {
			oneStart: reviewsOneStar.length,
			twoStar: reviewsTwoStar.length,
			threeStar: reviewsThreeStar.length,
			fourStar: reviewsFourStar.length,
			fiveStar: reviewsFiveStar.length,
		};
		res.status(200).json({
			success: true,
			reviews: reviews,
		});
	}
);

exports.testRouteForScraper = asyncHandeler(async (req, res, next) => {
	const apps = await Apps.find();
	// const refined = apps.map((item) => item.appName);
	const url = `https://apps.shopify.com/restock-master-email-sms/reviews?page=2`;

	//Scraper Query (Do not change)!!!
	await axios.get(url).then((res) => {
		const $ = cheerio.load(res.data);

		pageCountTemp = $('a.search-pagination__link--hide').last().text();

		$('.review-listing ').each(function (i, element) {
			const $element = $(element);
			// console.log(element);
			const $reviewScore = $element
				.find('div div div div div div')
				.attr('data-rating');

			const $reviewDate = $element
				.find('div div div .review-metadata__item-label')
				.text()
				.trim();

			const $reviewStore = $element
				.find(
					'div div .review-listing-header .review-listing-header__text'
				)
				.text()
				.trim();

			const $reviewLocation = $element
				.find('div div .review-merchant-characteristic__item span')
				.text()
				.trim();

			const $reviewComment = $element
				.find('div div .review-content .truncate-content-copy')
				.children()
				.first()
				.text()
				.trim();
			const $isReplied = $element
				.find('.review-reply .review-reply__header')
				.children()
				.first()
				.text();

			let isReplied = false;
			if ($isReplied) {
				isReplied = true;
			}
			let reviewDateStamp = new Date($reviewDate);

			//Review Object
			const review = {
				rating: $reviewScore,
				date: $reviewDate,
				storeName: $reviewStore,
				location: $reviewLocation,
				comment: $reviewComment,
				isReplied: isReplied,
				app: 'volume-discount-by-hulkapps',
				reviewDateStamp: reviewDateStamp,
			};
			// const data = Review.create(review);
			// console.log('Writing New Review');
			//Check if Review Exists in DB
			Review.exists(
				{ storeName: review.storeName },
				function (err, result) {
					if (err) {
						res.send(err);
					} else if (result === null) {
						//If no write it
						console.log('Writing New Review');
						const data = Review.create(review);
					} else {
						//If yes skip
						console.log('Review exists');
					}
				}
			);
		});
	});
	res.status(201).json({
		success: true,
		// data: date,
	});
});

exports.getAllReviews = asyncHandeler(async (req, res, next) => {
	const filterQuery = req.body.filter;
	const filterQueryType = req.body.type;

	if (!filterQueryType) {
		const reviews = await Review.find({});
		res.status(201).json({
			success: true,
			data: reviews,
		});
	} else if (filterQueryType === 'rating') {
		const reviews = await Review.find({ rating: { $eq: filterQuery } });
		res.status(201).json({
			success: true,
			data: reviews,
		});
	} else if (filterQueryType === 'app') {
		const reviews = await Review.find({
			app: { $eq: filterQuery },
		});
		res.status(201).json({
			success: true,
			data: reviews,
		});
	}
});

// exports.getNuberOfReviews = asyncHandeler(async (req, res, next) => {
// 	const reviews = await Review.find({});

// 	const numberOfReviews = reviews.length;

// 	res.status(201).json({
// 		success: true,
// 		data: numberOfReviews,
// 	});
// });

// exports.getThisWeek = asyncHandeler(async (req, res, next) => {
// 	const todayDate = new Date();

// 	res.status(200).json({
// 		success: true,
// 		data: reviews,
// 	});
// });

exports.numberOfReviewsPerApp = asyncHandeler(async (req, res, next) => {
	let data = [];

	// Get all app names
	const apps = await Apps.find();

	// Map app names
	const refined = apps.map((item) => item.appName);

	const todayDate = new Date();

	//This Month
	const firstDayOfThisMonth = moment(todayDate).startOf('month');

	// Last Month
	const startDayOfPrevWeek = moment(todayDate)
		.subtract(1, 'month')
		.startOf('month');
	const lastDayOfPrevWeek = moment(todayDate)
		.subtract(1, 'month')
		.endOf('month');

	for (let i = 0; i < refined.length; i++) {
		/////////////////////////////////////////////////////////////////////////
		let item = refined[i];

		const lastMonthReviews = await Review.count({
			reviewDateStamp: {
				$gte: startDayOfPrevWeek,
				$lt: lastDayOfPrevWeek,
			},
			app: {
				$eq: item,
			},
		});

		const thisMonthReviews = await Review.count({
			reviewDateStamp: {
				$gte: firstDayOfThisMonth,
			},
			app: {
				$eq: item,
			},
		});

		///////////////////////////////////////////////////////////

		const reviews = await Review.count({
			app: {
				$eq: item,
			},
		});

		const res = {
			appName: item,
			numberOfReviews: reviews,
			thisMonth: thisMonthReviews,
			lastMonth: lastMonthReviews,
		};

		data.push(res);
	}

	res.status(201).json({
		success: true,
		data: data,
	});
});

exports.getDashboardData = asyncHandeler(async (req, res, next) => {
	const todayDate = new Date();
	const today = moment(todayDate).startOf('day');

	const todayRev = await Review.count({
		reviewDateStamp: {
			$gte: today,
		},
	});
	const reviewsCount = await Review.count({});

	// Last Month
	const startDayOfPrevWeek = moment(todayDate)
		.subtract(1, 'month')
		.startOf('month');
	const lastDayOfPrevWeek = moment(todayDate)
		.subtract(1, 'month')
		.endOf('month');

	//This Month
	const firstDayOfThisMonth = moment(todayDate).startOf('month');

	const lastMonthReviews = await Review.count({
		reviewDateStamp: {
			$gte: startDayOfPrevWeek,
			$lt: lastDayOfPrevWeek,
		},
	});

	const thisMonthReviews = await Review.count({
		reviewDateStamp: {
			$gte: firstDayOfThisMonth,
		},
	});
	const thisWeek = moment(todayDate).startOf('week');

	const reviewsThisWeek = await Review.count({
		reviewDateStamp: {
			$gte: thisWeek,
		},
	});

	res.status(201).json({
		success: true,
		data: [
			todayRev,
			reviewsThisWeek,
			thisMonthReviews,
			lastMonthReviews,
			reviewsCount,
		],
	});
});

// exports.getThisMonthLastMonth = asyncHandeler(async (req, res, next) => {
// 	const todayDate = new Date();

// 	res.status(201).json({
// 		success: true,
// 		data: {
// 			lastMonthReviews: lastMonthReviews,
// 			thisMonthReviews: thisMonthReviews,
// 		},
// 	});
// });

exports.assignAgentToReview = asyncHandeler(async (req, res, next) => {
	const filter = { postId: req.params.id };
	const update = { assignedAgent: req.body.assignAgentData };

	console.log(filter);
	console.log(update);

	const updateReview = await Review.findOneAndUpdate(filter, update);
	const updatedReview = await Review.find({ postId: { $eq: req.params.id } });

	console.log(updatedReview);
	res.status(201).json({
		success: true,
		thisReview: updatedReview,
	});
});

exports.getReviewsFilteredByAgents = asyncHandeler(async (req, res, next) => {
	const agents = await User.find({
		isAgent: {
			$eq: true,
		},
	});
	let reviewsPerAgent = [];
	const refined = agents.map((item) => item.email);
	console.log(refined);

	for (let i = 0; i < refined.length; i++) {
		let item = refined[i];
		console.log(item);
		const searchReviews = await Review.count({
			'assignedAgent.agentEmail': {
				$eq: item,
			},
		});

		const oneAgent = {
			agentEmail: item,
			numberOfReviews: searchReviews,
		};

		reviewsPerAgent.push(oneAgent);
	}
	// const selectedAgent = req.body.selectedAgent;
	// const filter = { assignedAgent: { $eq: selectedAgent } };

	// const reviewsByAgent = await Review.find(filter);

	res.status(201).json({
		success: true,
		reviews: reviewsPerAgent,
	});
});

exports.slackChanelWebhook = asyncHandeler(async (req, res, next) => {
	// const filter = { postId: req.params.id };
	// const update = { isSentToSlack: req.body.isSentToSlack };
	// const updateReview = await Review.findOneAndUpdate(filter, update);

	const {
		storeName,
		storeLocation,
		numberOfStars,
		comment,
		dateOfReview,
		appName,
		postId,
	} = req.body;

	console.log(
		storeName,
		storeLocation,
		numberOfStars,
		comment,
		dateOfReview,
		appName,
		postId
	);

	const isSentToSlackCheck = await Review.count({
		postId: { $eq: postId },
		isSentToSlack: { $eq: true },
	});
	console.log(isSentToSlackCheck);
	if (isSentToSlackCheck > 0) {
		console.log('Is senttttt');

		return;
	}

	const imgUrl = await Apps.find({
		appName: {
			$eq: appName,
		},
	}).select('appPhotoUrl -_id');
	let stars = '';

	if (numberOfStars === 1) {
		stars = ':star:';
	} else if (numberOfStars === 2) {
		stars = ':star::star:';
	} else if (numberOfStars === 3) {
		stars = ':star::star::star:';
	} else if (numberOfStars === 4) {
		stars = ':star::star::star::star:';
	} else {
		stars = ':star::star::star::star::star:';
	}
	console.log(stars);

	console.log(stars);

	const reviewData = {
		storeName: storeName,
		storeLocation: storeLocation,
		numberOfStars: stars,
		comment: comment,
		imageURL: imgUrl[0].appPhotoUrl,
		dateOfReview: dateOfReview,
	};
	console.log(reviewData);
	const webhookURL =
		'https://hooks.slack.com/services/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';
	const message = {
		blocks: [
			{
				type: 'divider',
			},
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `*${reviewData.storeName}*\n *Location*: ${reviewData.storeLocation} \n ${reviewData.numberOfStars} 4 of 5 Star Review\n ${reviewData.comment}`,
				},
				accessory: {
					type: 'image',
					image_url: reviewData.imageURL,
					alt_text: 'alt text for image',
				},
			},
			{
				type: 'divider',
			},
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `Date of Review: ${reviewData.dateOfReview}`,
				},
			},
		],
	};
	axios
		.post(webhookURL, message)
		.then(async () => {
			res.send('Sent To Slack');

			// const filter = { postId: postId };
			// const update = { isSentToSlack: true };

			// const updateReview = await Review.findOneAndUpdate(filter, update);
		})
		.catch(() => {
			res.send('Form submission failed!');
		});
});

exports.getLast12Months = asyncHandeler(async (req, res, next) => {
	const todayDate = new Date();

	// Last Month
	const firstStart = moment(todayDate).subtract(1, 'month').startOf('month');
	const firstEnd = moment(todayDate).subtract(1, 'month').endOf('month');

	// 2 Month
	const secondStart = moment(todayDate).subtract(2, 'month').startOf('month');
	const secondEnd = moment(todayDate).subtract(2, 'month').endOf('month');

	// Last Month
	const thirdStart = moment(todayDate).subtract(3, 'month').startOf('month');
	const thirdEnd = moment(todayDate).subtract(3, 'month').endOf('month');

	// Last Month
	const fourtStart = moment(todayDate).subtract(4, 'month').startOf('month');
	const fourtEnd = moment(todayDate).subtract(4, 'month').endOf('month');

	// Last Month
	const fifthStart = moment(todayDate).subtract(5, 'month').startOf('month');
	const fifthEnd = moment(todayDate).subtract(5, 'month').endOf('month');
	// Last Month
	const sixthStart = moment(todayDate).subtract(6, 'month').startOf('month');
	const sixtEnd = moment(todayDate).subtract(6, 'month').endOf('month');
	// Last Month
	const seventhStart = moment(todayDate)
		.subtract(7, 'month')
		.startOf('month');
	const seventhEnd = moment(todayDate).subtract(7, 'month').endOf('month');
	// Last Month
	const eightStart = moment(todayDate).subtract(8, 'month').startOf('month');
	const eightEnd = moment(todayDate).subtract(8, 'month').endOf('month');
	// Last Month
	const ninethStart = moment(todayDate).subtract(9, 'month').startOf('month');
	const ninethEnd = moment(todayDate).subtract(9, 'month').endOf('month');
	// Last Month
	const tenStart = moment(todayDate).subtract(10, 'month').startOf('month');
	const tenEnd = moment(todayDate).subtract(10, 'month').endOf('month');
	// Last Month
	const elevenStart = moment(todayDate)
		.subtract(11, 'month')
		.startOf('month');
	const elevenEnd = moment(todayDate).subtract(11, 'month').endOf('month');
	//This Month
	const firstDayOfThisMonth = moment(todayDate).startOf('month');

	const fir = await Review.count({
		reviewDateStamp: {
			$gte: firstStart,
			$lt: firstEnd,
		},
	});
	const sec = await Review.count({
		reviewDateStamp: {
			$gte: secondStart,
			$lt: secondEnd,
		},
	});
	const thi = await Review.count({
		reviewDateStamp: {
			$gte: thirdStart,
			$lt: thirdEnd,
		},
	});
	const four = await Review.count({
		reviewDateStamp: {
			$gte: fourtStart,
			$lt: fourtEnd,
		},
	});
	const fif = await Review.count({
		reviewDateStamp: {
			$gte: fifthStart,
			$lt: fifthEnd,
		},
	});
	const six = await Review.count({
		reviewDateStamp: {
			$gte: sixthStart,
			$lt: sixtEnd,
		},
	});
	const sev = await Review.count({
		reviewDateStamp: {
			$gte: seventhStart,
			$lt: seventhEnd,
		},
	});
	const eig = await Review.count({
		reviewDateStamp: {
			$gte: eightStart,
			$lt: eightEnd,
		},
	});
	const nin = await Review.count({
		reviewDateStamp: {
			$gte: ninethStart,
			$lt: ninethEnd,
		},
	});
	const ten = await Review.count({
		reviewDateStamp: {
			$gte: tenStart,
			$lt: tenEnd,
		},
	});
	const ele = await Review.count({
		reviewDateStamp: {
			$gte: elevenStart,
			$lt: elevenEnd,
		},
	});

	const current = await Review.count({
		reviewDateStamp: {
			$gte: firstDayOfThisMonth,
		},
	});

	res.status(201).json({
		success: true,
		res: [ele, ten, nin, eig, sev, six, fif, four, thi, sec, fir, current],
	});
});

exports.addAppName = asyncHandeler(async (req, res, next) => {
	try {
		const data = req.body;

		const url = `https://apps.shopify.com/${data.appName}`;
		let photoURL = '';

		//Scraper Query (Do not change)!!!
		await axios.get(url).then((res) => {
			const $ = cheerio.load(res.data);
			photoURL = $('.vc-app-listing-about-section__icon').attr('src');
		});

		const appObj = {
			appName: data.appName,
			displayAppName: data.displayAppName,
			appPhotoUrl: photoURL,
		};

		//Check if Review Exists in DB
		Apps.exists({ appName: data.appName }, function (err, result) {
			if (err) {
				res.send(err);
			} else if (result === null) {
				//If no write it
				console.log('Adding New App');
				const newApp = Apps.create(appObj);

				res.status(200).json({
					success: true,
					data: appObj,
				});
			} else {
				//If yes skip
				res.status(500).json({
					success: false,
					msg: 'App Exists',
				});
				console.log('App Exists');
			}
		});
	} catch (error) {
		console.log(error);
	}
});
