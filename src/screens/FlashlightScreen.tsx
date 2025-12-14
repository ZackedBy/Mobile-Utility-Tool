import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { usePreferences } from '../context/PreferencesContext';

/**
 * ARCHITECTURE: Morse code encoding dictionary.
 * Maps alphanumeric characters (A-Z, 0-9) to their International Morse Code patterns.
 * Used by the text-to-Morse transmission feature to encode user input into
 * dot-dash sequences for flashlight signaling.
 */
const MORSE_CODE: { [key: string]: string } = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.',
  'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
  'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
  'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
  'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--',
  'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};

/**
 * ARCHITECTURE: Flashlight screen component implementing torch control and Morse code transmission.
 * 
 * HARDWARE PERMISSIONS: Uses expo-camera's useCameraPermissions hook to manage camera
 * permission state. Camera permission is required to access the device's torch/flashlight
 * hardware. Component handles permission request flow and displays appropriate UI states.
 * 
 * STATE MANAGEMENT: Manages multiple concurrent states (flashlight, SOS mode, Morse transmission)
 * using refs to prevent race conditions in async operations. Refs (sosActiveRef, morseActiveRef)
 * allow immediate cancellation of async loops without waiting for state updates.
 * 
 * ASYNC OPERATIONS: Implements complex async/await timing loops for SOS pattern and Morse code
 * transmission. User interaction is disabled during transmission to prevent state conflicts
 * and ensure accurate signal timing.
 * 
 * REQUIREMENT: Integrates with PreferencesContext to respect "Launch with Flashlight On" setting,
 * automatically enabling torch on mount if user preference is set.
 * 
 * @returns {JSX.Element} Flashlight control interface with SOS and Morse code features
 */
const FlashlightScreen: React.FC = () => {
  const theme = useTheme();
  const { launchWithFlashlightOn } = usePreferences();
  const [permission, requestPermission] = useCameraPermissions();
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [sosMode, setSosMode] = useState(false);
  const [morseText, setMorseText] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentChar, setCurrentChar] = useState<string | null>(null);
  const sosActiveRef = useRef<boolean>(false);
  const morseActiveRef = useRef<boolean>(false);
  const cameraRef = useRef<CameraView | null>(null);

  /**
   * ARCHITECTURE: Effect hook for permission initialization and cleanup.
   * 
   * HARDWARE PERMISSIONS: Automatically requests camera permission on mount if not yet requested.
   * 
   * CLEANUP: Cleanup function ensures all async operations (SOS, Morse) are terminated
   * and flashlight is turned off when component unmounts, preventing resource leaks and
   * ensuring torch doesn't remain on after navigation away from screen.
   */
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    return () => {
      // Stop SOS on unmount
      sosActiveRef.current = false;
      // Stop Morse transmission on unmount
      morseActiveRef.current = false;
      // Flashlight will be turned off by setting state
      setIsFlashlightOn(false);
    };
  }, [permission, requestPermission]);

  /**
   * ARCHITECTURE: Effect hook implementing "Launch with Flashlight On" preference.
   * 
   * REQUIREMENT: Monitors launchWithFlashlightOn preference from PreferencesContext.
   * When enabled and permission is granted, automatically enables torch on mount.
   * This fulfills the requirement for persistent user preference affecting app behavior.
   */
  useEffect(() => {
    if (launchWithFlashlightOn && permission?.granted) {
      setIsFlashlightOn(true);
    }
  }, [launchWithFlashlightOn, permission]);

  /**
   * HARDWARE PERMISSIONS: Async function to request camera permission from user.
   * 
   * ERROR HANDLING: Displays user-friendly alert if permission is denied, explaining
   * why camera access is required for flashlight functionality.
   * 
   * @returns {Promise<void>} Resolves when permission request completes
   */
  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to use the flashlight feature.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission.');
    }
  };

  /**
   * STATE MANAGEMENT: Toggle function for manual flashlight control.
   * 
   * CONCURRENCY CONTROL: Prevents manual toggling while SOS or Morse transmission
   * is active to avoid state conflicts. This ensures only one operation controls
   * the torch at a time, maintaining predictable behavior.
   * 
   * HARDWARE PERMISSIONS: Validates permission before attempting to toggle torch.
   */
  const toggleFlashlight = () => {
    if (!permission?.granted) {
      Alert.alert('Permission Required', 'Please grant camera permission to use the flashlight.');
      return;
    }

    // Disable manual toggle while SOS or Morse is active
    if (sosMode || isTransmitting) {
      return;
    }

    setIsFlashlightOn(prev => !prev);
  };

  /**
   * UTILITY: Promise-based delay function for precise timing control.
   * 
   * ASYNC OPERATIONS: Used extensively in SOS and Morse code transmission to create
   * accurate timing intervals. Essential for maintaining correct signal timing patterns.
   * 
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>} Resolves after specified delay
   */
  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  /**
   * ASYNC OPERATIONS: SOS pattern transmission using async/await timing loop.
   * 
   * PATTERN: Implements standard SOS pattern (3 short, 3 long, 3 short) with
   * precise timing: 200ms short flashes, 600ms long flashes, 200ms pauses between
   * elements, 800ms pause between pattern repetitions.
   * 
   * STATE MANAGEMENT: Uses sosActiveRef to allow immediate cancellation from any
   * async loop iteration. This ref-based approach prevents race conditions that could
   * occur with state-only cancellation.
   * 
   * CONCURRENCY: Stops any active Morse transmission before starting SOS to ensure
   * only one transmission mode is active at a time.
   * 
   * USER INTERACTION: Disables manual flashlight toggle during SOS to prevent conflicts.
   * 
   * @returns {Promise<void>} Resolves when SOS is stopped or completes
   */
  const startSOS = async () => {
    if (!permission?.granted) {
      Alert.alert('Permission Required', 'Please grant camera permission to use the flashlight.');
      return;
    }

    // Stop Morse transmission if active
    if (isTransmitting) {
      stopMorse();
    }

    setSosMode(true);
    sosActiveRef.current = true;

    const SHORT_FLASH = 200; // milliseconds for short flash (dot)
    const LONG_FLASH = 600; // milliseconds for long flash (dash)
    const PAUSE = 200; // pause between flashes
    const PATTERN_PAUSE = 800; // pause between SOS patterns

    while (sosActiveRef.current) {
      // 3 short flashes (dots)
      for (let i = 0; i < 3; i++) {
        if (!sosActiveRef.current) break;
        setIsFlashlightOn(true);
        await sleep(SHORT_FLASH);
        setIsFlashlightOn(false);
        if (i < 2) await sleep(PAUSE); // Don't pause after last dot
      }

      if (!sosActiveRef.current) break;
      await sleep(PAUSE * 2); // Pause between groups

      // 3 long flashes (dashes)
      for (let i = 0; i < 3; i++) {
        if (!sosActiveRef.current) break;
        setIsFlashlightOn(true);
        await sleep(LONG_FLASH);
        setIsFlashlightOn(false);
        if (i < 2) await sleep(PAUSE); // Don't pause after last dash
      }

      if (!sosActiveRef.current) break;
      await sleep(PAUSE * 2); // Pause between groups

      // 3 short flashes (dots) again
      for (let i = 0; i < 3; i++) {
        if (!sosActiveRef.current) break;
        setIsFlashlightOn(true);
        await sleep(SHORT_FLASH);
        setIsFlashlightOn(false);
        if (i < 2) await sleep(PAUSE); // Don't pause after last dot
      }

      if (!sosActiveRef.current) break;
      await sleep(PATTERN_PAUSE); // Pause before repeating pattern
    }

    // Turn off flashlight when SOS stops
    setIsFlashlightOn(false);
    setSosMode(false);
  };

  /**
   * STATE MANAGEMENT: Cancellation function for SOS pattern.
   * 
   * ASYNC OPERATIONS: Sets ref flag to false, which is checked in the async loop
   * to break execution. Immediately updates state to disable SOS mode and turn off
   * flashlight, providing instant user feedback.
   */
  const stopSOS = () => {
    sosActiveRef.current = false;
    setSosMode(false);
    setIsFlashlightOn(false);
  };

  const handleSOSToggle = () => {
    if (sosMode) {
      stopSOS();
    } else {
      startSOS();
    }
  };

  /**
   * ASYNC OPERATIONS: Public Morse code transmission function.
   * 
   * VALIDATION: Checks for non-empty input before transmission.
   * Delegates to transmitMorseWithText with current morseText state value.
   * 
   * @returns {Promise<void>} Resolves when transmission completes or is cancelled
   */
  const transmitMorse = async () => {
    if (!morseText.trim()) {
      Alert.alert('Empty Text', 'Please enter some text to transmit.');
      return;
    }
    await transmitMorseWithText(morseText);
  };

  /**
   * ASYNC OPERATIONS: Core Morse code transmission implementation using async/await timing loop.
   * 
   * TIMING SPECIFICATION: Implements International Morse Code timing standards:
   * - Dot: 200ms (1 time unit)
   * - Dash: 600ms (3 time units)
   * - Gap between parts: 200ms (1 time unit)
   * - Gap between letters: 600ms (3 time units)
   * - Gap between words: 1400ms (7 time units)
   * 
   * ASYNC LOOP ARCHITECTURE: Iterates through words, characters, and Morse symbols
   * using nested async loops with await delays. Each iteration checks morseActiveRef
   * to allow immediate cancellation, preventing race conditions with state updates.
   * 
   * USER INTERACTION: Disables text input and manual controls during transmission
   * to prevent state conflicts. Visual feedback shows current character being transmitted.
   * 
   * ERROR HANDLING: Gracefully handles characters not in dictionary by skipping them
   * with appropriate pause timing, ensuring transmission continues smoothly.
   * 
   * CONCURRENCY: Stops any active SOS before starting Morse transmission.
   * 
   * @param {string} textToTransmit - Text to encode and transmit via flashlight
   * @returns {Promise<void>} Resolves when transmission completes or is cancelled
   */
  const transmitMorseWithText = async (textToTransmit: string) => {
    if (!permission?.granted) {
      Alert.alert('Permission Required', 'Please grant camera permission to use the flashlight.');
      return;
    }

    if (!textToTransmit.trim()) {
      Alert.alert('Empty Text', 'Please enter some text to transmit.');
      return;
    }

    // Stop SOS if active
    if (sosMode) {
      stopSOS();
    }

    setIsTransmitting(true);
    morseActiveRef.current = true;
    setCurrentChar(null);

    const T = 200; // Base time unit in milliseconds
    const DOT_DURATION = T;
    const DASH_DURATION = 3 * T;
    const PAUSE_PARTS = T; // Pause between parts of a letter
    const PAUSE_LETTERS = 3 * T; // Pause between letters
    const PAUSE_WORDS = 7 * T; // Pause between words

    const text = textToTransmit.toUpperCase().trim();
    const words = text.split(/\s+/);

    try {
      for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
        if (!morseActiveRef.current) break;

        const word = words[wordIndex];
        const chars = word.split('');

        for (let charIndex = 0; charIndex < chars.length; charIndex++) {
          if (!morseActiveRef.current) break;

          const char = chars[charIndex];
          const pattern = MORSE_CODE[char];

          if (pattern) {
            setCurrentChar(`${char} (${pattern})`);

            // Transmit each dot or dash in the pattern
            for (let i = 0; i < pattern.length; i++) {
              if (!morseActiveRef.current) break;

              const symbol = pattern[i];
              const duration = symbol === '.' ? DOT_DURATION : DASH_DURATION;

              // Turn on flashlight
              setIsFlashlightOn(true);
              await sleep(duration);

              // Turn off flashlight
              setIsFlashlightOn(false);

              // Pause between parts of the letter (except after last symbol)
              if (i < pattern.length - 1) {
                await sleep(PAUSE_PARTS);
              }
            }

            // Pause between letters (except after last letter of word)
            if (charIndex < chars.length - 1) {
              await sleep(PAUSE_LETTERS);
            }
          } else {
            // Skip characters not in dictionary
            setCurrentChar(`${char} (ignored)`);
            await sleep(PAUSE_LETTERS);
          }
        }

        // Pause between words (except after last word)
        if (wordIndex < words.length - 1) {
          setCurrentChar('(space)');
          await sleep(PAUSE_WORDS);
        }
      }
    } catch (error) {
      console.error('Error transmitting Morse code:', error);
    } finally {
      // Turn off flashlight and reset state
      setIsFlashlightOn(false);
      setIsTransmitting(false);
      setCurrentChar(null);
      morseActiveRef.current = false;
    }
  };

  /**
   * STATE MANAGEMENT: Cancellation function for Morse code transmission.
   * 
   * ASYNC OPERATIONS: Sets morseActiveRef to false, which breaks the async transmission
   * loop at the next iteration check. Immediately resets all transmission-related state
   * and turns off flashlight for instant user feedback.
   */
  const stopMorse = () => {
    morseActiveRef.current = false;
    setIsTransmitting(false);
    setIsFlashlightOn(false);
    setCurrentChar(null);
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Card style={styles.card}>
          <Card.Content>
            <Text>Requesting camera permission...</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Card style={styles.card}>
          <Card.Content style={styles.content}>
            <Text variant="headlineMedium" style={styles.title}>
              Camera Permission Required
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              Please grant camera permission to use the flashlight feature.
            </Text>
            <Button
              mode="contained"
              onPress={handleRequestPermission}
              style={styles.button}
            >
              Grant Permission
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Hidden camera for torch control */}
      <CameraView
        ref={cameraRef}
        style={styles.hiddenCamera}
        facing="back"
        enableTorch={isFlashlightOn}
      />

      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
            Flashlight
          </Text>

          <View style={styles.powerButtonContainer}>
            <Button
              mode="contained"
              onPress={toggleFlashlight}
              disabled={sosMode || isTransmitting}
              style={[
                styles.powerButton,
                {
                  backgroundColor: isFlashlightOn
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
                  opacity: sosMode || isTransmitting ? 0.5 : 1,
                },
              ]}
              contentStyle={styles.powerButtonContent}
              labelStyle={styles.powerButtonLabel}
            >
              {isFlashlightOn ? 'ON' : 'OFF'}
            </Button>
          </View>

          {/* SOS Button */}
          <View style={styles.sosContainer}>
            <Button
              mode={sosMode ? 'contained' : 'outlined'}
              onPress={handleSOSToggle}
              disabled={isTransmitting}
              style={[
                styles.sosButton,
                {
                  backgroundColor: sosMode ? '#d32f2f' : 'transparent',
                  borderColor: '#d32f2f',
                  opacity: isTransmitting ? 0.5 : 1,
                },
              ]}
              labelStyle={[
                styles.sosButtonLabel,
                { color: sosMode ? '#ffffff' : '#d32f2f' },
              ]}
            >
              {sosMode ? 'STOP SOS' : 'SOS'}
            </Button>
            {sosMode && (
              <Text variant="bodySmall" style={styles.sosHint}>
                SOS pattern active - Manual controls disabled
              </Text>
            )}
          </View>

          {/* Morse Code Section */}
          <View style={styles.morseContainer}>
            <Text variant="titleLarge" style={[styles.morseTitle, { color: theme.colors.primary }]}>
              Text to Morse
            </Text>

            <TextInput
              label="Enter Message"
              value={morseText}
              onChangeText={setMorseText}
              mode="outlined"
              style={styles.morseInput}
              disabled={isTransmitting}
              placeholder="Type A-Z or 0-9"
              autoCapitalize="characters"
            />

            <View style={styles.morseButtons}>
              <Button
                mode="contained"
                onPress={() => {
                  transmitMorseWithText('SOS');
                }}
                disabled={isTransmitting || sosMode}
                style={[
                  styles.morseButton,
                  { 
                    opacity: isTransmitting || sosMode ? 0.5 : 1,
                    backgroundColor: '#d32f2f',
                  },
                ]}
                labelStyle={{ color: '#ffffff' }}
              >
                Transmit SOS
              </Button>

              <Button
                mode="contained"
                onPress={transmitMorse}
                disabled={isTransmitting || !morseText.trim() || sosMode}
                style={[
                  styles.morseButton,
                  { opacity: isTransmitting || sosMode ? 0.5 : 1 },
                ]}
              >
                Transmit Text
              </Button>
            </View>

            {isTransmitting && (
              <View style={styles.morseCancelContainer}>
                <Button
                  mode="outlined"
                  onPress={stopMorse}
                  style={[styles.cancelButton]}
                  labelStyle={{ color: '#d32f2f' }}
                >
                  Cancel
                </Button>
              </View>
            )}

            {isTransmitting && currentChar && (
              <View style={styles.currentCharContainer}>
                <Text variant="titleLarge" style={[styles.currentCharText, { color: theme.colors.primary }]}>
                  Sending: {currentChar}
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
  powerButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 32,
  },
  powerButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerButtonContent: {
    height: 200,
    paddingVertical: 0,
  },
  powerButtonLabel: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
    paddingVertical: 0,
    marginVertical: 0,
  },
  hiddenCamera: {
    width: 1,
    height: 1,
    position: 'absolute',
    opacity: 0,
  },
  description: {
    marginVertical: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
  },
  sosContainer: {
    width: '100%',
    marginTop: 24,
    alignItems: 'center',
  },
  sosButton: {
    minWidth: 150,
    borderWidth: 2,
  },
  sosButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sosHint: {
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#d32f2f',
  },
  morseContainer: {
    width: '100%',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  morseTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  morseInput: {
    marginBottom: 16,
    width: '100%',
  },
  morseButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  morseButton: {
    minWidth: 120,
    marginHorizontal: 6,
    marginVertical: 4,
  },
  morseCancelContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButton: {
    minWidth: 150,
    borderColor: '#d32f2f',
  },
  currentCharContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(98, 0, 238, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  currentCharText: {
    fontWeight: 'bold',
    fontSize: 20,
  },
});

export default FlashlightScreen;

