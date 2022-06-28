const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const writeStream = fs.createWriteStream('post.csv');
const axios = require('axios');

axios
	.get('https://apps.shopify.com/form-builder-by-hulkapps/reviews')
	.then((res) => {
		const reviews = [];
		const $ = cheerio.load(res.data);

		$('.review-listing ').each(function (i, element) {
			const $element = $(element);

			const $reviewScore = $element
				.find('div div div div div div')
				.attr('data-rating');
			const $reviewDate = $element
				.find('div div div .review-metadata__item-label')
				.text();

			const $reviewStore = $element
				.find('div div .review-listing-header')
				.text();

			const $reviewLocation = $element
				.find('div div .review-merchant-characteristic__item')
				.text();
			const $reviewComment = $element
				.find('div div .review-content')
				.text();
			console.log($reviewComment);
			const review = {
				reviewScore: $reviewScore,
			};
		});
	});
