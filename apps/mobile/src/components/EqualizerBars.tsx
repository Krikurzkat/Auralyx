import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export default function EqualizerBars() {
  const barOneHeight = useSharedValue(6);
  const barTwoHeight = useSharedValue(6);
  const barThreeHeight = useSharedValue(6);

  useEffect(() => {
    barOneHeight.value = withRepeat(
      withSequence(
        withTiming(18, { duration: 400 }),
        withTiming(6, { duration: 400 }),
      ),
      -1,
      false,
    );

    barTwoHeight.value = withDelay(
      100,
      withRepeat(
        withSequence(
          withTiming(14, { duration: 300 }),
          withTiming(6, { duration: 300 }),
        ),
        -1,
        false,
      ),
    );

    barThreeHeight.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(20, { duration: 500 }),
          withTiming(6, { duration: 500 }),
        ),
        -1,
        false,
      ),
    );
  }, [barOneHeight, barTwoHeight, barThreeHeight]);

  const barOneStyle = useAnimatedStyle(() => ({
    height: barOneHeight.value,
  }));

  const barTwoStyle = useAnimatedStyle(() => ({
    height: barTwoHeight.value,
  }));

  const barThreeStyle = useAnimatedStyle(() => ({
    height: barThreeHeight.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bar, barOneStyle]} />
      <Animated.View style={[styles.bar, barTwoStyle]} />
      <Animated.View style={[styles.bar, barThreeStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 3,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#E8470A',
  },
});
