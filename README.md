# 🛠️ Utility Tool App

A professional-grade mobile utility application combining a **Flashlight**, **Bubble Level**, and **Compass**. Built with React Native (Expo), TypeScript, and Material Design 3.

> **Course Project:** Mobile App Development (TUNI)
> **Grade Target:** 3/3 (Advanced Features Implemented)

## ✨ Features

### 🔦 Smart Flashlight & Morse Transmitter

- **Tactical Toggle:** Large, responsive power button with haptic feedback.
- **Text-to-Morse Code:** Type any text, and the flashlight transmits it via Morse code signals automatically.
- **Visual Feedback:** Real-time display of the character being transmitted.
- **Strobe Mode:** Adjustable blinking frequency (100ms - 2000ms).
- **Smart Launch:** Option to automatically turn on the flashlight when the app opens.

### 📐 Precision Bubble Level

- **Smooth Physics:** Uses `Animated.spring` API to interpolate raw accelerometer data for fluid, jitter-free movement.
- **Visual Interface:** Material Design bubble indicator with X/Y axis degree readout.
- **Calibration:** Color-coded feedback (Turns Green when perfectly level).

### 🧭 Digital Compass

- **Real-time Heading:** Uses device Magnetometer to display magnetic heading (0-360°).
- **Classic Navigation UI:** Professional design adhering to standard color codes (Red North, Dark Contrast).
- **Cardinal Directions:** Clear display of direction (N, NE, E, SE, etc.).

### ⚙️ Settings & Architecture

- **Theming:** Dynamic Dark/Light mode support using React Native Paper.
- **Persistence:** All user preferences (Theme, Launch Settings) saved via `AsyncStorage`.
- **Feedback System:** Integrated form sending POST requests to a backend API.

---

## 🏗️ Tech Stack

- **Core:** React Native (Expo SDK 52), TypeScript
- **UI Library:** React Native Paper (Material Design 3)
- **Navigation:** React Navigation (Bottom Tabs)
- **State Management:** React Context API + Hooks
- **Storage:** `@react-native-async-storage/async-storage`
- **Sensors & Hardware:**
  - `expo-camera` (Torch/Flashlight)
  - `expo-sensors` (Accelerometer & Magnetometer)
  - `expo-haptics` (Tactile feedback)

---

## 📂 Project Structure

```text
utility-tool-app/
├── App.tsx                     # Application Entry & Navigation Setup
├── app.json                    # Expo Configuration
├── src/
│   ├── context/
│   │   └── PreferencesContext.tsx  # Global State (Theme, Settings)
│   ├── screens/
│   │   ├── FlashlightScreen.tsx    # Torch control & Morse Logic
│   │   ├── LevelScreen.tsx         # Accelerometer with Animation
│   │   ├── CompassScreen.tsx       # Magnetometer Logic
│   │   └── SettingsScreen.tsx      # Preferences & API Form
│   └── utils/
│       └── morseDictionary.ts      # (Optional) Helper for Morse translation
└── assets/                         # Icons and Splash screens

🚀 Installation & Setup
Clone the repository:

Bash

git clone [https://github.com/ZackedBy/Mobile-Utility-Tool.git](https://github.com/ZackedBy/Mobile-Utility-Tool.git)
cd Mobile-Utility-Tool
Install dependencies:

Bash

npm install
Start the app:

Bash

npx expo start --tunnel
(Note: Using --tunnel is recommended for stable connection)

Run on Device:

Scan the QR code with Expo Go (Android/iOS).

✅ Requirements Fulfilled (Grading Criteria)
This project meets all criteria for the highest grade (3/3):

Modern UI: Implemented Material 3 Design with consistent theming and professional color palette (#0B2B5B).

Complex Navigation: Bottom Tab Navigator managing 4 distinct screens.

Advanced Device Features: Simultaneous use of Camera, Accelerometer, and Magnetometer.

Robust Logic: Custom algorithms for Morse Code timing and Sensor data interpolation.

Backend Integration: Functional Feedback form connecting to JSONPlaceholder API.

Local Storage: Persisting user preferences across app restarts.

State Management: Clean Context API implementation avoiding prop-drilling.

📝 License
Created for educational purposes.
```
