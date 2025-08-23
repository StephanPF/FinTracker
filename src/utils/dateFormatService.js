class DateFormatService {
  constructor(database) {
    this.database = database;
  }

  // Get user's date formatting preferences
  getPreferences(userId = 'default') {
    const prefs = this.database.getUserPreferences().find(p => p.userId === userId && p.category === 'date_formatting');
    return prefs ? prefs.settings : {
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 'monday',
      timezone: 'auto'
    };
  }

  // Update user's date formatting preferences
  updatePreferences(settings, userId = 'default') {
    return this.database.updateUserPreferences('date_formatting', settings, userId);
  }

  // Format a date string or Date object according to user preferences
  formatDate(dateInput, options = {}) {
    if (!dateInput) return '-';
    
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date(dateInput);
    }
    
    if (isNaN(date.getTime())) return 'Invalid Date';

    const preferences = this.getPreferences();
    const format = options.format || preferences.dateFormat;
    
    return this.applyDateFormat(date, format, preferences);
  }

  // Format a date and time together
  formatDateTime(dateInput, options = {}) {
    if (!dateInput) return '-';
    
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date(dateInput);
    }
    
    if (isNaN(date.getTime())) return 'Invalid Date';

    const preferences = this.getPreferences();
    const dateFormat = options.dateFormat || preferences.dateFormat;
    const timeFormat = options.timeFormat || preferences.timeFormat;
    
    const formattedDate = this.applyDateFormat(date, dateFormat, preferences);
    const formattedTime = this.applyTimeFormat(date, timeFormat);
    
    return `${formattedDate} ${formattedTime}`;
  }

  // Format only the time portion
  formatTime(dateInput, options = {}) {
    if (!dateInput) return '-';
    
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date(dateInput);
    }
    
    if (isNaN(date.getTime())) return 'Invalid Time';

    const preferences = this.getPreferences();
    const timeFormat = options.format || preferences.timeFormat;
    
    return this.applyTimeFormat(date, timeFormat);
  }

  // Apply the specific date format
  applyDateFormat(date, format, preferences) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const shortYear = year.toString().slice(-2);
    
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const monthName = monthNames[date.getMonth()];
    
    const fullMonthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const fullMonthName = fullMonthNames[date.getMonth()];

    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD.MM.YYYY':
        return `${day}.${month}.${year}`;
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      case 'MMM DD, YYYY':
        return `${monthName} ${day}, ${year}`;
      case 'DD MMM YYYY':
        return `${day} ${monthName} ${year}`;
      case 'MMMM DD, YYYY':
        return `${fullMonthName} ${day}, ${year}`;
      case 'DD/MM/YY':
        return `${day}/${month}/${shortYear}`;
      case 'MM/DD/YY':
        return `${month}/${day}/${shortYear}`;
      default:
        return `${day}/${month}/${year}`;
    }
  }

  // Apply the specific time format
  applyTimeFormat(date, format) {
    const hours24 = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    if (format === '12h') {
      const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
      const ampm = hours24 >= 12 ? 'PM' : 'AM';
      return `${hours12}:${minutes} ${ampm}`;
    } else {
      // 24h format
      const hours24Padded = hours24.toString().padStart(2, '0');
      return `${hours24Padded}:${minutes}`;
    }
  }

  // Get relative date (Today, Yesterday, etc.)
  getRelativeDate(dateInput) {
    if (!dateInput) return '-';
    
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date(dateInput);
    }
    
    if (isNaN(date.getTime())) return 'Invalid Date';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = today.getTime() - inputDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays === -1) {
      return 'Tomorrow';
    } else if (diffDays > 1 && diffDays <= 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < -1 && diffDays >= -7) {
      return `In ${Math.abs(diffDays)} days`;
    } else {
      return this.formatDate(date);
    }
  }

  // Format date for HTML input[type="date"] (always YYYY-MM-DD)
  formatForInput(dateInput) {
    if (!dateInput) return '';
    
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date(dateInput);
    }
    
    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  // Parse date from input and return ISO string
  parseFromInput(inputValue) {
    if (!inputValue) return null;
    
    const date = new Date(inputValue);
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString();
  }

  // Get formatted date range
  formatDateRange(startDate, endDate, options = {}) {
    if (!startDate || !endDate) return '-';
    
    const formattedStart = this.formatDate(startDate, options);
    const formattedEnd = this.formatDate(endDate, options);
    
    if (formattedStart === formattedEnd) {
      return formattedStart;
    }
    
    return `${formattedStart} - ${formattedEnd}`;
  }

  // Get first day of week based on user preference
  getFirstDayOfWeek() {
    const preferences = this.getPreferences();
    switch (preferences.firstDayOfWeek) {
      case 'sunday':
        return 0;
      case 'monday':
        return 1;
      case 'saturday':
        return 6;
      default:
        return 1; // Monday
    }
  }

  // Get localized day names starting from user's preferred first day
  getDayNames() {
    const preferences = this.getPreferences();
    const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const firstDay = this.getFirstDayOfWeek();
    const orderedDays = [...allDays.slice(firstDay), ...allDays.slice(0, firstDay)];
    const orderedShortDays = [...shortDays.slice(firstDay), ...shortDays.slice(0, firstDay)];
    
    return {
      full: orderedDays,
      short: orderedShortDays
    };
  }

  // Get available date format options for settings UI
  getAvailableDateFormats() {
    const sampleDate = new Date(2025, 7, 23); // August 23, 2025
    
    return [
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: this.applyDateFormat(sampleDate, 'DD/MM/YYYY') },
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: this.applyDateFormat(sampleDate, 'MM/DD/YYYY') },
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: this.applyDateFormat(sampleDate, 'YYYY-MM-DD') },
      { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY', example: this.applyDateFormat(sampleDate, 'DD.MM.YYYY') },
      { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: this.applyDateFormat(sampleDate, 'DD-MM-YYYY') },
      { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY', example: this.applyDateFormat(sampleDate, 'MMM DD, YYYY') },
      { value: 'DD MMM YYYY', label: 'DD MMM YYYY', example: this.applyDateFormat(sampleDate, 'DD MMM YYYY') },
      { value: 'MMMM DD, YYYY', label: 'MMMM DD, YYYY', example: this.applyDateFormat(sampleDate, 'MMMM DD, YYYY') }
    ];
  }

  // Get timezone offset in hours
  getTimezoneOffset() {
    const preferences = this.getPreferences();
    
    if (preferences.timezone === 'auto') {
      return new Date().getTimezoneOffset() / -60; // Convert to hours and flip sign
    }
    
    // For specific timezones, you'd implement timezone conversion logic
    // For now, return browser timezone
    return new Date().getTimezoneOffset() / -60;
  }
}

export default DateFormatService;