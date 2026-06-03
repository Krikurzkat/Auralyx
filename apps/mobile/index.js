import TrackPlayer from 'react-native-track-player';

TrackPlayer.registerPlaybackService(() => require('./src/services/PlaybackService').PlaybackService);

import 'expo-router/entry';
