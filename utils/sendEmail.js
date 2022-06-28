const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
	const transporter = nodemailer.createTransport({
		//My Mailtrap.io credentials
		host: 'smtp.mailtrap.io',
		port: '25 or 465 or 587 or 2525',
		auth: {
			user: 'c6e2cfc645a10d',
			pass: 'fb84f822893421',
		},
	});

	const message = {
		from: `top`,
		to: options.email,
		subject: options.subject,
		text: options.message,
	};

	const info = await transporter.sendMail(message);

	console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
