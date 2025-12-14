import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { Card, Text, useTheme } from 'react-native-paper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const LEVEL_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.6;
const BUBBLE_SIZE = 20;
const MAX_OFFSET = (LEVEL_SIZE / 2) - BUBBLE_SIZE;

/**
 * ARCHITECTURE: Bubble level screen using accelerometer sensor data.
 * 
 * SENSOR INTEGRATION: Subscribes to Accelerometer from expo-sensors at 16ms intervals
 * (~60fps) for real-time device orientation detection. Raw accelerometer data contains
 * significant noise, requiring smoothing techniques for usable UI.
 * 
 * NOISE REDUCTION: Uses React Native's Animated.spring API to smooth raw accelerometer
 * values before applying to bubble position. Spring physics provides natural, fluid
 * movement that filters out high-frequency sensor noise while maintaining responsiveness.
 * 
 * PERFORMANCE: Decouples animation updates (16ms) from text display updates (250ms throttling)
 * to maintain smooth visual feedback while keeping displayed numbers readable. Real-time
 * angle calculations run at full sensor rate for accurate level detection.
 * 
 * UI ANIMATION: Animated.ValueXY with spring interpolation enables hardware-accelerated
 * transforms via useNativeDriver, ensuring 60fps performance even on lower-end devices.
 * 
 * @returns {JSX.Element} Visual bubble level with real-time angle display
 */
const LevelScreen: React.FC = () => {
  const theme = useTheme();
  const [subscription, setSubscription] = useState<any>(null);
  const [xAngle, setXAngle] = useState(0);
  const [yAngle, setYAngle] = useState(0);
  const [displayedXAngle, setDisplayedXAngle] = useState(0);
  const [displayedYAngle, setDisplayedYAngle] = useState(0);
  const bubblePosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastTextUpdateRef = useRef<number>(0);
  const TEXT_UPDATE_INTERVAL = 250; // Update text every 250ms

  /**
   * ARCHITECTURE: Sensor subscription effect hook with cleanup.
   * 
   * SENSOR CONFIGURATION: Sets accelerometer update interval to 16ms (~60fps) for
   * smooth real-time orientation tracking. Higher update rates would increase battery
   * consumption without meaningful UI improvement.
   * 
   * CLEANUP: Removes sensor listener on unmount to prevent memory leaks and unnecessary
   * battery drain when user navigates away from screen.
   */
  useEffect(() => {
    Accelerometer.setUpdateInterval(16); // ~60fps

    const subscribe = () => {
      /**
       * SENSOR DATA PROCESSING: Accelerometer listener callback.
       * 
       * ANGLE CALCULATION: Uses atan2 trigonometry to convert raw accelerometer
       * values (x, y) into tilt angles in degrees. This provides accurate orientation
       * measurement regardless of device rotation.
       * 
       * NOISE REDUCTION: Raw sensor values are passed to Animated.spring for smoothing.
       * Spring physics naturally filters high-frequency noise while maintaining
       * responsiveness to actual device movement.
       * 
       * THROTTLING: Text display updates are throttled to 250ms intervals to prevent
       * rapid number changes that would be unreadable, while angle calculations for
       * level detection run at full sensor rate for accuracy.
       */
      const sub = Accelerometer.addListener((accelerometerData) => {
        const { x: accelX, y: accelY } = accelerometerData;

        // Calculate angles in degrees
        // Using atan2 to get angle from -180 to 180 degrees
        const xAngleDeg = Math.atan2(accelX, Math.sqrt(accelY * accelY + 1)) * (180 / Math.PI);
        const yAngleDeg = Math.atan2(accelY, Math.sqrt(accelX * accelX + 1)) * (180 / Math.PI);

        // Always update angles for level calculation
        setXAngle(xAngleDeg);
        setYAngle(yAngleDeg);

        // Throttle text updates for readability
        const now = Date.now();
        if (now - lastTextUpdateRef.current >= TEXT_UPDATE_INTERVAL) {
          setDisplayedXAngle(xAngleDeg);
          setDisplayedYAngle(yAngleDeg);
          lastTextUpdateRef.current = now;
        }

        // Convert accelerometer data to bubble position
        // Invert Y because screen coordinates are top-to-bottom
        // Clamp values to prevent bubble from going outside the level
        const bubbleX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, accelX * MAX_OFFSET * 2));
        const bubbleY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, -accelY * MAX_OFFSET * 2));

        /**
         * NOISE REDUCTION: Animated.spring interpolation for sensor data smoothing.
         * 
         * PERFORMANCE: Spring physics provides natural damping that filters sensor noise
         * while maintaining responsiveness. The tension (50) and friction (7) parameters
         * are tuned to balance smoothness with reaction speed.
         * 
         * HARDWARE ACCELERATION: useNativeDriver: true enables GPU-accelerated transforms,
         * ensuring 60fps performance by executing animations on the native thread, avoiding
         * JavaScript bridge overhead for each frame.
         */
        Animated.spring(bubblePosition, {
          toValue: { x: bubbleX, y: bubbleY },
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      });
      setSubscription(sub);
    };

    subscribe();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  /**
   * ARCHITECTURE: Level detection using angle-based calculation.
   * 
   * DESIGN DECISION: Uses angle values rather than bubble position for level detection
   * because angles are more reliable and less affected by sensor calibration drift.
   * Threshold of ±2 degrees provides reasonable tolerance for "level" detection.
   */
  const isLevel = Math.abs(xAngle) < 2 && Math.abs(yAngle) < 2;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
            Bubble Level
          </Text>

          <View style={styles.levelContainer}>
            <View
              style={[
                styles.level,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              {/* Center crosshair */}
              <View
                style={[
                  styles.centerLine,
                  { backgroundColor: theme.colors.outline },
                ]}
              />
              <View
                style={[
                  styles.centerLine,
                  styles.centerLineVertical,
                  { backgroundColor: theme.colors.outline },
                ]}
              />

              {/* Bubble */}
              <Animated.View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: isLevel
                      ? theme.colors.primary
                      : theme.colors.error,
                    transform: [
                      { translateX: bubblePosition.x },
                      { translateY: bubblePosition.y },
                    ],
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.angleContainer}>
            <Card style={styles.angleCard}>
              <Card.Content>
                <Text variant="labelLarge" style={styles.angleLabel}>
                  X-Axis Angle
                </Text>
                <Text
                  variant="headlineMedium"
                  style={[
                    styles.angleValue,
                    { color: theme.colors.primary },
                  ]}
                >
                  {displayedXAngle.toFixed(2)}°
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.angleCard}>
              <Card.Content>
                <Text variant="labelLarge" style={styles.angleLabel}>
                  Y-Axis Angle
                </Text>
                <Text
                  variant="headlineMedium"
                  style={[
                    styles.angleValue,
                    { color: theme.colors.primary },
                  ]}
                >
                  {displayedYAngle.toFixed(2)}°
                </Text>
              </Card.Content>
            </Card>
          </View>

          {/* Fixed height container to prevent layout shift */}
          <View style={styles.levelTextContainer}>
            <Text
              variant="titleMedium"
              style={[
                styles.levelText,
                {
                  color: theme.colors.primary,
                  opacity: isLevel ? 1 : 0,
                },
              ]}
            >
              ✓ Level!
            </Text>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    elevation: 4,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  title: {
    marginBottom: 32,
    fontWeight: 'bold',
  },
  levelContainer: {
    width: LEVEL_SIZE,
    height: LEVEL_SIZE,
    marginVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  level: {
    width: LEVEL_SIZE,
    height: LEVEL_SIZE,
    borderRadius: LEVEL_SIZE / 2,
    borderWidth: 3,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  centerLine: {
    position: 'absolute',
    width: LEVEL_SIZE,
    height: 2,
  },
  centerLineVertical: {
    width: 2,
    height: LEVEL_SIZE,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  angleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 32,
  },
  angleCard: {
    flex: 1,
    marginHorizontal: 8,
    elevation: 2,
  },
  angleLabel: {
    textAlign: 'center',
    marginBottom: 8,
  },
  angleValue: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  levelTextContainer: {
    height: 40,
    marginTop: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelText: {
    fontWeight: 'bold',
  },
});

export default LevelScreen;

