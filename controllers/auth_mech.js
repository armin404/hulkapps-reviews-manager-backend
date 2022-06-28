const User = require('../models/user_sch');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

//Description     Register User
//Route           GET /hi.api/v1/auth/register
//Access          Public

exports.register = asyncHandler(async (req, res, next) => {
	const { name, email, password, role } = req.body;

	const user = await User.create({
		name,
		email,
		password,
		role,
	});

	sendTokenResponse(user, 200, res);
});

//Description     Login User
//Route           POST /hi.api/v1/auth/login
//Access          Public

exports.login = asyncHandler(async (req, res, next) => {
	const { email, password } = req.body;

	//Validate Email and password
	if (!email || !password) {
		return next(
			new ErrorResponse('Please provide an email and password', 400)
		);
	}

	//Check for user
	const user = await User.findOne({ email }).select('+password');

	if (!user) {
		return next(new ErrorResponse('Invalid Credentails', 401)); //Fix Error handler
	}

	//Check Password
	const isMatched = await user.matchPassword(password);

	if (!isMatched) {
		return next(new ErrorResponse('Invalid Credentails', 401));
	}

	sendTokenResponse(user, 200, res);
});

//Description     Current Logged in user
//Route           POST /hi.api/v1/auth/me
//Access          Private

exports.getMe = asyncHandler(async (req, res, next) => {
	// user is already available in req due to the protect middleware
	const user = req.user;

	res.status(200).json({
		success: true,
		data: user,
	});
});

//Description      Log user out / clear cookie
//Route            GET /api/v1/auth/logout
//Access           Public
exports.logout = asyncHandler(async (req, res, next) => {
	res.cookie('token', 'none', {
		expires: new Date(Date.now() + 10 * 1000),
		httpOnly: true,
	});

	res.status(200).json({
		success: true,
		data: {},
	});
});

//Description    Forgot password
//Route           POST /hi.api/v1/auth/forgotpassword
//Access          Public

exports.forgotPassword = asyncHandler(async (req, res, next) => {
	// user is already available in req due to the protect middleware
	const user = await User.findOne({ email: req.body.email });

	if (!user) {
		return next(new ErrorResponse('There is no user with that email', 404));
	}

	//Reset Token
	const resetToken = user.getResetPasswordToken();

	await user.save({ validateBeforeSave: false });

	// Create reset url
	const resetUrl = `${req.protocol}://${req.get(
		'host'
	)}/ha.api/v1/auth/resetpassword/${resetToken}`;

	const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

	try {
		await sendEmail({
			email: user.email,
			subject: 'Password reset token',
			message,
		});

		res.status(200).json({ success: true, data: 'Email sent' });
	} catch (err) {
		console.log(err);
		user.resetPasswordToken = undefined;
		user.resetPasswordExpire = undefined;

		await user.save({ validateBeforeSave: false });

		return next(new ErrorResponse('Email could not be sent', 500));
	}
});

// @desc      Reset password
// @route     PUT /api/v1/auth/resetpassword/:resettoken
// @access    Public

exports.resetPassword = asyncHandler(async (req, res, next) => {
	// Get hashed token
	const resetPasswordToken = crypto
		.createHash('sha256')
		.update(req.params.resettoken)
		.digest('hex');

	const user = await User.findOne({
		resetPasswordToken,
		resetPasswordExpire: { $gt: Date.now() },
	});

	if (!user) {
		return next(new ErrorResponse('Invalid token', 400));
	}

	// Set new password
	user.password = req.body.password;
	user.resetPasswordToken = undefined;
	user.resetPasswordExpire = undefined;
	await user.save();

	sendTokenResponse(user, 200, res);
});

/**
 * @desc    Confirm Email
 * @route   GET /api/v1/auth/confirmemail
 * @access  Public
 */
exports.confirmEmail = asyncHandler(async (req, res, next) => {
	// grab token from email
	const { token } = req.query;

	if (!token) {
		return next(new ErrorResponse('Invalid Token', 400));
	}

	const splitToken = token.split('.')[0];
	const confirmEmailToken = crypto
		.createHash('sha256')
		.update(splitToken)
		.digest('hex');

	// get user by token
	const user = await User.findOne({
		confirmEmailToken,
		isEmailConfirmed: false,
	});

	if (!user) {
		return next(new ErrorResponse('Invalid Token', 400));
	}

	// update confirmed to true
	user.confirmEmailToken = undefined;
	user.isEmailConfirmed = true;

	// save
	user.save({ validateBeforeSave: false });

	// return token
	sendTokenResponse(user, 200, res);
});

//Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
	const token = user.getSignedJwtToken();
	res.status(statusCode).json({ succes: true, user: user.name, token });
};
