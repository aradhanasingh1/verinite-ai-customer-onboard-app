export function formatTime(date: Date): string {
  if (typeof window === 'undefined') {
    // Server-side: Use 24-hour format
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } else {
    // Client-side: Match server format
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}