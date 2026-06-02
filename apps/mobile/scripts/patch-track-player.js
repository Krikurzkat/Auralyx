const fs = require('fs');
const path = require('path');

console.log('Running patch-track-player.js to fix Kotlin 2.x null safety...');

const trackFile = path.join(__dirname, '..', 'node_modules', 'react-native-track-player', 'android', 'src', 'main', 'java', 'com', 'doublesymmetry', 'trackplayer', 'model', 'Track.kt');
const metadataFile = path.join(__dirname, '..', 'node_modules', 'react-native-track-player', 'android', 'src', 'main', 'java', 'com', 'doublesymmetry', 'trackplayer', 'model', 'TrackMetadata.kt');

if (fs.existsSync(trackFile)) {
  let content = fs.readFileSync(trackFile, 'utf8');
  content = content.replace('if (originalItem != null && originalItem != bundle) originalItem!!.putAll(bundle)', 'if (originalItem != null && originalItem != bundle) originalItem!!.putAll(bundle ?: Bundle())');
  fs.writeFileSync(trackFile, content);
  console.log('Patched Track.kt');
}

if (fs.existsSync(metadataFile)) {
  let content = fs.readFileSync(metadataFile, 'utf8');
  if (!content.includes('val safeBundle = bundle ?: Bundle()')) {
    content = content.replace('    open fun setMetadata(context: Context, bundle: Bundle?, ratingType: Int) {', '    open fun setMetadata(context: Context, bundle: Bundle?, ratingType: Int) {\n        val safeBundle = bundle ?: Bundle()');
    content = content.replace(/bundle!!.getString/g, 'safeBundle.getString');
    content = content.replace(/bundle\.getString/g, 'safeBundle.getString');
    content = content.replace(/bundle, "artwork"/g, 'safeBundle, "artwork"');
    content = content.replace(/bundle\.containsKey/g, 'safeBundle.containsKey');
    content = content.replace(/bundle\.getDouble/g, 'safeBundle.getDouble');
    content = content.replace(/bundle, "rating"/g, 'safeBundle, "rating"');
    fs.writeFileSync(metadataFile, content);
    console.log('Patched TrackMetadata.kt');
  }
}

console.log('Done patching react-native-track-player');
