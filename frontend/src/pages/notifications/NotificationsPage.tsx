import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationItem } from '../../types';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckSquare,
  ShieldAlert,
  Inbox,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const { currentRole } = useAuth();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'UNREAD') return !n.isRead;
    if (filterType === 'SEVERE') return n.type === 'SEVERE_ALERT';
    if (filterType === 'TASKS')
      return (
        n.type === 'TASK_ASSIGNED' ||
        n.type === 'AWAITING_VERIFICATION' ||
        n.type === 'TASK_REJECTED' ||
        n.type === 'OVERDUE_TASK'
      );
    return true;
  });

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markAsRead(item.id);
    }

    if (item.relatedRecordType === 'FEEDBACK') {
      if (currentRole === 'SUPERVISOR' || currentRole === 'ADMIN') {
        navigate(`/supervisor/feedback/${item.relatedRecordId}`);
      } else {
        navigate('/track');
      }
    } else if (item.relatedRecordType === 'TASK') {
      if (currentRole === 'KITCHEN_STAFF') {
        navigate('/kitchen');
      } else {
        navigate('/supervisor/actions');
      }
    }
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'SEVERE_ALERT':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'OVERDUE_TASK':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'AWAITING_VERIFICATION':
        return <Clock className="w-5 h-5 text-purple-600" />;
      case 'TASK_ASSIGNED':
        return <CheckSquare className="w-5 h-5 text-brand-600" />;
      case 'TASK_REJECTED':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Inbox className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Operational Notification Center
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time safety alerts, assignment dispatches, and verification requests.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={markAllAsRead}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === 'ALL'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilterType('UNREAD')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === 'UNREAD'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilterType('SEVERE')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === 'SEVERE'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Severe Alerts
        </button>
        <button
          onClick={() => setFilterType('TASKS')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === 'TASKS'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Task Dispatches
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <LoadingSpinner label="Fetching notification alerts..." />
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-6 h-6" />}
          title="No Notifications Found"
          description="You're all caught up! When new alerts or task updates occur, they will appear here."
        />
      ) : (
        <Card className="shadow-sm divide-y divide-slate-100 overflow-hidden">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 flex items-start gap-4 transition-colors cursor-pointer hover:bg-slate-50 ${
                !notif.isRead ? 'bg-indigo-50/30' : ''
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-100 shrink-0">
                {getNotificationIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-xs ${
                      !notif.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                    }`}
                  >
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(notif.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                  <span>Record: {notif.relatedRecordId}</span>
                  {!notif.isRead && (
                    <span className="inline-flex items-center gap-1 text-brand-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                      Unread
                    </span>
                  )}
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 self-center" />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};
