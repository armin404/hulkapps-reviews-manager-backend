const express = require('express');
const {
	//Controllers import using JS Destructuring
	getUsers,
	getAgents,
	//   getUser,
	createUser,
	updateUser,
	deleteUser,
} = require('../controllers/users');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

// router.use(protect);
// router.use(authorize('admin'));

router
	.route('/')
	//   .get(getUsers)
	.post(createUser);

router
	.route('/:id')
	//   .get(getUser)
	.put(updateUser)
	.delete(deleteUser);

router.route('/get-all-users').get(getUsers);
router.route('/get-all-agents').get(getAgents);

module.exports = router;
