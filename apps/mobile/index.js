import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './src/services/PlaybackService';

TrackPlayer.registerPlaybackService(() => PlaybackService);

import 'expo-router/entry';
