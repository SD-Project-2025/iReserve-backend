const { Notification} = require("../models")
const asyncHandler = require("../utils/asyncHandler")
const responseFormatter = require("../utils/responseFormatter")


exports.getNotifications = asyncHandler(async (req, res) => {
  const { read } = req.query


  const filter = { user_id: req.user.user_id }
  if (read !== undefined) {
    filter.read = read === "true"
  }

  const notifications = await Notification.findAll({
    where: filter,
    order: [["created_at", "DESC"]],
  })

  res.status(200).json(responseFormatter.success(notifications, "Notifications retrieved successfully"))
})


exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByPk(req.params.id)

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    })
  }


  if (notification.user_id !== req.user.user_id) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this notification",
    })
  }


  await notification.update({
    read: true,
    read_at: new Date(),
  })

  res.status(200).json(responseFormatter.success(null, "Notification marked as read"))
})


exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.update(
    {
      read: true,
      read_at: new Date(),
    },
    {
      where: {
        user_id: req.user.user_id,
        read: false,
      },
    },
  )

  res.status(200).json(responseFormatter.success(null, "All notifications marked as read"))
})


exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findByPk(req.params.id)

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    })
  }

 
  if (notification.user_id !== req.user.user_id) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to delete this notification",
    })
  }

  await notification.destroy()

  res.status(200).json(responseFormatter.success(null, "Notification deleted successfully"))
})

module.exports = exports
