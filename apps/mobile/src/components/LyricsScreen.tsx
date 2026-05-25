import React, { useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useProgress } from 'react-native-track-player';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  withSpring 
} from 'react-native-reanimated';

export interface LyricLine {
  text: string;
  startTime: number; // in seconds
}

interface LyricsScreenProps {
  lyrics: LyricLine[];
}

const LyricItem = React.memo(({ line, isActive, isNear }: { line: LyricLine, isActive: boolean, isNear: boolean }) => {
  const targetOpacity = isActive ? 1.0 : isNear ? 0.65 : 0.35;
  const targetScale = isActive ? 1.0 : isNear ? 0.92 : 0.82;
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(targetOpacity, { duration: 180 }),
      transform: [{
        scale: withSpring(targetScale, { damping: 18, stiffness: 200 })
      }]
    };
  });

  return (
    <View style={styles.lineContainer}>
      {/* 
        We use an Animated.Text for the active transition.
        Notice that flexShrink: 1 and flexWrap: 'wrap' are applied.
        numberOfLines is undefined implicitly so it wraps indefinitely.
      */}
      <Animated.Text 
        style={[
          styles.lyricText,
          isActive ? styles.activeText : (isNear ? styles.nearActiveText : styles.inactiveText),
          animatedStyle
        ]}
      >
        {line.text}
      </Animated.Text>
    </View>
  );
});

export default function LyricsScreen({ lyrics }: LyricsScreenProps) {
  // 4. Highlight Sync Delay: using useProgress(50) for higher frequency updates
  const { position } = useProgress(50);
  const lyricsRef = useRef<FlatList>(null);

  // Add a 300ms look-ahead offset to compensate for rendering and perception delays
  const adjustedPosition = position + 0.3;

  // Derive the active lyric index exactly as requested.
  // We use reduce as a fallback if findLastIndex is not available on the engine.
  const activeIndex = typeof lyrics.findLastIndex === 'function' 
    ? lyrics.findLastIndex((line) => line.startTime <= adjustedPosition)
    : lyrics.reduce((acc, line, i) => line.startTime <= adjustedPosition ? i : acc, 0);

  // 5. Auto Scroll to Active Line
  useEffect(() => {
    if (activeIndex >= 0 && lyricsRef.current) {
      lyricsRef.current.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.5
      });
    }
  }, [activeIndex]);

  return (
    <FlatList
      ref={lyricsRef}
      data={lyrics}
      keyExtractor={(item, index) => `${index}-${item.startTime}`}
      showsVerticalScrollIndicator={false}
      // Provide a fallback to prevent crashes if layout isn't fully computed yet
      onScrollToIndexFailed={({ index }) => {
        lyricsRef.current?.scrollToOffset({
          offset: index * 60,
          animated: true
        });
      }}
      renderItem={({ item, index }) => (
        <LyricItem 
          line={item} 
          isActive={index === activeIndex} 
          isNear={Math.abs(index - activeIndex) === 1} 
        />
      )}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: '50%',
  },
  lineContainer: {
    // 1. Text Overflow & Padding
    paddingHorizontal: 28,
    // 3. Line Spacing
    marginVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    // DO NOT use fixed height
  },
  lyricText: {
    // 1. flexShrink and flexWrap
    flexShrink: 1,
    flexWrap: 'wrap',
    // 2. All lines center alignment
    textAlign: 'center',
  },
  activeText: {
    // 2. Active/current line
    fontSize: 22,
    fontWeight: '700',
    color: '#E8470A',
    lineHeight: 22 * 1.55,
  },
  nearActiveText: {
    // 2. Near-active lines
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF', // Assuming default white for text
    lineHeight: 18 * 1.55,
  },
  inactiveText: {
    // 2. Inactive lines
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF', // Assuming default white for text
    lineHeight: 16 * 1.55,
  }
});
