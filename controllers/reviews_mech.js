const Review = require('../models/review_sch');
const Apps = require('../models/appList_sch');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandeler = require('../middleware/async');
const cheerio = require('cheerio');
const axios = require('axios');
const delay = require('delay');

exports.retrieveReviewsAndUpdateDb = asyncHandeler(async (req, res, next) => {
	// Get all app names
	const apps = await Apps.find();

	// Map app names
	const refined = apps.map((item) => item.appName);
	let pageCountTemp = 2;

	for (let i = 0; i < refined.length; i++) {
		let item = refined[i];

		for (let pageTemp = 1; pageTemp <= pageCountTemp; pageTemp++) {
			try {
				console.log(pageCountTemp);
				const url = `https://apps.shopify.com/form-builder-by-hulkapps/reviews?page=${pageTemp}`;
				console.log(url);

				//Scraper Query (Do not change)!!!
				await axios.get(url).then((res) => {
					const $ = cheerio.load(res.data);

					pageCountTemp = $('a.search-pagination__link--hide')
						.last()
						.text();

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

						let isReplied = false;
						if ($isReplied) {
							isReplied = true;
						}
						console.log(isReplied);
						//Review Object
						const review = {
							rating: $reviewScore,
							date: $reviewDate,
							storeName: $reviewStore,
							location: $reviewLocation,
							comment: $reviewComment,
							isReplied: isReplied,
							app: item,
						};

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

				//Delay 1.2 sec (Shopify limits 50 req per min)
				await delay(1200);
			} catch (error) {
				console.log(error);
			}
		}

		await delay(1000);
	}

	res.status(201).json({
		success: true,
	});
});

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
				console.log(url);

				//Scraper Query (Do not change)!!!
				await axios.get(url).then((res) => {
					const $ = cheerio.load(res.data);

					pageCountTemp = $('a.search-pagination__link--hide')
						.last()
						.text();

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

						//Review Object
						const review = {
							rating: $reviewScore,
							date: $reviewDate,
							storeName: $reviewStore,
							location: $reviewLocation,
							comment: $reviewComment,
							app: item,
						};

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

				//Delay 1.2 sec (Shopify limits 50 req per min)
				await delay(1200);
			} catch (error) {
				console.log(error);
			}
		}

		res.status(200).json({
			success: true,
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

exports.testRouteForScraper = asyncHandeler(async (req, res, next) => {
	const apps = await Apps.find();
	const refined = apps.map((item) => item.appName);
	const url = `https://apps.shopify.com/${refined}/reviews`;

	let ress = '';
	await axios.get(url).then((res) => {
		const $ = cheerio.load(res.data);
		reply = $('.new-app-listing-review-reply__header-item').text();
	});
	res.status(201).json({
		success: true,
		data: ress,
	});
});

exports.getAllReviews = asyncHandeler(async (req, res, next) => {
	const filterQuery = req.body.app;

	if (!filterQuery) {
		const reviews = await Review.find({});
		res.status(201).json({
			success: true,
			data: reviews,
		});
	} else {
		const reviews = await Review.find({ app: { $eq: filterQuery } });
		res.status(201).json({
			success: true,
			data: reviews,
		});
	}
});

exports.getNuberOfReviews = asyncHandeler(async (req, res, next) => {
	const reviews = await Review.find({});

	const numberOfReviews = reviews.length;

	res.status(201).json({
		success: true,
		data: numberOfReviews,
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
				const data = Apps.create(appObj);
			} else {
				//If yes skip
				console.log('App Exists');
			}
		});
	} catch (error) {
		console.log(error);
	}
	res.status(201).json({
		success: true,
	});
});
