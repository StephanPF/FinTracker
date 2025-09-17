import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import './NotificationCenter.css';

const NotificationCenter = ({ isOpen, onClose, notificationService, onNotificationChange }) => {
  const { t } = useLanguage();
  const { setPendingTransactionSearch } = useAccounting();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && notificationService) {
      loadNotifications();
    }
  }, [isOpen, notificationService, filter]);

  const loadNotifications = async () => {
    console.log('🔴 NOTIFICATION CENTER: loadNotifications called');
    setIsLoading(true);
    try {
      const filters = filter === 'unread' ? { unreadOnly: true } : {};
      console.log('🔴 NOTIFICATION CENTER: Using filters:', filters);
      console.log('🔴 NOTIFICATION CENTER: notificationService:', notificationService);

      const notifs = notificationService.getNotifications(filters);
      console.log('🔴 NOTIFICATION CENTER: Retrieved notifications:', notifs.length);

      // Debug template opportunity notifications specifically
      const templateNotifs = notifs.filter(n => n.type === 'template_opportunity');
      console.log('🔴 NOTIFICATION CENTER: Template notifications:', templateNotifs.length);
      templateNotifs.forEach(n => {
        console.log('🔴 NOTIFICATION CENTER: Template notification', n.id, 'data:', n.data);
      });

      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      loadNotifications();
      if (onNotificationChange) onNotificationChange();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      loadNotifications();
      if (onNotificationChange) onNotificationChange();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      loadNotifications();
      if (onNotificationChange) onNotificationChange();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'budget_alert': return '💰';
      case 'low_balance': return '⚠️';
      case 'large_transaction': return '💳';
      case 'cashflow_warning': return '📉';
      case 'reconciliation_reminder': return '🔄';
      case 'data_inconsistency': return '🔍';
      case 'duplicate_detection': return '👥';
      case 'monthly_summary': return '📊';
      case 'expense_insight': return '💡';
      case 'template_opportunity': return '📝';
      case 'backup_reminder': return '💾';
      case 'exchange_rate_stale': return '💱';
      default: return '📢';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getActionButton = (notification) => {
    const { type, data } = notification;
    
    switch (type) {
      case 'reconciliation_reminder':
        return (
          <button 
            className="notification-action-btn"
            onClick={() => {
              // Navigate to reconciliation for this account
              window.location.href = `#/reconciliation?account=${data.accountId}`;
            }}
          >
            Reconcile Now
          </button>
        );
      
      case 'budget_alert':
        return (
          <button 
            className="notification-action-btn"
            onClick={() => {
              // Navigate to budget view
              window.location.href = '#/analytics/expense';
            }}
          >
            View Budget
          </button>
        );
      
      case 'low_balance':
        return (
          <button 
            className="notification-action-btn"
            onClick={() => {
              // Navigate to account details
              window.location.href = '#/data-management?tab=accounts';
            }}
          >
            View Account
          </button>
        );
        
      case 'data_inconsistency':
        return (
          <button 
            className="notification-action-btn"
            onClick={() => {
              // Navigate to transactions that need categorization
              window.location.href = '#/data-management?tab=transactions';
            }}
          >
            Fix Issues
          </button>
        );
        
      case 'template_opportunity':
        return (
          <button
            className="notification-action-btn"
            onClick={() => {
              console.log('🔴 NOTIFICATION CENTER DEBUG START 🔴');
              console.log('🔍 Full notification object:', notification);
              console.log('🔍 Notification data field:', data);
              console.log('🔍 data type:', typeof data);

              // Extract transaction description from notification data
              const transactionDescription = data?.transactionDescription || '';
              const merchantName = data?.merchantName || '';

              console.log('🔍 Extracted transactionDescription:', transactionDescription);
              console.log('🔍 Extracted merchantName:', merchantName);
              console.log('🔍 Will use for search:', transactionDescription || merchantName);

              // Use the transaction description for search
              const searchTerm = transactionDescription || merchantName;
              if (searchTerm) {
                console.log('🔍 Calling setPendingTransactionSearch with:', searchTerm);
                setPendingTransactionSearch(searchTerm);
                console.log('🔍 setPendingTransactionSearch called successfully');

                // Close modal first
                console.log('🔍 Closing notification modal');
                onClose();

                // Navigate with a small delay to ensure context updates
                setTimeout(() => {
                  console.log('🔍 Navigating to transactions page');
                  window.location.href = '#transactions';
                }, 100);
              } else {
                console.warn('⚠️ No search term found in notification data');
                console.log('⚠️ Full notification for debugging:', JSON.stringify(notification, null, 2));
                onClose();
                window.location.href = '#transactions';
              }
              console.log('🔴 NOTIFICATION CENTER DEBUG END 🔴');
            }}
          >
            Create Template
          </button>
        );
        
      case 'backup_reminder':
        return (
          <button 
            className="notification-action-btn"
            onClick={() => {
              // Navigate to data settings
              window.location.href = '#/settings?section=data';
            }}
          >
            Backup Now
          </button>
        );
        
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notification-center-overlay">
      <div className="notification-center">
        <div className="notification-header">
          <h3>🔔 {t('notifications')}</h3>
          <div className="notification-header-actions">
            <div className="notification-filters">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button 
                className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                Unread
              </button>
            </div>
            <div className="notification-controls">
              <button 
                className="control-btn"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
              >
                ✓
              </button>
              <button 
                className="control-btn close-btn"
                onClick={onClose}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="notification-content">
          {isLoading ? (
            <div className="notification-loading">
              <div className="loading-spinner"></div>
              <span>Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <div className="empty-icon">🔕</div>
              <p>
                {filter === 'unread' 
                  ? 'No unread notifications' 
                  : 'No notifications yet'
                }
              </p>
              <small>Notifications will appear here when there are alerts or insights about your finances</small>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`notification-item ${notification.isRead ? 'read' : 'unread'} priority-${notification.priority}`}
                >
                  <div className="notification-indicators">
                    <span className="priority-indicator" title={`${notification.priority} priority`}>
                      {getPriorityIcon(notification.priority)}
                    </span>
                    <span className="type-indicator" title={notification.type}>
                      {getTypeIcon(notification.type)}
                    </span>
                  </div>
                  
                  <div className="notification-body">
                    <div className="notification-main">
                      <h4 className="notification-title">{notification.title}</h4>
                      <p className="notification-message">{notification.message}</p>
                    </div>
                    
                    <div className="notification-meta">
                      <span className="notification-time">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                      <div className="notification-actions">
                        {getActionButton(notification)}
                        
                        {!notification.isRead && (
                          <button 
                            className="mark-read-btn"
                            onClick={() => handleMarkAsRead(notification.id)}
                            title="Mark as read"
                          >
                            ✓
                          </button>
                        )}
                        
                        <button 
                          className="delete-btn"
                          onClick={() => handleDelete(notification.id)}
                          title="Delete notification"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;