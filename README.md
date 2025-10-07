# AgriSense - Smart Agriculture Dashboard

A modern, responsive Smart Agriculture Dashboard built with React.js, Tailwind CSS, and Firebase integration. AgriSense provides real-time IoT sensor monitoring, AI-powered crop recommendations, and comprehensive farm management tools.

![AgriSense Dashboard](https://via.placeholder.com/800x400/22c55e/ffffff?text=AgriSense+Dashboard)

## 🌱 Features

### Core Functionality
- **Real-time Sensor Monitoring** - 7-in-1 sensor data (Temperature, Humidity, Soil Moisture, N-P-K, pH)
- **AI-Powered Recommendations** - Smart crop and fertilizer suggestions
- **Historical Data Analysis** - 15+ days of sensor data with export capabilities
- **Admin Panel** - CRUD operations for sensor data management
- **User Authentication** - Secure Firebase Auth integration
- **Responsive Design** - Works on desktop, tablet, and mobile devices

### Pages & Components
- **Home** - Hero section with feature cards and authentication
- **Sensor Dashboard** - Real-time data visualization with charts
- **Crop Recommendation** - AI-based crop suggestions with confidence scores
- **Fertilizer Recommendation** - Nutrient analysis and fertilizer suggestions
- **Results** - Track recommendation outcomes and performance
- **History** - Searchable data table with filtering and export
- **Admin Panel** - Data management and system overview
- **About** - Company information and technology stack
- **Contact** - Contact form and business information

## 🚀 Technology Stack

### Frontend
- **React.js 18** - Modern JavaScript framework
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **React Router** - Client-side routing
- **Recharts** - Data visualization library
- **Lucide React** - Beautiful icon library

### Backend & Database
- **Firebase Authentication** - User management
- **Firebase Realtime Database** - Real-time data storage
- **Firebase Hosting** - Web app deployment

### IoT Integration
- **ESP32** - Microcontroller for sensor data collection
- **7-in-1 Agricultural Sensors** - Temperature, Humidity, Moisture, NPK, pH
- **Real-time Data Transmission** - WiFi-based data streaming to Firebase

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- ESP32 development board (for IoT integration)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/agrisense-dashboard.git
   cd agrisense-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Enable Realtime Database
   - Copy your Firebase config and update `src/firebase/config.js`:
   
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

4. **Set up Firebase Security Rules**
   - Go to Firebase Console > Realtime Database > Rules
   - Copy the rules from `firebase-security-rules.json`

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Create an account or sign in

## 🔧 ESP32 Sensor Setup

### Hardware Requirements
- ESP32 development board
- DHT22 (Temperature & Humidity)
- Soil moisture sensor
- pH sensor
- NPK sensors (Nitrogen, Phosphorus, Potassium)
- Connecting wires and breadboard

### Software Setup
1. Install Arduino IDE
2. Add ESP32 board support
3. Install required libraries:
   - FirebaseESP32
   - DHT sensor library
   - OneWire
   - DallasTemperature

4. Configure the ESP32 code:
   - Update WiFi credentials
   - Update Firebase credentials
   - Upload `esp32-sensor-code/agrisense_esp32.ino`

See `esp32-sensor-code/README.md` for detailed setup instructions.

## 🎨 UI/UX Features

### Design System
- **Color Palette**: Green primary (#22c55e) with complementary grays
- **Typography**: Inter font family for modern readability
- **Animations**: Smooth Framer Motion transitions
- **Icons**: Lucide React icon library
- **Responsive**: Mobile-first design approach

### User Experience
- **Intuitive Navigation**: Fixed sidebar with clear menu structure
- **Real-time Updates**: Live sensor data with visual indicators
- **Interactive Charts**: Hover effects and tooltips
- **Form Validation**: Real-time input validation
- **Loading States**: Smooth loading animations
- **Error Handling**: User-friendly error messages

## 📊 Data Structure

### Firebase Database Schema
```
sensors/
├── current/           # Latest readings
│   ├── temperature: 28.5
│   ├── humidity: 65.2
│   ├── moisture: 45.8
│   ├── nitrogen: 78.3
│   ├── phosphorus: 42.1
│   ├── potassium: 89.7
│   └── ph: 6.8
└── history/           # Historical data
    └── {timestamp}/   # Timestamped entries
        └── ...

recommendations/       # AI suggestions
results/              # Recommendation outcomes
devices/              # ESP32 device status
users/                # User profiles
```

## 🔒 Security

### Authentication
- Firebase Authentication with email/password
- Protected routes for authenticated users
- Secure token management

### Database Security
- Firebase security rules restrict access to authenticated users
- Data validation rules ensure proper data structure
- User-specific data isolation

### Best Practices
- Environment variables for sensitive data
- HTTPS-only communication
- Input sanitization and validation

## 🚀 Deployment

### Firebase Hosting
1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project**
   ```bash
   firebase init hosting
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

### Alternative Deployment Options
- **Netlify**: Connect your GitHub repository for automatic deployments
- **Vercel**: Deploy with zero configuration
- **AWS Amplify**: Full-stack deployment with backend services

## 📱 Mobile Responsiveness

AgriSense is fully responsive and optimized for:
- **Desktop**: Full sidebar navigation and multi-column layouts
- **Tablet**: Collapsible sidebar and responsive grids
- **Mobile**: Touch-friendly interface and stacked layouts

## 🔧 Development

### Available Scripts
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App

### Project Structure
```
src/
├── components/        # Reusable UI components
├── contexts/          # React context providers
├── firebase/          # Firebase configuration
├── pages/            # Route components
├── App.js            # Main application component
├── index.js          # Application entry point
└── index.css         # Global styles

esp32-sensor-code/    # Arduino code for ESP32
public/               # Static assets
```

### Code Style
- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **Tailwind CSS**: Utility-first styling
- **Component-based**: Modular React architecture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://reactjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [ESP32 Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)

### Contact
- **Email**: support@agrisense.com
- **Website**: https://agrisense.com
- **GitHub Issues**: [Create an issue](https://github.com/yourusername/agrisense-dashboard/issues)

## 🎯 Roadmap

### Upcoming Features
- [ ] Weather API integration
- [ ] Satellite imagery analysis
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] IoT device management
- [ ] Automated irrigation control
- [ ] Market price integration

### Version History
- **v1.0.0** - Initial release with core features
- **v1.1.0** - Enhanced UI/UX and mobile optimization
- **v1.2.0** - Advanced analytics and reporting
- **v2.0.0** - IoT integration and real-time monitoring

---

**Built with ❤️ for modern agriculture**

Transform your farming with AgriSense - where technology meets agriculture for sustainable and profitable farming practices.
#   F y p  
 #   F y p  
 #   A g r i S e n s e  
 