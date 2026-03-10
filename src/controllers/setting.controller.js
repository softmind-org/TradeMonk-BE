import Setting from '../models/setting.model.js';

const settingController = {
    // @desc    Get all global settings (or specific one if queried)
    // @route   GET /api/v1/settings
    // @access  Public
    getSettings: async (req, res, next) => {
        try {
            const settings = await Setting.find({});
            const settingsMap = {};

            // Convert array to key-value map for easier frontend consumption
            settings.forEach(s => {
                settingsMap[s.key] = s.value;
            });

            // Default fallback if marketplaceMode is not yet set
            if (settingsMap.marketplaceMode === undefined) {
                settingsMap.marketplaceMode = 'preparation';
            }

            res.status(200).json({
                success: true,
                data: settingsMap
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Create or update a global setting
    // @route   POST /api/v1/settings
    // @access  Private (Admin)
    updateSetting: async (req, res, next) => {
        try {
            const { key, value } = req.body;

            if (!key) {
                res.status(400);
                throw new Error('Setting key is required');
            }

            const setting = await Setting.findOneAndUpdate(
                { key },
                { value },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            res.status(200).json({
                success: true,
                data: setting
            });
        } catch (error) {
            next(error);
        }
    }
};

export default settingController;
