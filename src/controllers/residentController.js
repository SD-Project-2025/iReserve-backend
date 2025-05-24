const { Resident } = require('../models');
const encryptionService = require('../services/encryptionService');
const responseFormatter = require('../utils/responseFormatter');
const { Op } = require('sequelize');

exports.getResidentNames = async (req, res) => {
  try {
    const { user_ids } = req.body;

    if (!user_ids || !Array.isArray(user_ids)) {
      return res.status(400).json(responseFormatter.error('User IDs array is required', 400));
    }

    const residents = await Resident.findAll({
      where: {
        user_id: {
          [Op.in]: user_ids
        }
      },
      attributes: ['user_id', 'name']
    });

    const namesMap = {};
    residents.forEach(resident => {
      try {
        namesMap[resident.user_id] = resident.name 
          ? encryptionService.decrypt(resident.name)
          : `User ${resident.user_id}`;
      } catch (error) {
        console.error(`Decryption error for user ${resident.user_id}:`, error.message);
        namesMap[resident.user_id] = `User ${resident.user_id}`;
      }
    });

    // Ensure all requested IDs have at least a default value
    user_ids.forEach(id => {
      if (!namesMap[id]) {
        namesMap[id] = `User ${id}`;
      }
    });

    res.status(200).json(responseFormatter.success(namesMap, "Resident names retrieved successfully"));
  } catch (error) {
    console.error("Error fetching resident names:", error);
    res.status(500).json(responseFormatter.error("Failed to fetch resident names", 500));
  }
};

module.exports = exports