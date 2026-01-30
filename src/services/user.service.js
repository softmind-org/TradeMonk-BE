import User from '../models/user.model.js';

// Service for handling business logic
const userService = {
    // Create a new user
    createUser: async (userData) => {
        const user = await User.create(userData);
        return user;
    },

    // Get all users
    getUsers: async () => {
        const users = await User.find();
        return users;
    },

    // Get user by ID
    getUserById: async (id) => {
        const user = await User.findById(id);
        return user;
    },
};

export default userService;
