const notificationController = require('../../../src/controllers/notificationController');
const { Notification } = require('../../../src/models');

// Mock the models
jest.mock('../../../src/models', () => ({
  Notification: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  }
}));

describe('Notification Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      user: { user_id: 1 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock responseFormatter.success to return its input
    //responseFormatter = require('../../../src/utils/responseFormatter');
    //responseFormatter.success = jest.fn((data, message) => ({ success: true, data, message }));
  });

  describe('getNotifications', () => {
    it('should retrieve all notifications for user', async () => {
      const mockNotifications = [
        { notification_id: 1, message: 'Test notification 1' },
        { notification_id: 2, message: 'Test notification 2' }
      ];
      Notification.findAll.mockResolvedValue(mockNotifications);

      await notificationController.getNotifications(req, res);

      expect(Notification.findAll).toHaveBeenCalledWith({
        where: { user_id: 1 },
        order: [["created_at", "DESC"]]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotifications,
        message: 'Notifications retrieved successfully'
      });
    });

    it('should filter notifications by read status', async () => {
      req.query = { read: 'true' };
      const mockNotifications = [{ notification_id: 1, message: 'Read notification' }];
      Notification.findAll.mockResolvedValue(mockNotifications);

      await notificationController.getNotifications(req, res);

      expect(Notification.findAll).toHaveBeenCalledWith({
        where: { user_id: 1, read: true },
        order: [["created_at", "DESC"]]
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      req.params.id = 1;
      const mockNotification = {
        notification_id: 1,
        user_id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      Notification.findByPk.mockResolvedValue(mockNotification);

      await notificationController.markAsRead(req, res);

      expect(Notification.findByPk).toHaveBeenCalledWith(1);
      expect(mockNotification.update).toHaveBeenCalledWith({
        read: true,
        read_at: expect.any(Date)
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: 'Notification marked as read'
      });
    });

    it('should return 404 if notification not found', async () => {
      req.params.id = 999;
      Notification.findByPk.mockResolvedValue(null);

      await notificationController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Notification not found'
      });
    });

    it('should return 403 if user tries to mark another user\'s notification', async () => {
      req.params.id = 1;
      const mockNotification = {
        notification_id: 1,
        user_id: 2 // Different from req.user.user_id
      };
      Notification.findByPk.mockResolvedValue(mockNotification);

      await notificationController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to access this notification'
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      Notification.update.mockResolvedValue([5]); // 5 rows affected

      await notificationController.markAllAsRead(req, res);

      expect(Notification.update).toHaveBeenCalledWith(
        {
          read: true,
          read_at: expect.any(Date)
        },
        {
          where: {
            user_id: 1,
            read: false
          }
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: 'All notifications marked as read'
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      req.params.id = 1;
      const mockNotification = {
        notification_id: 1,
        user_id: 1,
        destroy: jest.fn().mockResolvedValue(true)
      };
      Notification.findByPk.mockResolvedValue(mockNotification);

      await notificationController.deleteNotification(req, res);

      expect(Notification.findByPk).toHaveBeenCalledWith(1);
      expect(mockNotification.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: 'Notification deleted successfully'
      });
    });

    it('should return 404 if notification not found', async () => {
      req.params.id = 999;
      Notification.findByPk.mockResolvedValue(null);

      await notificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Notification not found'
      });
    });

    it('should return 403 if user tries to delete another user\'s notification', async () => {
      req.params.id = 1;
      const mockNotification = {
        notification_id: 1,
        user_id: 2 // Different from req.user.user_id
      };
      Notification.findByPk.mockResolvedValue(mockNotification);

      await notificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to delete this notification'
      });
    });
  });
});