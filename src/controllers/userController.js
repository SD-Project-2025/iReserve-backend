const { User, Resident, Staff } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const responseFormatter = require("../utils/responseFormatter");
const encryptionService = require("../services/encryptionService");
const { sequelize } = require("../config/database");

// Helper function for safe decryption
const safeDecrypt = (value) => {
  if (!value) return null;
  try {
    return encryptionService.decrypt(value);
  } catch (error) {
    console.error("Decryption error:", error.message);
    return null;
  }
};

// Get all users with decrypted information
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    include: [
      { model: Resident, attributes: ["resident_id", "name", "email"], required: false },
      { model: Staff, attributes: ["staff_id", "employee_id", "name", "email", "is_admin"], required: false }
    ]
  });

  const processedUsers = users.map(user => ({
    user_id: user.user_id,
    user_type: user.user_type,
    status: user.status,
    created_at: user.created_at,
    last_login: user.last_login,
    name: user.user_type === 'resident' ? safeDecrypt(user.Resident?.name) : safeDecrypt(user.Staff?.name),
    email: user.user_type === 'resident' ? safeDecrypt(user.Resident?.email) : safeDecrypt(user.Staff?.email),
    is_admin: user.Staff?.is_admin || false,
    employee_id: user.Staff?.employee_id || null
  }));

  res.status(200).json(responseFormatter.success(processedUsers, "Users retrieved successfully"));
});

// Toggle user status (ban/unban)
exports.manageUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const validStatuses = ['active', 'suspended'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json(responseFormatter.error("Invalid status value", 400));
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json(responseFormatter.error("User not found", 404));
  }

  // Prevent modifying own account
  if (user.user_id === req.user.user_id) {
    return res.status(403).json(responseFormatter.error("Cannot modify your own account", 403));
  }

  await user.update({ status });
  res.status(200).json(responseFormatter.success(null, `User status updated to ${status}`));
});

// Manage admin privileges
exports.manageAdminStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { is_admin } = req.body;

  const user = await User.findByPk(userId);
  if (!user || user.user_type !== "staff") {
    return res.status(404).json(responseFormatter.error("Staff user not found", 404));
  }

  // Prevent modifying own admin status
  if (user.user_id === req.user.user_id) {
    return res.status(403).json(responseFormatter.error("Cannot modify your own admin status", 403));
  }

  const staffProfile = await Staff.findOne({ where: { user_id: userId } });
  if (!staffProfile) {
    return res.status(404).json(responseFormatter.error("Staff profile not found", 404));
  }

  await staffProfile.update({ is_admin });
  res.status(200).json(responseFormatter.success(
    { is_admin: staffProfile.is_admin },
    "Admin status updated successfully"
  ));
});

exports.upgradeToStaff = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { employee_id } = req.body;

  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { transaction: t });
    
    // Validate user exists and is resident
    if (!user || user.user_type !== "resident") {
      return res.status(404).json(
        responseFormatter.error("Resident user not found", 404)
      );
    }

    // Get current resident data
    const residentProfile = await Resident.findOne({ 
      where: { user_id: userId },
      transaction: t 
    });

    if (!residentProfile) {
      return res.status(404).json(
        responseFormatter.error("Resident profile not found", 404)
      );
    }

    // Check for existing staff profile
    const existingStaff = await Staff.findOne({ 
      where: { user_id: userId },
      transaction: t
    });

    if (existingStaff) {
      // Update existing staff record with current resident data
      await existingStaff.update({
        employee_id,
        name: residentProfile.name, // Copy current resident name
        email: residentProfile.email, // Copy current resident email
        position: "New Staff",
        department: "General",
        is_admin: false
      }, { transaction: t });
    } else {
      // Create new staff profile with resident data
      await Staff.create({
        user_id: userId,
        employee_id,
        name: residentProfile.name,
        email: residentProfile.email,
        position: "New Staff",
        department: "General",
        is_admin: false
      }, { transaction: t });
    }

    // Update user type
    await user.update({ user_type: "staff" }, { transaction: t });

    res.status(200).json(
      responseFormatter.success(null, "User upgraded to staff successfully")
    );
  });
});

exports.downgradeToResident = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  return sequelize.transaction(async (t) => {
    // 1. Find and validate user
    const user = await User.findByPk(userId, { transaction: t });
    if (!user || user.user_type !== "staff") {
      return res.status(404).json(
        responseFormatter.error("Staff user not found", 404)
      );
    }

    // 2. Update user type only
    await user.update({ user_type: "resident" }, { transaction: t });

    // 3. Keep staff record but mark as inactive
    await Staff.update(
      { is_admin: false, position: "Former Staff" },
      { where: { user_id: userId }, transaction: t }
    );

    res.status(200).json(
      responseFormatter.success(null, "User downgraded to resident successfully")
    );
  });
  
});
// Get all staff members
// Get all staff members
exports.getStaffMembers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    where: { user_type: 'staff' },
    include: [{
      model: Staff,
      attributes: ['employee_id', 'position', 'department', 'is_admin', 'name', 'email'],
      required: true // Ensures only users with staff profiles
    }]
  });

  const processedStaff = users.map(user => {
    // Check if Staff profile exists
    if (!user.Staff) return null;
    
    const staffProfile = user.Staff.get({ plain: true });
    return {
      user_id: user.user_id,
      status: user.status,
      created_at: user.created_at,
      last_login: user.last_login,
      employee_id: staffProfile.employee_id,
      name: safeDecrypt(staffProfile.name),
      email: safeDecrypt(staffProfile.email),
      position: staffProfile.position,
      department: staffProfile.department,
      is_admin: staffProfile.is_admin
    };
  }).filter(staff => staff !== null); // Remove null entries

  res.status(200).json(responseFormatter.success(processedStaff, "Staff members retrieved successfully"));
});

// Get all residents
exports.getResidents = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    where: { user_type: 'resident' },
    include: [{
      model: Resident,
      attributes: ['membership_type', 'name', 'email'],
      required: true // Ensures only users with resident profiles
    }]
  });

  const processedResidents = users.map(user => {
    // Check if Resident profile exists
    if (!user.Resident) return null;
    
    const residentProfile = user.Resident.get({ plain: true });
    return {
      user_id: user.user_id,
      status: user.status,
      created_at: user.created_at,
      last_login: user.last_login,
      name: safeDecrypt(residentProfile.name),
      email: safeDecrypt(residentProfile.email),
      membership_type: residentProfile.membership_type
    };
  }).filter(resident => resident !== null); // Remove null entries

  res.status(200).json(responseFormatter.success(processedResidents, "Residents retrieved successfully"));
});