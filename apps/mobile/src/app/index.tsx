import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Track, useProgress } from 'react-native-track-player';
import EqualizerBars from '../components/EqualizerBars';
import { usePlayerStore } from '../stores/playerStore';

const HERO_IMAGE = require('../../assets/images/logo-glow.png');

const TAB_OPTIONS = [
  { label: 'All Tracks', icon: 'musical-notes', lib: 'Ionicons' },
  { label: 'Playlists', icon: 'list', lib: 'Ionicons' },
  { label: 'Most Played', icon: 'flame', lib: 'Ionicons' },
] as const;

const ARTWORK_GRADIENTS = [
  ['#1DB954', '#0D2B1A'],
  ['#E8470A', '#2D1A0E'],
  ['#6C3AE8', '#1A1030'],
  ['#E83A8C', '#2D0A1E'],
  ['#3A9AE8', '#0A1E2D'],
] as const;

type TabLabel = (typeof TAB_OPTIONS)[number]['label'];
type ListItem =
  | { id: string; type: 'sticky' }
  | { id: string; type: 'track'; track: Track; index: number };

function getTrackId(track: Track | null | undefined) {
  return track?.id != null ? String(track.id) : '';
}

function getTrackTitle(track: Track | null | undefined) {
  return typeof track?.title === 'string' && track.title.trim().length > 0
    ? track.title
    : 'Unknown Title';
}

function getTrackArtist(track: Track | null | undefined) {
  if (typeof track?.artist === 'string' && track.artist.trim().length > 0) {
    return track.artist;
  }
  return 'Unknown Artist';
}

function getArtworkSource(track: Track | null | undefined) {
  if (!track?.artwork) return null;
  return typeof track.artwork === 'string' ? { uri: track.artwork } : track.artwork;
}

function formatTrackDuration(duration?: number) {
  const totalSeconds = Math.max(0, Math.floor(duration || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatLibraryDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }

  return `${minutes} min`;
}

function formatApproxSize(totalSeconds: number) {
  const estimatedMegabytes = Math.max(1, Math.round(totalSeconds * 0.024));
  if (estimatedMegabytes >= 1024) {
    return `${(estimatedMegabytes / 1024).toFixed(1)} GB`;
  }
  return `${estimatedMegabytes} MB`;
}

function getPlaceholderGradient(index: number) {
  return ARTWORK_GRADIENTS[index % ARTWORK_GRADIENTS.length];
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const progress = useProgress(250);
  const {
    playQueue,
    scanLocalMusic,
    setupPlayer,
    isSetup,
    currentTrack,
    isPlaying,
    togglePlayback,
    skipToNext,
    skipToPrevious,
    queue,
  } = usePlayerStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabLabel>('All Tracks');
  const [isListView, setIsListView] = useState(true);
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([]);
  const [menuTrackId, setMenuTrackId] = useState<string | null>(null);
  const [tabLayouts, setTabLayouts] = useState<Record<string, { x: number; width: number }>>({});

  const tabTranslateX = useSharedValue(0);
  const tabWidth = useSharedValue(0);
  const playPauseScale = useSharedValue(1);

  const hasNotifications = tracks.length > 0;
  const currentTrackId = getTrackId(currentTrack);
  const queueTrackIndex = Math.max(0, queue.findIndex((track) => getTrackId(track) === currentTrackId));
  const currentTrackIndex = Math.max(0, tracks.findIndex((track) => getTrackId(track) === currentTrackId));

  const loadMusic = useCallback(async () => {
    setLoading(true);
    if (!isSetup) {
      await setupPlayer();
    }
    const localTracks = await scanLocalMusic();
    setTracks(localTracks);
    setLoading(false);
  }, [isSetup, scanLocalMusic, setupPlayer]);

  useEffect(() => {
    void loadMusic();
  }, [loadMusic]);

  useEffect(() => {
    const layout = tabLayouts[activeTab];
    if (!layout) return;

    tabTranslateX.value = withSpring(layout.x, { damping: 18, stiffness: 200 });
    tabWidth.value = withSpring(layout.width, { damping: 18, stiffness: 200 });
  }, [activeTab, tabLayouts, tabTranslateX, tabWidth]);

  const animatedTabStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabTranslateX.value }],
    width: tabWidth.value,
  }));

  const animatedPlayPauseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playPauseScale.value }],
  }));

  const filteredTracks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    let baseTracks = tracks;

    if (activeTab === 'Playlists') {
      baseTracks = [];
    } else if (activeTab === 'Most Played') {
      baseTracks = [...tracks].sort((a, b) => (Number(b.duration) || 0) - (Number(a.duration) || 0));
    }

    if (!normalizedQuery) return baseTracks;

    return baseTracks.filter((track) => {
      const title = getTrackTitle(track).toLowerCase();
      const artist = getTrackArtist(track).toLowerCase();
      return title.includes(normalizedQuery) || artist.includes(normalizedQuery);
    });
  }, [activeTab, searchQuery, tracks]);

  const listData = useMemo<ListItem[]>(() => {
    if (!isListView) {
      return filteredTracks.map((track, index) => ({
        id: getTrackId(track),
        type: 'track',
        track,
        index,
      }));
    }

    return [
      { id: 'sticky-header', type: 'sticky' },
      ...filteredTracks.map((track, index) => ({
        id: getTrackId(track),
        type: 'track' as const,
        track,
        index,
      })),
    ];
  }, [filteredTracks, isListView]);

  const totalDurationSeconds = useMemo(
    () => tracks.reduce((sum, track) => sum + (Number(track.duration) || 0), 0),
    [tracks],
  );

  const metadataLine = `${tracks.length} tracks  ·  ${formatLibraryDuration(totalDurationSeconds)}  ·  ${formatApproxSize(totalDurationSeconds)}`;
  const playbackProgress = progress.duration > 0 ? Math.min(100, (progress.position / progress.duration) * 100) : 0;
  const likedCurrentTrack = likedTrackIds.includes(currentTrackId);

  const handlePlayTrack = (index: number) => {
    setMenuTrackId(null);
    void playQueue(filteredTracks, index);
  };

  const handleToggleLike = (trackId: string) => {
    setLikedTrackIds((currentIds) => (
      currentIds.includes(trackId)
        ? currentIds.filter((id) => id !== trackId)
        : [...currentIds, trackId]
    ));
  };

  const handleTogglePlayback = async () => {
    playPauseScale.value = withSpring(0.88, { damping: 10, stiffness: 300 }, () => {
      playPauseScale.value = withSpring(1, { damping: 10, stiffness: 300 });
    });
    await togglePlayback();
  };

  const renderArtwork = (track: Track, index: number, small = false) => {
    const artworkSource = getArtworkSource(track);
    if (artworkSource) {
      return (
        <Image
          source={artworkSource}
          style={small ? styles.miniPlayerArtwork : styles.trackArtwork}
        />
      );
    }

    const gradient = getPlaceholderGradient(index);
    return (
      <LinearGradient
        colors={gradient}
        style={small ? styles.miniPlayerArtworkPlaceholder : styles.trackArtworkPlaceholder}
      >
        <Feather name="music" size={small ? 16 : 18} color="rgba(255,255,255,0.4)" />
      </LinearGradient>
    );
  };

  const renderStickyHeader = () => (
    <View style={styles.stickyHeader}>
      <Text style={styles.stickyHeaderLabel}>TITLE</Text>
      <Feather name="clock" size={13} color="#606060" />
    </View>
  );

  const renderTrackRow = (track: Track, index: number) => {
    const trackId = getTrackId(track);
    const isActive = trackId === currentTrackId;

    if (!isListView) {
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.gridCard, isActive && styles.gridCardActive]}
          onPress={() => handlePlayTrack(index)}
          onLongPress={() => setMenuTrackId(trackId)}
        >
          {renderArtwork(track, index)}
          <View style={styles.gridCardText}>
            <Text style={[styles.gridCardTitle, isActive && styles.activeTrackTitle]} numberOfLines={1}>
              {getTrackTitle(track)}
            </Text>
            <Text style={styles.gridCardArtist} numberOfLines={1}>
              {getTrackArtist(track)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.trackRow, isActive && styles.activeTrackRow]}
          onPress={() => handlePlayTrack(index)}
          onLongPress={() => setMenuTrackId(menuTrackId === trackId ? null : trackId)}
        >
          <View style={styles.trackIndexColumn}>
            {isActive ? (
              <EqualizerBars />
            ) : (
              <Text style={styles.trackIndexText}>{index + 1}</Text>
            )}
          </View>

          <View style={styles.trackArtworkWrap}>
            {renderArtwork(track, index)}
          </View>

          <View style={styles.trackTextBlock}>
            <Text style={[styles.trackTitle, isActive && styles.activeTrackTitle]} numberOfLines={1}>
              {getTrackTitle(track)}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {getTrackArtist(track)}
            </Text>
          </View>

          <View style={styles.trackRightBlock}>
            <Text style={styles.trackDuration}>{formatTrackDuration(Number(track.duration) || 0)}</Text>
            {menuTrackId === trackId ? (
              <Feather name="more-vertical" size={18} color="#606060" />
            ) : null}
          </View>
        </TouchableOpacity>
        <View style={styles.trackDivider} />
      </View>
    );
  };

  const renderFooterState = () => {
    if (loading) {
      return (
        <View style={styles.feedbackState}>
          <ActivityIndicator size="large" color="#E8470A" />
          <Text style={styles.feedbackTitle}>Scanning your device</Text>
          <Text style={styles.feedbackText}>Building your local music library now...</Text>
        </View>
      );
    }

    if (activeTab === 'Playlists') {
      return (
        <View style={styles.feedbackState}>
          <Text style={styles.feedbackTitle}>No playlists yet</Text>
          <Text style={styles.feedbackText}>This mobile build only exposes local tracks right now.</Text>
        </View>
      );
    }

    if (filteredTracks.length === 0) {
      return (
        <View style={styles.feedbackState}>
          <Text style={styles.feedbackTitle}>No matches found</Text>
          <Text style={styles.feedbackText}>Try a different search or rescan your library.</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(232,71,10,0.08)', 'transparent']}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <View style={styles.contentLayer}>
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity activeOpacity={0.7} style={styles.headerIconButton}>
            <Feather name="menu" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerSearchPill}>
            <Feather name="search" size={15} color="#606060" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search songs, artists..."
              placeholderTextColor="#606060"
              style={styles.headerSearchInput}
            />
          </View>

          <View style={styles.headerRightRow}>
            <TouchableOpacity activeOpacity={0.7} style={styles.headerBellWrap}>
              <Feather name="bell" size={22} color="#FFFFFF" />
              {hasNotifications ? <View style={styles.notificationDot} /> : null}
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.headerIconButton}>
              <Feather name="settings" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.avatar}>
              <Text style={styles.avatarText}>U</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ImageBackground source={HERO_IMAGE} style={styles.heroCard} imageStyle={styles.heroImage}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroOverlay}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>LOCAL LIBRARY</Text>
            </View>
            <Text style={styles.heroTitle}>My Music</Text>
            <Text style={styles.heroMeta}>{metadataLine}</Text>
            <View style={styles.heroButtonsRow}>
              <TouchableOpacity activeOpacity={0.8} style={styles.heroSecondaryButton} onPress={() => void loadMusic()}>
                <Feather name="folder" size={14} color="#FFFFFF" />
                <Text style={styles.heroSecondaryButtonText}>Import Folder</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={styles.heroPrimaryButton} onPress={() => void loadMusic()}>
                <Feather name="upload-cloud" size={14} color="#FFFFFF" />
                <Text style={styles.heroPrimaryButtonText}>Add Files</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.tabsSection}>
          <View style={styles.tabsOuter}>
            <View style={styles.tabsTrack}>
              <Animated.View style={[styles.tabActivePill, animatedTabStyle]} />
              {TAB_OPTIONS.map((tab) => {
                const isActive = activeTab === tab.label;
                return (
                  <TouchableOpacity
                    key={tab.label}
                    activeOpacity={0.8}
                    style={styles.tabButton}
                    onLayout={(event) => {
                      const { x, width } = event.nativeEvent.layout;
                      setTabLayouts((currentLayouts) => {
                        const existing = currentLayouts[tab.label];
                        if (existing && existing.x === x && existing.width === width) {
                          return currentLayouts;
                        }
                        return {
                          ...currentLayouts,
                          [tab.label]: { x, width },
                        };
                      });
                    }}
                    onPress={() => setActiveTab(tab.label)}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={15}
                      color={isActive ? '#121212' : '#A0A0A0'}
                    />
                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.searchToggleRow}>
          <View style={styles.librarySearchWrap}>
            <Feather name="search" size={14} color="#606060" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search your library..."
              placeholderTextColor="#606060"
              style={styles.librarySearchInput}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.viewToggleButton}
            onPress={() => setIsListView((value) => !value)}
          >
            <Feather name={isListView ? 'grid' : 'list'} size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          key={isListView ? 'list-view' : 'grid-view'}
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickyHeaderIndices={isListView ? [0] : undefined}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          numColumns={isListView ? 1 : 2}
          columnWrapperStyle={isListView ? undefined : styles.gridColumn}
          renderItem={({ item }) => {
            if (item.type === 'sticky') {
              return renderStickyHeader();
            }

            return renderTrackRow(item.track, item.index);
          }}
          ListFooterComponent={renderFooterState}
        />

        {currentTrack ? (
          <View style={[styles.miniPlayerContainer, { bottom: insets.bottom + 10 }]}>
            <BlurView intensity={80} tint="dark" style={styles.miniPlayerBlur} />
            <View style={styles.miniPlayerOverlay} />
            <View style={styles.miniPlayerContent}>
              {renderArtwork(currentTrack, queueTrackIndex >= 0 ? queueTrackIndex : currentTrackIndex, true)}

              <View style={styles.miniPlayerTextBlock}>
                <Text style={styles.miniPlayerTitle} numberOfLines={1}>
                  {getTrackTitle(currentTrack)}
                </Text>
                <Text style={styles.miniPlayerArtist} numberOfLines={1}>
                  {getTrackArtist(currentTrack)}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${playbackProgress}%` }]} />
                </View>
              </View>

              <View style={styles.miniPlayerControls}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => handleToggleLike(currentTrackId)}>
                  <Feather name="heart" size={22} color={likedCurrentTrack ? '#E8470A' : 'rgba(255,255,255,0.6)'} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={() => void skipToPrevious()}>
                  <Ionicons name="play-skip-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.9} onPress={() => void handleTogglePlayback()}>
                  <Animated.View style={[styles.playPauseButton, animatedPlayPauseStyle]}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#FFFFFF" />
                  </Animated.View>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={() => void skipToNext()}>
                  <Ionicons name="play-skip-forward" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 0,
  },
  contentLayer: {
    flex: 1,
    zIndex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerIconButton: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSearchPill: {
    flex: 1,
    marginHorizontal: 12,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  headerSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerBellWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8470A',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333333',
    borderWidth: 2,
    borderColor: '#E8470A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#141414',
  },
  heroImage: {
    resizeMode: 'cover',
    opacity: 0.9,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  heroContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#E8470A',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  heroTitle: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  heroMeta: {
    marginTop: 4,
    color: '#A0A0A0',
    fontSize: 13,
  },
  heroButtonsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  heroSecondaryButton: {
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroSecondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  heroPrimaryButton: {
    height: 42,
    borderRadius: 999,
    backgroundColor: '#E8470A',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#E8470A',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  heroPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tabsSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  tabsOuter: {
    borderRadius: 999,
    backgroundColor: '#1A1A1A',
    padding: 4,
  },
  tabsTrack: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabActivePill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    height: 36,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    zIndex: 1,
  },
  tabLabel: {
    color: '#A0A0A0',
    fontSize: 13,
  },
  tabLabelActive: {
    color: '#121212',
    fontWeight: '600',
  },
  searchToggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  librarySearchWrap: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  librarySearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 110,
  },
  stickyHeader: {
    backgroundColor: '#0D0D0D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderColor: '#1E1E1E',
  },
  stickyHeaderLabel: {
    color: '#606060',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  trackRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeTrackRow: {
    backgroundColor: 'rgba(232,71,10,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#E8470A',
  },
  trackIndexColumn: {
    width: 28,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  trackIndexText: {
    color: '#606060',
    fontSize: 14,
    textAlign: 'right',
  },
  trackArtworkWrap: {
    marginLeft: 10,
  },
  trackArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  trackArtworkPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTrackTitle: {
    color: '#E8470A',
  },
  trackArtist: {
    marginTop: 2,
    color: '#A0A0A0',
    fontSize: 13,
  },
  trackRightBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 42,
    gap: 4,
  },
  trackDuration: {
    color: '#606060',
    fontSize: 13,
  },
  trackDivider: {
    marginLeft: 100,
    height: 0.5,
    backgroundColor: '#2A2A2A',
  },
  gridColumn: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  gridCard: {
    width: '48%',
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  gridCardActive: {
    borderColor: '#E8470A',
    backgroundColor: 'rgba(232,71,10,0.08)',
  },
  gridCardText: {
    marginTop: 12,
  },
  gridCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  gridCardArtist: {
    marginTop: 4,
    color: '#A0A0A0',
    fontSize: 12,
  },
  feedbackState: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTitle: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  feedbackText: {
    marginTop: 6,
    color: '#A0A0A0',
    fontSize: 13,
    textAlign: 'center',
  },
  miniPlayerContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  miniPlayerBlur: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  miniPlayerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(18,18,18,0.85)',
  },
  miniPlayerContent: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  miniPlayerArtwork: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
  },
  miniPlayerArtworkPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlayerTextBlock: {
    flex: 1,
  },
  miniPlayerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  miniPlayerArtist: {
    marginTop: 2,
    color: '#A0A0A0',
    fontSize: 12,
  },
  progressTrack: {
    marginTop: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2A2A2A',
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#E8470A',
  },
  miniPlayerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playPauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8470A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E8470A',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
});
