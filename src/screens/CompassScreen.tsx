import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import { Card, Text, useTheme } from 'react-native-paper';

// Haptic feedback (optional)
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  // Haptics not available
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH * 0.8, 300);
const CENTER = COMPASS_SIZE / 2;

/**
 * ARCHITECTURE: Compass screen using magnetometer sensor for heading detection.
 * 
 * SENSOR INTEGRATION: Subscribes to Magnetometer from expo-sensors at 16ms intervals
 * (~60fps) for real-time magnetic heading calculation. Raw magnetometer data is converted
 * to 0-360 degree heading using atan2 trigonometry.
 * 
 * ROTATION INTERPOLATION: Implements shortest-path interpolation algorithm to prevent
 * compass from rotating the "long way" around when crossing North (0°/360° boundary).
 * Uses cumulative rotation value that can exceed 360° for smooth continuous rotation
 * in both directions.
 * 
 * UI ANIMATION: Animated.timing with wide interpolation range enables smooth rotation
 * animations. Hardware-accelerated via useNativeDriver for 60fps performance.
 * 
 * HAPTIC FEEDBACK: Provides tactile feedback when compass aligns with North (within
 * ±5° tolerance) using expo-haptics, enhancing user experience with physical confirmation.
 * 
 * PERFORMANCE: Throttles text display updates to 250ms while maintaining 16ms animation
 * updates, ensuring readable numbers with smooth visual rotation.
 * 
 * @returns {JSX.Element} Rotating compass dial with heading display
 */
const CompassScreen: React.FC = () => {
  const theme = useTheme();
  const [subscription, setSubscription] = useState<any>(null);
  const [heading, setHeading] = useState(0);
  const [displayedHeading, setDisplayedHeading] = useState(0);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const previousAngleRef = useRef<number>(0);
  const cumulativeRotationRef = useRef<number>(0);
  const lastTextUpdateRef = useRef<number>(0);
  const lastNorthHapticRef = useRef<number>(0);
  const TEXT_UPDATE_INTERVAL = 250; // Update text every 250ms
  const NORTH_TOLERANCE = 5; // Degrees tolerance for North detection

  /**
   * ARCHITECTURE: Magnetometer subscription effect hook with rotation interpolation.
   * 
   * SENSOR CONFIGURATION: Sets update interval to 16ms (~60fps) for smooth compass
   * rotation animations. Higher rates would increase battery consumption without
   * meaningful visual improvement.
   * 
   * CLEANUP: Removes sensor listener on unmount to prevent memory leaks and battery drain.
   */
  useEffect(() => {
    Magnetometer.setUpdateInterval(16); // ~60fps for smooth animation

    const subscribe = () => {
      let isFirstUpdate = true;
      
      /**
       * SENSOR DATA PROCESSING: Magnetometer listener with shortest-path interpolation.
       * 
       * HEADING CALCULATION: Converts raw magnetometer (x, y) values to heading angle
       * using atan2, then normalizes to 0-360° range. Coordinate system adjustment (-y, x)
       * accounts for device orientation relative to magnetic field.
       * 
       * SHORTEST PATH INTERPOLATION: Calculates delta between current and previous angle,
       * normalizing to -180° to +180° range. If delta exceeds ±180°, adjusts by ±360° to
       * ensure compass always rotates the shortest path (e.g., 350° → 10° goes through 0°,
       * not 360°). Cumulative rotation value allows smooth continuous rotation beyond 360°.
       * 
       * UI ANIMATION: Animated.timing interpolates cumulative rotation value for smooth
       * visual rotation. Hardware-accelerated via useNativeDriver.
       * 
       * HAPTIC FEEDBACK: Triggers light haptic feedback when heading is within ±5° of North,
       * with 1-second debounce to prevent excessive vibration.
       * 
       * THROTTLING: Text display updates throttled to 250ms for readability while
       * maintaining real-time heading calculations for accurate direction display.
       */
      const sub = Magnetometer.addListener((magnetometerData) => {
        const { x, y } = magnetometerData;

        // Calculate heading in degrees (0-360)
        // Atan2 returns angle in radians, convert to degrees
        // Using -y and x to get correct orientation (magnetometer coordinate system)
        let angle = Math.atan2(-y, x) * (180 / Math.PI);
        
        // Convert from -180 to 180 range to 0 to 360 range
        angle = (angle + 360) % 360;
        
        // Always update heading for calculations
        setHeading(angle);

        // Throttle text updates for readability
        const now = Date.now();
        if (now - lastTextUpdateRef.current >= TEXT_UPDATE_INTERVAL) {
          setDisplayedHeading(angle);
          lastTextUpdateRef.current = now;
        }

        // Haptic feedback when hitting North (with debounce)
        const isNearNorth = angle <= NORTH_TOLERANCE || angle >= (360 - NORTH_TOLERANCE);
        if (isNearNorth && now - lastNorthHapticRef.current >= 1000 && Haptics) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          lastNorthHapticRef.current = now;
        }

        if (isFirstUpdate) {
          // Initialize on first update
          previousAngleRef.current = angle;
          cumulativeRotationRef.current = angle;
          rotateAnim.setValue(angle);
          isFirstUpdate = false;
          return;
        }

        /**
         * SHORTEST PATH INTERPOLATION: Algorithm to prevent long-way rotation.
         * 
         * ARCHITECTURE: Calculates angular difference and normalizes to shortest path.
         * If delta > 180°, subtracts 360°; if delta < -180°, adds 360°. This ensures
         * compass always rotates the shortest angular distance (e.g., 350° → 10° goes
         * through 0°, not 360°).
         * 
         * CUMULATIVE ROTATION: Maintains cumulative rotation value that can exceed 360°
         * to enable smooth continuous rotation in both directions without visual jumps.
         * 
         * UI ANIMATION: Animated.timing with 100ms duration provides smooth rotation
         * interpolation. Hardware-accelerated via useNativeDriver for optimal performance.
         */
        const previousAngle = previousAngleRef.current;
        let delta = angle - previousAngle;

        // Normalize delta to -180 to 180 range (shortest path)
        if (delta > 180) {
          delta -= 360;
        } else if (delta < -180) {
          delta += 360;
        }

        // Update cumulative rotation (allows values beyond 360 for continuous rotation)
        cumulativeRotationRef.current += delta;
        previousAngleRef.current = angle;

        // Animate to cumulative rotation value for smooth continuous rotation
        Animated.timing(rotateAnim, {
          toValue: cumulativeRotationRef.current,
          duration: 100,
          useNativeDriver: true,
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
   * UTILITY: Converts heading degrees to cardinal/intercardinal direction.
   * 
   * @param {number} degrees - Heading in degrees (0-360)
   * @returns {string} Cardinal or intercardinal direction (N, NE, E, SE, S, SW, W, NW)
   */
  const getDirection = (degrees: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  /**
   * UI ANIMATION: Transform style for compass dial rotation.
   * 
   * INTERPOLATION: Wide input range (-1080° to 1080°) with extrapolate: 'extend'
   * allows smooth continuous rotation in both directions without visual jumps when
   * cumulative rotation exceeds 360° boundaries.
   */
  const rotateStyle = {
    transform: [
      {
        rotate: rotateAnim.interpolate({
          inputRange: [-1080, -720, -360, 0, 360, 720, 1080],
          outputRange: ['-1080deg', '-720deg', '-360deg', '0deg', '360deg', '720deg', '1080deg'],
          extrapolate: 'extend',
        }),
      },
    ],
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
            Compass
          </Text>

          <View style={styles.compassContainer}>
            {/* Outer circle */}
            <View
              style={[
                styles.compassOuter,
                {
                  width: COMPASS_SIZE,
                  height: COMPASS_SIZE,
                  borderRadius: COMPASS_SIZE / 2,
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
            >
              {/* Rotating compass inner */}
              <Animated.View style={[styles.compassInner, rotateStyle]}>
                {/* North indicator (red - classic compass style) */}
                <View
                  style={[
                    styles.directionIndicator,
                    styles.northIndicator,
                    {
                      backgroundColor: theme.colors.error,
                      top: 10,
                    },
                  ]}
                >
                  <Text style={[styles.directionText, styles.northText, { color: theme.colors.onError }]}>N</Text>
                </View>

                {/* South indicator */}
                <View
                  style={[
                    styles.directionIndicator,
                    {
                      backgroundColor: theme.colors.primary,
                      bottom: 10,
                    },
                  ]}
                >
                  <Text style={styles.directionText}>S</Text>
                </View>

                {/* East indicator */}
                <View
                  style={[
                    styles.directionIndicator,
                    {
                      backgroundColor: theme.colors.secondary,
                      right: 10,
                    },
                  ]}
                >
                  <Text style={styles.directionText}>E</Text>
                </View>

                {/* West indicator */}
                <View
                  style={[
                    styles.directionIndicator,
                    {
                      backgroundColor: theme.colors.secondary,
                      left: 10,
                    },
                  ]}
                >
                  <Text style={styles.directionText}>W</Text>
                </View>

                {/* Center dot */}
                <View
                  style={[
                    styles.centerDot,
                    {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />

                {/* North-South line (red for North) */}
                <View
                  style={[
                    styles.directionLine,
                    styles.northLine,
                    { backgroundColor: theme.colors.error },
                  ]}
                />
                {/* East-West line */}
                <View
                  style={[
                    styles.directionLine,
                    styles.eastWestLine,
                    { backgroundColor: theme.colors.secondary },
                  ]}
                />
              </Animated.View>

              {/* Fixed center indicator (always points up) */}
              <View style={styles.fixedIndicator}>
                <View
                  style={[
                    styles.fixedArrow,
                    {
                      borderBottomColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Heading display */}
          <View style={styles.headingContainer}>
            <Card style={styles.headingCard}>
              <Card.Content>
                <Text variant="labelLarge" style={styles.headingLabel}>
                  Heading
                </Text>
                <Text
                  variant="headlineLarge"
                  style={[styles.headingValue, { color: theme.colors.primary }]}
                >
                  {Math.round(displayedHeading)}°
                </Text>
                <Text
                  variant="titleMedium"
                  style={[styles.directionValue, { color: theme.colors.secondary }]}
                >
                  {getDirection(displayedHeading)}
                </Text>
              </Card.Content>
            </Card>
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
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    marginVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassOuter: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 3,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  compassInner: {
    width: COMPASS_SIZE - 6,
    height: COMPASS_SIZE - 6,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionIndicator: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  northIndicator: {
    // Background color set inline with theme.colors.error
  },
  directionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  northText: {
    fontSize: 20,
    fontWeight: '900',
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
  },
  directionLine: {
    position: 'absolute',
  },
  northLine: {
    width: 3,
    height: COMPASS_SIZE / 2 - 45,
    top: 45,
    alignSelf: 'center',
  },
  eastWestLine: {
    width: COMPASS_SIZE / 2 - 45,
    height: 3,
    left: 45,
    alignSelf: 'center',
  },
  fixedIndicator: {
    position: 'absolute',
    top: CENTER - 20,
    alignSelf: 'center',
    zIndex: 10,
  },
  fixedArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  headingContainer: {
    width: '100%',
    marginTop: 32,
  },
  headingCard: {
    elevation: 2,
  },
  headingLabel: {
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  headingValue: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  directionValue: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default CompassScreen;

