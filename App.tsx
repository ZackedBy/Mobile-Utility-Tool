import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PreferencesProvider, usePreferences } from './src/context/PreferencesContext';
import FlashlightScreen from './src/screens/FlashlightScreen';
import LevelScreen from './src/screens/LevelScreen';
import CompassScreen from './src/screens/CompassScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

/**
 * ARCHITECTURE: Brand primary color constant for consistent theming across the application.
 * Using a centralized constant ensures all navigation headers, active tab indicators, and
 * primary buttons maintain visual consistency with the Deep Engineering Blue branding.
 */
const BRAND_PRIMARY = '#0B2B5B';

/**
 * ARCHITECTURE: Material Design 3 light theme configuration.
 * Extends MD3LightTheme with custom brand colors while preserving all Material Design
 * system defaults for consistent UI component styling.
 */
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: BRAND_PRIMARY,
    secondary: '#03dac4',
  },
};

/**
 * ARCHITECTURE: Material Design 3 dark theme configuration.
 * Maintains brand consistency across light/dark modes by using the same primary color,
 * ensuring the Deep Engineering Blue branding is preserved in both themes.
 */
const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: BRAND_PRIMARY,
    secondary: '#03dac4',
  },
};

/**
 * ARCHITECTURE: Main navigation component implementing Bottom Tab Navigator pattern.
 * 
 * DESIGN DECISION: BottomTabNavigator chosen for flat navigation hierarchy, providing
 * immediate access to all four utility screens without nested navigation complexity.
 * This pattern is optimal for utility apps where users frequently switch between tools.
 * 
 * STATE MANAGEMENT: Consumes PreferencesContext to reactively update theme based on
 * user's dark mode preference, ensuring theme changes propagate immediately.
 * 
 * @returns {JSX.Element} Navigation container with themed bottom tabs and headers
 */
const AppNavigator: React.FC = () => {
  const { isDarkMode } = usePreferences();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof MaterialCommunityIcons.glyphMap;

              if (route.name === 'Flashlight') {
                iconName = focused ? 'flashlight' : 'flashlight-off';
              } else if (route.name === 'Level') {
                iconName = focused ? 'spirit-level' : 'spirit-level';
              } else if (route.name === 'Compass') {
                iconName = focused ? 'compass' : 'compass-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'cog' : 'cog-outline';
              } else {
                iconName = 'help';
              }

              return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: BRAND_PRIMARY,
            tabBarInactiveTintColor: '#9E9E9E', // Gray for inactive tabs
            headerStyle: {
              backgroundColor: BRAND_PRIMARY,
            },
            headerTintColor: '#FFFFFF', // White text on dark blue header
            headerTitleStyle: {
              fontWeight: 'bold',
              color: '#FFFFFF',
            },
            tabBarStyle: {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.outline,
            },
          })}
        >
          <Tab.Screen
            name="Flashlight"
            component={FlashlightScreen}
            options={{
              title: 'Flashlight',
            }}
          />
          <Tab.Screen
            name="Level"
            component={LevelScreen}
            options={{
              title: 'Level',
            }}
          />
          <Tab.Screen
            name="Compass"
            component={CompassScreen}
            options={{
              title: 'Compass',
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

/**
 * ARCHITECTURE: Root application component implementing Context API pattern.
 * 
 * STATE MANAGEMENT: Wraps entire app with PreferencesProvider to enable global state
 * access for theme preferences and user settings, avoiding prop drilling through
 * component tree.
 * 
 * REQUIREMENT: StatusBar set to 'light' style to ensure white text is visible against
 * the dark blue (#0B2B5B) navigation header background.
 * 
 * @returns {JSX.Element} Application root with context providers and navigation
 */
const App: React.FC = () => {
  return (
    <PreferencesProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </PreferencesProvider>
  );
};

export default App;

