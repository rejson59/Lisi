// ============================================================
// Alarm Overlay - Ekran budzenia Lisi
// Wyświetla się gdy budzik dzwoni
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Vibration,
} from 'react-native';
import type { Alarm } from '../../../shared/src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AlarmOverlayProps {
  alarm: Alarm;
  volume: number;           // 0-1, aktualna głośność
  attempts: number;         // Ile prób wybudzenia
  onConfirmWakeUp: () => void;
  onSnooze: () => void;
}

export function AlarmOverlay({
  alarm,
  volume,
  attempts,
  onConfirmWakeUp,
  onSnooze,
}: AlarmOverlayProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const foxBounce = useRef(new Animated.Value(0)).current;
  const [currentTime, setCurrentTime] = useState('');

  // Animacja pulsowania
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    // Animacja lisa
    Animated.loop(
      Animated.sequence([
        Animated.timing(foxBounce, { toValue: -20, duration: 400, useNativeDriver: true }),
        Animated.timing(foxBounce, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();

    // Wibracja
    const vibrateInterval = setInterval(() => {
      Vibration.vibrate([500, 500, 500]);
    }, 2000);

    // Aktualizuj godzinę
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      }));
    }, 1000);

    return () => {
      clearInterval(vibrateInterval);
      clearInterval(timeInterval);
      Vibration.cancel();
    };
  }, []);

  // Wiadomości w zależności od liczby prób
  const getMessage = () => {
    if (attempts < 3) return 'Pora wstawać~ 🌅';
    if (attempts < 6) return 'Hej! Obudź się! 😊';
    if (attempts < 10) return 'Proszę, wstawaj! Już późno! ⏰';
    if (attempts < 15) return 'Lisi się martwi! Obudź się! 😿';
    return 'WSTAWAJ! Nie dam spokoju! 🔥';
  };

  const volumePercent = Math.round(volume * 100);

  return (
    <View style={styles.container}>
      {/* Tło z gradientem */}
      <View style={styles.background} />
      
      {/* Godzina */}
      <Text style={styles.time}>{currentTime}</Text>
      <Text style={styles.alarmLabel}>{alarm.label}</Text>

      {/* Animowany lis */}
      <Animated.View
        style={[
          styles.foxContainer,
          {
            transform: [
              { scale: pulseAnim },
              { translateY: foxBounce },
            ],
          },
        ]}
      >
        <Text style={styles.foxEmoji}>🦊</Text>
      </Animated.View>

      {/* Wiadomość */}
      <Text style={styles.message}>{getMessage()}</Text>

      {/* Głośność */}
      <View style={styles.volumeContainer}>
        <Text style={styles.volumeLabel}>🔊 Głośność</Text>
        <View style={styles.volumeBar}>
          <View style={[styles.volumeFill, { width: `${volumePercent}%` }]} />
        </View>
        <Text style={styles.volumeText}>{volumePercent}%</Text>
      </View>

      {/* Przyciski */}
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.snoozeBtn} onPress={onSnooze}>
          <Text style={styles.snoozeBtnText}>💤 Drzemka</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.wakeUpBtn} onPress={onConfirmWakeUp}>
          <Text style={styles.wakeUpBtnText}>☀️ Wstałem!</Text>
        </TouchableOpacity>
      </View>

      {/* Informacja */}
      <Text style={styles.info}>
        {attempts > 0 ? `Próba ${attempts} • Głośność rośnie...` : 'Lisi Cię budzi~'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f0f19',
  },
  time: {
    fontSize: 72,
    fontWeight: '200',
    color: '#ff9a56',
    marginBottom: 8,
  },
  alarmLabel: {
    fontSize: 18,
    color: '#a0a0b8',
    marginBottom: 40,
  },
  foxContainer: {
    marginBottom: 32,
  },
  foxEmoji: {
    fontSize: 100,
  },
  message: {
    fontSize: 22,
    fontWeight: '600',
    color: '#e8e8f0',
    textAlign: 'center',
    marginBottom: 32,
  },
  volumeContainer: {
    width: '100%',
    marginBottom: 40,
  },
  volumeLabel: {
    fontSize: 14,
    color: '#a0a0b8',
    marginBottom: 8,
    textAlign: 'center',
  },
  volumeBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#ff6b9d',
    borderRadius: 4,
  },
  volumeText: {
    fontSize: 12,
    color: '#606078',
    textAlign: 'center',
    marginTop: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  snoozeBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  snoozeBtnText: {
    color: '#a0a0b8',
    fontSize: 16,
    fontWeight: '600',
  },
  wakeUpBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#ff6b9d',
    alignItems: 'center',
  },
  wakeUpBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    fontSize: 12,
    color: '#606078',
    marginTop: 24,
  },
});
