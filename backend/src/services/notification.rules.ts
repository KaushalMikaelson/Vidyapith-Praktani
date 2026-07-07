export interface DeliveryPreferences {
  push: boolean;
  email: boolean;
}

export type NotificationTriggerType =
  | 'POST_CREATED'
  | 'GROUP_POST_CREATED'
  | 'COMMENT'
  | 'LIKE'
  | 'MESSAGE'
  | 'EVENT_CREATED'
  | 'EVENT_RSVP'
  | 'JOB_POSTED'
  | 'JOB_APPLIED'
  | 'JOB_STATUS_UPDATED'
  | 'NEWS_CREATED'
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'GROUP_ADDED'
  | 'GROUP_REMOVED'
  | 'GROUP_UPDATED'
  | 'GROUP_DELETED'
  | 'MENTORSHIP_REQUEST';

export const notificationRules: Record<NotificationTriggerType, DeliveryPreferences> = {
  POST_CREATED: { push: true, email: false },
  GROUP_POST_CREATED: { push: true, email: true },
  COMMENT: { push: true, email: false },
  LIKE: { push: true, email: false },
  MESSAGE: { push: true, email: true },
  EVENT_CREATED: { push: true, email: true },
  EVENT_RSVP: { push: true, email: true },
  JOB_POSTED: { push: true, email: true },
  JOB_APPLIED: { push: true, email: true },
  JOB_STATUS_UPDATED: { push: true, email: true },
  NEWS_CREATED: { push: true, email: true },
  CONNECTION_REQUEST: { push: true, email: true },
  CONNECTION_ACCEPTED: { push: true, email: true },
  GROUP_ADDED: { push: true, email: true },
  GROUP_REMOVED: { push: true, email: true },
  GROUP_UPDATED: { push: true, email: false },
  GROUP_DELETED: { push: true, email: true },
  MENTORSHIP_REQUEST: { push: true, email: true }
};
