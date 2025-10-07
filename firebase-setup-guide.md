# Firebase Integration Setup Guide

This guide will help you set up Firebase for your AgriSense application with real-time database and authentication.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `agrisense-app` (or your preferred name)
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project console, click "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Click on "Email/Password"
5. Toggle "Enable" and click "Save"

## Step 3: Set up Realtime Database

1. Click "Realtime Database" in the left sidebar
2. Click "Create Database"
3. Choose your location (closest to your users)
4. Start in "Test mode" for now (we'll secure it later)
5. Click "Done"

## Step 4: Configure Database Security Rules

Replace the default rules with these secure rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "sensors": {
      "hourlyReadings": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "DailySummary": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "currentReadings": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## Step 5: Get Firebase Configuration

1. Click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (`</>`) to add a web app
5. Enter app nickname: `agrisense-web`
6. Click "Register app"
7. Copy the Firebase configuration object

## Step 6: Update Your Application

Replace the placeholder config in `src/firebase/config.js`:

```javascript
// Replace this placeholder config with your actual Firebase config
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com/",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## Step 7: Database Structure

Your Firebase Realtime Database should have this structure:

```
agrisense-app/
├── sensors/
│   ├── hourlyReadings/
│   │   ├── [timestamp1]/
│   │   │   ├── timestamp: [ISO string]
│   │   │   ├── temperature: [number]
│   │   │   ├── humidity: [number]
│   │   │   ├── moisture: [number]
│   │   │   ├── nitrogen: [number]
│   │   │   ├── phosphorus: [number]
│   │   │   ├── potassium: [number]
│   │   │   └── ph: [number]
│   │   └── ...
│   ├── DailySummary/
│   │   ├── [date-YYYY-MM-DD]/
│   │   │   ├── date: [YYYY-MM-DD]
│   │   │   ├── dayNumber: [number]
│   │   │   ├── totalReadings: [number]
│   │   │   ├── avgTemperature: [number]
│   │   │   ├── avgHumidity: [number]
│   │   │   ├── avgMoisture: [number]
│   │   │   ├── avgNitrogen: [number]
│   │   │   ├── avgPhosphorus: [number]
│   │   │   ├── avgPotassium: [number]
│   │   │   └── avgPh: [number]
│   │   └── ...
│   └── currentReadings/
│       └── [latest sensor data]
└── users/
    └── [user-uid]/
        ├── email: [string]
        ├── displayName: [string]
        └── createdAt: [timestamp]
```

## Step 8: ESP32 Integration

For your ESP32 to send data to Firebase:

1. Install Firebase ESP32 library in Arduino IDE
2. Use the Firebase Realtime Database REST API
3. Send hourly readings to `sensors/hourlyReadings/[timestamp]`
4. Calculate and send daily summaries to `sensors/DailySummary/[date]`

Example ESP32 code structure:
```cpp
// Send hourly reading
String path = "/sensors/hourlyReadings/" + String(timestamp);
Firebase.setFloat(firebaseData, path + "/temperature", temperature);
Firebase.setFloat(firebaseData, path + "/humidity", humidity);
// ... other sensor values

// Calculate daily average (at end of day)
String dailyPath = "/sensors/DailySummary/" + dateString;
Firebase.setFloat(firebaseData, dailyPath + "/avgTemperature", avgTemp);
// ... other averages
```

## Step 9: Testing

1. Create a test user account through your app's login page
2. Verify authentication works
3. Check that data appears in Firebase console
4. Test the History page collapsible sections
5. Test CSV export functionality

## Security Notes

- Never commit your Firebase config with real credentials to version control
- Use environment variables for production
- The provided security rules restrict access to authenticated users only
- Consider more granular permissions for production use

## Step 10: Deploy Your Web Application

### Option 1: Firebase Hosting (Recommended)

Firebase Hosting is the easiest option since you're already using Firebase:

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**
   ```bash
   firebase login
   ```

3. **Initialize Firebase Hosting:**
   ```bash
   firebase init hosting
   ```
   - Select your existing Firebase project
   - Set public directory to `dist` (for Vite) or `build` (for Create React App)
   - Configure as single-page app: **Yes**
   - Don't overwrite index.html: **No**

4. **Build your application:**
   ```bash
   npm run build
   ```

5. **Deploy:**
   ```bash
   firebase deploy
   ```

Your app will be available at: `https://your-project-id.web.app`

### Option 2: Netlify (Alternative)

1. **Build your application:**
   ```bash
   npm run build
   ```

2. **Deploy via Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

3. **Or use Netlify Drop:**
   - Go to [netlify.com/drop](https://netlify.com/drop)
   - Drag your `dist` folder to deploy instantly

### Option 3: Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

### Environment Variables for Production

Create a `.env.production` file for your Firebase config:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-rtdb.firebaseio.com/
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Update `src/firebase/config.js` to use environment variables:

```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

## Troubleshooting

**Authentication Issues:**
- Verify Email/Password is enabled in Firebase Console
- Check network connectivity
- Ensure correct Firebase config

**Database Issues:**
- Verify database rules allow read/write for authenticated users
- Check data structure matches expected format
- Monitor Firebase console for error logs

**ESP32 Connection Issues:**
- Verify WiFi connectivity
- Check Firebase library version compatibility
- Monitor serial output for connection errors

**Deployment Issues:**
- Ensure build completes without errors
- Check that all environment variables are set correctly
- Verify Firebase project permissions for hosting
