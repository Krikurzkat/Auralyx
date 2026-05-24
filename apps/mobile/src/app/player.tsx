import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { usePlayerStore } from '../stores/playerStore';

export default function PlayerScreen() {
  const { currentTrack, isPlaying, togglePlayback, skipToNext, skipToPrevious } = usePlayerStore();

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.subText}>No track currently playing</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.playerContainer}>
        {/* Large Artwork Placeholder */}
        <View style={styles.artworkLarge}>
          <Text style={styles.artworkTextLarge}>♪</Text>
        </View>

        <View style={styles.trackInfoCenter}>
          <Text style={styles.trackTitleLarge} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.trackArtistLarge} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>

        {/* Playback Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity onPress={skipToPrevious} style={styles.controlButton}>
            <Text style={styles.controlText}>⏮</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlayback} style={styles.playButton}>
            <Text style={styles.playButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={skipToNext} style={styles.controlButton}>
            <Text style={styles.controlText}>⏭</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subText: {
    color: '#A0A0A0',
    fontSize: 16,
  },
  playerContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkLarge: {
    width: 300,
    height: 300,
    backgroundColor: '#222',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#E8470A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  artworkTextLarge: {
    fontSize: 120,
    color: '#666',
  },
  trackInfoCenter: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  trackTitleLarge: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  trackArtistLarge: {
    color: '#A0A0A0',
    fontSize: 18,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  controlButton: {
    padding: 16,
  },
  controlText: {
    fontSize: 32,
    color: '#FFFFFF',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8470A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 36,
    color: '#FFFFFF',
    marginLeft: 4, // Visual center tweak for play icon
  },
});
