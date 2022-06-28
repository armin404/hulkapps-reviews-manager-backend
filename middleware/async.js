//this is for DRY (Dont Repeat Yourself) Instead of creating a ton of try catch blocks
const asyncHandeler = (fn) => (req, res, next) =>
	Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandeler;
