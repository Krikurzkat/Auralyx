import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const sections = [
  {
    title: 'Audio library access',
    body: 'If you grant Music and audio permission, Auralyx reads audio files and their basic details, such as file name and duration, so it can show and play tracks from your device. You can deny or revoke this permission in Android settings.',
  },
  {
    title: 'How your information is used',
    body: 'The Android app uses your local audio library only to provide music browsing and playback. Audio files and their details stay on your device and are not uploaded to Auralyx servers. Track details may be shown by Android in its system playback controls while a track is playing.',
  },
  {
    title: 'Information Auralyx does not collect',
    body: 'The current Android version does not require an account and does not include advertising or analytics code. Auralyx does not sell or share your audio files or track details.',
  },
  {
    title: 'Storage and deletion',
    body: 'Auralyx does not keep a server-side copy of your music library. Revoke Music and audio permission at any time in Android settings. Uninstalling Auralyx removes app-held data; it does not delete your original music files.',
  },
  {
    title: 'Contact',
    body: 'For privacy questions, use the developer contact email shown on Auralyx’s Google Play listing.',
  },
];

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={20} color="#F5F7FB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>AURALYX · ANDROID</Text>
        <Text style={styles.title}>Your music stays yours.</Text>
        <Text style={styles.updated}>Privacy policy · Effective October 21, 2026</Text>
        <Text style={styles.intro}>
          This policy describes how the Auralyx Android app accesses and handles information on your device.
        </Text>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <Text style={styles.version}>Applies to Auralyx for Android, version 1.0.0 and later.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090C16',
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 14,
    color: '#F5F7FB',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 42,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  eyebrow: {
    color: '#72DFF5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    marginTop: 12,
    color: '#F5F7FB',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  updated: {
    marginTop: 10,
    color: '#8D96A7',
    fontSize: 13,
  },
  intro: {
    marginTop: 24,
    color: '#CFD5E0',
    fontSize: 15,
    lineHeight: 23,
  },
  section: {
    marginTop: 26,
  },
  sectionTitle: {
    color: '#F5F7FB',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  sectionBody: {
    marginTop: 8,
    color: '#AEB6C4',
    fontSize: 14,
    lineHeight: 22,
  },
  version: {
    marginTop: 30,
    color: '#707A8B',
    fontSize: 12,
  },
});
