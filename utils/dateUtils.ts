import { Task } from '../types';

export const parseMMDD = (dateStr: string): string => {
  const [month, day] = dateStr.split('/').map(Number);
  if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error('無効な日付形式です (MM/DD)');
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Create date for current year
  const dateThisYear = new Date(currentYear, month - 1, day);
  
  // If the date is in the past for this year, assume next year
  // Compare against start of today
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateThisYear < startOfToday) {
    return new Date(currentYear + 1, month - 1, day).toISOString();
  }
  
  return dateThisYear.toISOString();
};

export const formatDate = (isoStr: string | Date): string => {
  const date = typeof isoStr === 'string' ? new Date(isoStr) : isoStr;
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const isOverdue = (isoStr: string): boolean => {
  const dueDate = new Date(isoStr);
  const today = new Date();
  // Set time to 00:00:00 to compare dates only
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
};

export const generateGoogleCalendarUrl = (task: Task): string => {
  const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';

  const title = encodeURIComponent(task.title);

  const startDate = new Date(task.dueDate);
  // For an all-day event, the end date is the next day.
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 1);

  // Format for all-day event: YYYYMMDD/YYYYMMDD
  const formatDateForUrl = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, '');
  
  const dates = `${formatDateForUrl(startDate)}/${formatDateForUrl(endDate)}`;

  const detailsText = `担当者: ${task.assigneeName}\n優先度: ${task.priority}\nステータス: ${task.status}`;
  const details = encodeURIComponent(detailsText);

  return `${baseUrl}&text=${title}&dates=${dates}&details=${details}`;
};