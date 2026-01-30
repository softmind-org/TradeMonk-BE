import userService from '../services/user.service.js';

const userController = {
    // Create a new user
    createUser: async (req, res, next) => {
        try {
            const user = await userService.createUser(req.body);
            res.status(201).json({
                success: true,
                data: user,
            });
        } catch (error) {
            if (error.code === 11000) {
                res.status(400);
                return next(new Error('Email already exists'));
            }
            next(error);
        }
    },

    // Get all users
    getUsers: async (req, res, next) => {
        try {
            const users = await userService.getUsers();
            res.status(200).json({
                success: true,
                count: users.length,
                data: users,
            });
        } catch (error) {
            next(error);
        }
    },
};

export default userController;
