# Hourly Data Storage System

## Overview
The AgriSense system now automatically stores sensor data every hour and creates daily summaries. This document explains how the system works and the data structure.

## ESP32 Implementation

### Data Collection Flow
1. **Real-time readings**: ESP32 continues to send sensor data every 30 seconds to `sensors/current`
2. **Hourly accumulation**: Each reading is accumulated for hourly averaging
3. **Hourly storage**: Every hour, averaged data is stored to `sensors/hourlyReadings/`
4. **Daily summaries**: Daily summaries are automatically updated in `sensors/DailySummary/`

### Key Features
- **Automatic hourly data storage** (every 3,600,000ms = 1 hour)
- **Data averaging** from ~120 readings per hour (30-second intervals)
- **Daily summary generation** with running averages
- **Robust error handling** for Firebase operations

### Firebase Data Structure

#### Hourly Readings (`sensors/hourlyReadings/`)
```json
{
  "timestamp_key": {
    "avgTemperature": 25.4,
    "avgHumidity": 65.2,
    "avgMoisture": 45.8,
    "avgNitrogen": 52.1,
    "avgPhosphorus": 32.5,
    "avgPotassium": 68.3,
    "avgPh": 6.8,
    "readingCount": 118,
    "timestamp": 1234567890,
    "hour": 14
  }
}
```

#### Daily Summaries (`sensors/DailySummary/`)
```json
{
  "day_0": {
    "dayNumber": 1,
    "date": "2025-08-25",
    "hourCount": 24,
    "totalReadings": 2880,
    "avgTemperature": 26.2,
    "avgHumidity": 63.5,
    "avgMoisture": 47.1,
    "avgNitrogen": 51.8,
    "avgPhosphorus": 33.2,
    "avgPotassium": 67.9,
    "avgPh": 6.7,
    "totalTemperature": 628.8,
    "totalHumidity": 1524.0,
    "totalMoisture": 1130.4,
    "totalNitrogen": 1243.2,
    "totalPhosphorus": 796.8,
    "totalPotassium": 1629.6,
    "totalPh": 160.8
  }
}
```

## Dashboard Implementation

### Results Page
- **Individual daily donut charts** for each completed day
- **Day numbering** (Day 1, Day 2, etc.) with dates
- **Reading counts** showing "24 readings collected" for complete days
- **Responsive grid layout** (1-3 columns based on screen size)

### History Page
- **Collapsible day sections** showing hourly records
- **24 hourly entries per day** with averaged sensor values
- **Export functionality** for individual days or all data
- **Summary statistics** across all filtered days

### Key Features
- **Demo mode support** with realistic sample data
- **Real Firebase integration** ready for production
- **Responsive design** works on all screen sizes
- **Data export** to CSV format
- **Filtering options** by date range

## Usage Instructions

### For ESP32 Development
1. Update WiFi and Firebase credentials in the ESP32 code
2. Upload the code to your ESP32 device
3. Monitor Serial output for hourly data storage confirmations
4. Data will automatically accumulate and store every hour

### For Dashboard Development
1. Set `isDemoMode = false` in `src/firebase/config.js` for real data
2. Configure your Firebase credentials
3. Run the React app: `npm run dev`
4. Navigate to Results page to see daily summaries
5. Navigate to History page to see hourly records

## Data Flow Timeline

```
Every 30 seconds: Sensor reading → Current data + Hourly accumulation
Every 1 hour:     Hourly average → Firebase hourlyReadings + Daily summary update
Every 24 hours:   Complete day → New daily summary card in Results page
```

## Benefits

1. **Efficient storage**: Reduces Firebase usage by storing averages instead of all readings
2. **Historical analysis**: Enables trend analysis over days, weeks, and months
3. **Data visualization**: Provides meaningful charts and summaries
4. **Scalability**: System can run continuously without storage overflow
5. **User experience**: Clear presentation of data in digestible formats

## Troubleshooting

### ESP32 Issues
- Check Serial monitor for hourly storage confirmations
- Verify Firebase credentials and network connectivity
- Monitor memory usage for long-running operations

### Dashboard Issues
- Verify Firebase configuration in `config.js`
- Check browser console for any JavaScript errors
- Ensure proper data structure in Firebase database

## Future Enhancements

1. **Weekly/Monthly summaries**: Aggregate daily data further
2. **Alerts**: Notify when values go outside optimal ranges
3. **Predictive analytics**: Use historical data for crop recommendations
4. **Data backup**: Automatic backup of historical data
5. **Mobile app**: Native mobile interface for the dashboard
