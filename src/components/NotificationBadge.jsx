import React, { useState, useEffect } from 'react';
import './NotificationBadge.css';

const NotificationBadge = ({ notificationService, onClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (notificationService) {
      updateUnreadCount();
      
      // Update count every 30 seconds
      const interval = setInterval(updateUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [notificationService]);

  const updateUnreadCount = () => {
    if (notificationService) {
      const count = notificationService.getUnreadCount();
      setUnreadCount(count);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
      // Update count after opening (in case user marks as read)
      setTimeout(updateUnreadCount, 100);
    }
  };

  return (
    <button 
      className="notification-badge"
      onClick={handleClick}
      title={`${unreadCount} unread notifications`}
    >
      <span className="notification-icon">🔔</span>
      {unreadCount > 0 && (
        <span className="notification-count">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBadge;