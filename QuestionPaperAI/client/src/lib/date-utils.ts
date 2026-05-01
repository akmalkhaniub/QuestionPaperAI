/**
 * Format a date to DD/MM/YYYY format
 * This consistent format is used across the entire application
 * 
 * @param dateString A valid date string or Date object
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) {
    return 'No date';
  }
  
  try {
    // Handle string date formats
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Ensure valid date
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error, dateString);
    return 'Error formatting date';
  }
}

/**
 * Format time allowed from minutes to a human-readable format
 * 
 * @param minutes Number of minutes 
 * @returns Formatted time string (e.g., "1 hour 30 minutes")
 */
export function formatTimeAllowed(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}