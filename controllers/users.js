const asyncHandler = require('../middleware/async');
const User = require('../models/user_sch');

//Desc     Get all users
//Route    GET /api/v1/users
//Access    Private/Admin

exports.getUsers = asyncHandler(async (req, res, next) => {
	const users = await User.find({}).select('-password');
	res.status(200).json({
		success: true,
		data: users,
	});
});

//Desc      Get single user
//Route     GET /api/v1/users/:id
//Access    Private/Admin

exports.getUser = asyncHandler(async (req, res, next) => {
	const user = await User.findById(req.params.id);

	res.status(200).json({
		success: true,
		data: user,
	});
});

//Desc      Create user
//Route     POST /api/v1/users
//Access    Private/Admin

exports.createUser = asyncHandler(async (req, res, next) => {
	const user = await User.create(req.body);

	res.status(201).json({
		success: true,
		data: user,
	});
});

//Desc      Update user
//Route     PUT /api/v1/users/:id
//Access    Private/Admin

exports.updateUser = asyncHandler(async (req, res, next) => {
	const user = await User.findByIdAndUpdate(req.params.id, req.body, {
		new: true,
		runValidators: true,
	});

	res.status(200).json({
		success: true,
		data: user,
	});
});

//Desc      Delete user
//Route     DELETE /api/v1/users/:id
//Access    Private/Admin

exports.deleteUser = asyncHandler(async (req, res, next) => {
	await User.findByIdAndDelete(req.params.id);

	res.status(200).json({
		success: true,
		data: {},
	});
});
