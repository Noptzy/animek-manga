const { generateToken, decodedToken, minimalPayload, refreshToken, verifyToken } = require('../../utils/jwt.js');
const bcrypt = require('bcryptjs');
const resHandler = require('../../utils/resHandler.js');
const userService = require('../../services/userService.js');
const logger = require('../../utils/logger.js');

exports.loginUser = async(req, res) => {
    try {
        const { email, password } = req.body;
        if (email === '' && password === '') {
            return res
                .status(400)
                .json(resHandler
                .error('validation error', { email: 'email is required' })
                .toJSON());
        }

        let user;

        if(Object.hasOwn(req.body, 'email')){
            user = await userService.findUser({ email });
        }

        if (!user) {
            return res
                .status(400)
                .json(resHandler
                .error('invalid credentials', null)
                .toJSON());
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res
                .status(400)
                .json(resHandler
                .error('invalid credentials', null)
                .toJSON());
        }

        const userData = await userService.getUser(user.id);
        const payload = userData?.toJSON ? userData.toJSON() : userData;
        const accessPayload = minimalPayload(payload);
        const aToken = generateToken(accessPayload);
        const decoded = decodedToken(aToken);

        const refreshPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
        }

        const rToken = generateToken(refreshPayload, 'rt');

        const dataToken = {
            aToken,
            rToken,
        }
        
        await storeUserToken('OG', user.id, null, dataToken);

        const data = {
            type: 'Bearer',
            access_token: aToken,
            refresh_token: rToken,
            expires_in: differenceInSeconds(fromUnixTime(decoded.exp), new Date()),
            expired_at: decoded.exp
        }

        return res
            .json(resHandler
            .success('success login', data)
            .toJSON());
    } catch (error) {
        logger.error('Login Error: ', error);
        return res
            .status(500)
            .json(resHandler
            .error('error', null)
            .toJSON());
    }
}

exports.logoutUser = async(req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res
                .status(401)
                .json(resHandler
                .error('Required Token', null)
                .toJSON());
        }

        const decodedToken = verifyToken(token);

        if(!decodedToken){
            return res
                .status(401)
                .json(resHandler
                .error('Invalid Token', null)
                .toJSON());
        }

        

    } catch (error) {
        
    }
}