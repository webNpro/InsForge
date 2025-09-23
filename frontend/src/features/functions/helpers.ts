import { format } from 'date-fns';

/**
 * Format a date string as relative time or absolute time
 * Shows relative time for dates within 24 hours, absolute time for older dates
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    // For dates older than 24 hours, show date + time
    return format(date, 'MMM dd, yyyy HH:mm');
  }
}

/**
 * Format a date string as absolute time
 * Always shows in MMM dd, yyyy HH:mm format
 */
export function formatCreatedDate(dateString: string): string {
  return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
}
