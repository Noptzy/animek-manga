const responseHandler = require('../utils/resHandler.js');

const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorDetails = {};
            error.details.forEach((detail) => {
                const field = detail.path.join('.');
                errorDetails[field] = detail.message;
            });
            return res
                .status(400)
                .json(responseHandler
                .error('Validation Error', errorDetails)
                .toJSON());
        }
        next();
    };
};

module.exports = validate;