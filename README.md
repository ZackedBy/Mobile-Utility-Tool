# Utility Tool App

A modern React Native mobile application combining Flashlight and Bubble Level utilities, built with Expo and TypeScript.

## Features

### 🔦 Flashlight
- Toggle flashlight on/off with a large, intuitive button
- Strobe mode with adjustable interval (100ms - 2000ms)
- Graceful camera permission handling
- Option to launch with flashlight automatically enabled

### 📐 Bubble Level
- Real-time bubble level using device accelerometer
- Visual bubble indicator that moves based on device tilt
- Display of X and Y axis angles in degrees
- Color-coded feedback (green when level, red when tilted)

### ⚙️ Settings
- **Dark Mode Toggle**: Switch between light and dark themes
- **Launch Preferences**: Toggle "Launch with Flashlight On"
- **Feedback Form**: Send feedback to backend API
- All preferences are persisted locally using AsyncStorage

## Tech Stack

- **Framework**: React Native with Expo (Managed Workflow)
- **Language**: TypeScript
- **UI Library**: React Native Paper (Material 3 Design)
- **Navigation**: React Navigation (Bottom Tabs)
- **State Management**: React Context API
- **Storage**: AsyncStorage
- **Device Features**:
  - `expo-camera` for flashlight/torch functionality
  - `expo-sensors` for accelerometer data

## Project Structure

```
utility-tool-app/
├── App.tsx                    # Main app entry with navigation
├── src/
│   ├── context/
│   │   └── PreferencesContext.tsx  # Global state management
│   └── screens/
│       ├── FlashlightScreen.tsx   # Flashlight functionality
│       ├── LevelScreen.tsx         # Bubble level with accelerometer
│       └── SettingsScreen.tsx     # Settings and feedback form
├── package.json
├── tsconfig.json
└── app.json
```

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Run on your device:**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your physical device

## Requirements Fulfilled

✅ **Modern UI**: React Native Paper with Material 3 design, supporting dark/light mode  
✅ **Navigation**: Bottom Tab Navigator with 3 screens  
✅ **Device Features**: Camera (flashlight) and Accelerometer (level)  
✅ **Local Storage**: AsyncStorage for persisting user preferences  
✅ **Backend Connection**: Feedback form sends POST request to JSONPlaceholder API  
✅ **State Management**: React Context API for global theme and preferences  
✅ **TypeScript**: Full TypeScript implementation  
✅ **Error Handling**: Graceful permission handling and API error management  

## Key Implementation Details

### State Management
- `PreferencesContext` manages:
  - Dark/Light mode theme
  - Launch with flashlight preference
  - All preferences persisted to AsyncStorage

### Flashlight Screen
- Uses `expo-camera` Camera component for torch control
- Hidden camera view for torch API access
- Strobe mode with configurable interval
- Respects "Launch with Flashlight On" preference

### Level Screen
- Uses `expo-sensors` Accelerometer
- Converts accelerometer data to bubble position
- Calculates and displays X/Y axis angles
- Visual feedback with color-coded bubble

### Settings Screen
- Toggle switches for preferences (saved to AsyncStorage)
- Feedback form with loading states
- POST request to `https://jsonplaceholder.typicode.com/posts`
- Success/Error Snackbar notifications

## API Integration

The feedback form sends data to:
```
POST https://jsonplaceholder.typicode.com/posts
Content-Type: application/json

{
  "title": "User Feedback",
  "body": "<user feedback text>",
  "userId": 1
}
```

## Permissions

- **Camera**: Required for flashlight functionality
- **Accelerometer**: Automatically available, no permission needed

## Development Notes

- All preferences are automatically saved to AsyncStorage
- Theme changes apply immediately across the app
- Flashlight automatically turns off when app closes
- Accelerometer updates at ~60fps for smooth bubble movement

## License

Created for educational purposes as part of a university mobile app development project.

