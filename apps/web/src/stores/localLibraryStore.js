import { create } from 'zustand';
import { localDb } from '../services/localDb';
import { usePlayerStore } from './playerStore';
// ─── Helpers ───
function generateId() {
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
function stringToGradient(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash) % 360;
    const h2 = (h1 + 40 + (Math.abs(hash >> 8) % 60)) % 360;
    return [`hsl(${h1}, 65%, 45%)`, `hsl(${h2}, 55%, 55%)`];
}
const AUDIO_EXTENSIONS = new Set([
    'aac',
    'aiff',
    'alac',
    'flac',
    'm4a',
    'mp3',
    'mp4',
    'mpeg',
    'oga',
    'ogg',
    'opus',
    'wav',
    'wave',
    'webm',
    'wma',
]);
const AUDIO_MIME_TYPES = new Set([
    'audio/aac',
    'audio/aiff',
    'audio/flac',
    'audio/m4a',
    'audio/mp4',
    'audio/mpeg',
    'audio/mp3',
    'audio/oga',
    'audio/ogg',
    'audio/opus',
    'audio/webm',
    'audio/wav',
    'audio/wave',
    'audio/x-aiff',
    'audio/x-flac',
    'audio/x-m4a',
    'audio/x-ms-wma',
    'audio/x-wav',
]);
const COMPRESSED_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2']);
const COVER_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const COVER_NAME_PRIORITY = ['cover', 'folder', 'front', 'album'];
function getFileExtension(fileName) {
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex <= 0 || dotIndex === fileName.length - 1)
        return '';
    return fileName.slice(dotIndex + 1).toLowerCase();
}
function getBaseName(fileName) {
    return fileName.replace(/\.[^.]+$/, '').trim().toLowerCase();
}
function getImportPath(file) {
    return (file.webkitRelativePath || file.name).replace(/\\/g, '/');
}
function getImportDirectory(file) {
    const importPath = getImportPath(file);
    const slashIndex = importPath.lastIndexOf('/');
    return slashIndex >= 0 ? importPath.slice(0, slashIndex).toLowerCase() : '';
}
function isAudioFile(file) {
    const extension = getFileExtension(file.name);
    return AUDIO_EXTENSIONS.has(extension) || AUDIO_MIME_TYPES.has(file.type) || file.type.startsWith('audio/');
}
function isCompressedFile(file) {
    const extension = getFileExtension(file.name);
    return COMPRESSED_EXTENSIONS.has(extension);
}
async function extractFilesFromArchive(file) {
    const extension = getFileExtension(file.name);
    // Only support ZIP files for now (jszip library)
    if (extension !== 'zip') {
        console.warn(`[LocalLibrary] Unsupported archive format: ${extension}. Only ZIP files are supported.`);
        return [];
    }
    try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        const extractedFiles = [];
        // Extract all files from the archive
        for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
            // Skip directories
            if (zipEntry.dir)
                continue;
            try {
                // Get the file as a Blob
                const blob = await zipEntry.async('blob');
                // Get just the filename from the path
                const fileName = relativePath.split('/').pop() || relativePath;
                // Create a File object with the extracted content
                const extractedFile = new File([blob], fileName, {
                    type: blob.type || 'application/octet-stream',
                    lastModified: zipEntry.date?.getTime() || Date.now(),
                });
                // Add webkitRelativePath to maintain folder structure
                Object.defineProperty(extractedFile, 'webkitRelativePath', {
                    value: relativePath,
                    writable: false,
                });
                extractedFiles.push(extractedFile);
            }
            catch (err) {
                console.error(`[LocalLibrary] Failed to extract file ${relativePath}:`, err);
            }
        }
        console.info(`[LocalLibrary] Extracted ${extractedFiles.length} files from ${file.name}`);
        return extractedFiles;
    }
    catch (err) {
        console.error(`[LocalLibrary] Failed to extract archive ${file.name}:`, err);
        return [];
    }
}
async function hashLocalFile(file) {
    try {
        const buffer = await file.arrayBuffer();
        const digest = await window.crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
    }
    catch {
        return [
            'file',
            file.name,
            file.size,
            file.lastModified,
            file.type,
        ].join(':');
    }
}
function isCoverImageFile(file) {
    const ext = getFileExtension(file.name);
    const baseName = getBaseName(file.name);
    return COVER_IMAGE_EXTENSIONS.has(ext) && COVER_NAME_PRIORITY.includes(baseName);
}
function isLyricFile(file) {
    return getFileExtension(file.name) === 'lrc';
}
function compareCoverFiles(a, b) {
    const aNameRank = COVER_NAME_PRIORITY.indexOf(getBaseName(a.name));
    const bNameRank = COVER_NAME_PRIORITY.indexOf(getBaseName(b.name));
    if (aNameRank !== bNameRank)
        return aNameRank - bNameRank;
    const aExtRank = a.name.toLowerCase().endsWith('.jpeg') ? 0 : 1;
    const bExtRank = b.name.toLowerCase().endsWith('.jpeg') ? 0 : 1;
    return aExtRank - bExtRank;
}
function buildCoverFileIndex(files) {
    const byDirectory = new Map();
    const covers = files.filter(isCoverImageFile).sort(compareCoverFiles);
    for (const cover of covers) {
        const directory = getImportDirectory(cover);
        if (!byDirectory.has(directory)) {
            byDirectory.set(directory, cover);
        }
    }
    return {
        byDirectory,
        batchFallback: covers[0],
    };
}
function buildLyricFileIndex(files) {
    const byPathBase = new Map();
    const byDirectory = new Map();
    const lrcFiles = files.filter(isLyricFile);
    for (const lrcFile of lrcFiles) {
        const directory = getImportDirectory(lrcFile);
        byPathBase.set(`${directory}/${getBaseName(lrcFile.name)}`, lrcFile);
        byDirectory.set(directory, [...(byDirectory.get(directory) || []), lrcFile]);
    }
    return { byPathBase, byDirectory };
}
function findBatchCoverFile(audioFile, coverIndex) {
    let directory = getImportDirectory(audioFile);
    while (directory) {
        const cover = coverIndex.byDirectory.get(directory);
        if (cover)
            return cover;
        const parentSlashIndex = directory.lastIndexOf('/');
        directory = parentSlashIndex >= 0 ? directory.slice(0, parentSlashIndex) : '';
    }
    return coverIndex.byDirectory.get('') || (getImportDirectory(audioFile) ? undefined : coverIndex.batchFallback);
}
function findBatchLyricFile(audioFile, lyricIndex) {
    const directory = getImportDirectory(audioFile);
    const baseKey = `${directory}/${getBaseName(audioFile.name)}`;
    const exactMatch = lyricIndex.byPathBase.get(baseKey);
    if (exactMatch)
        return exactMatch;
    const directoryLyrics = lyricIndex.byDirectory.get(directory) || [];
    return directoryLyrics.length === 1 ? directoryLyrics[0] : undefined;
}
function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
    });
}
function readFileAsText(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
        reader.onerror = () => resolve(undefined);
        reader.readAsText(file);
    });
}
function slugifyLocalId(value, fallback) {
    const slug = value
        .toLowerCase()
        .trim()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return slug || fallback;
}
function cleanFilenamePart(value) {
    return value
        .replace(/[_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s*\(\s*/g, ' (')
        .replace(/\s*\)\s*/g, ') ')
        .trim();
}
function isMissingMetadata(value) {
    if (!value)
        return true;
    const normalized = value.trim().toLowerCase();
    return (normalized.length === 0 ||
        normalized === 'unknown' ||
        normalized === 'unknown artist' ||
        normalized === 'unknown album');
}
function hasSyncedLyricTimestamps(text) {
    return /\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\]/.test(text);
}
function cleanLyricText(text) {
    return text
        .replace(/\r/g, '')
        .replace(/\u0000/g, '')
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')
        .trim();
}
function getLyricTextFromValue(value) {
    if (!value)
        return [];
    if (typeof value === 'string')
        return [value];
    if (Array.isArray(value))
        return value.flatMap(getLyricTextFromValue);
    if (typeof value === 'object') {
        const record = value;
        const directText = record.text ?? record.lyrics ?? record.value;
        if (typeof directText === 'string')
            return [directText];
        if (Array.isArray(directText))
            return directText.flatMap(getLyricTextFromValue);
    }
    return [];
}
function isNativeLyricsTag(tagId) {
    if (typeof tagId !== 'string')
        return false;
    const normalized = tagId.toLowerCase();
    if (normalized.includes('lyricist'))
        return false;
    return [
        'uslt',
        'ult',
        'sylt',
        'lyrics',
        'lyric',
        'unsyncedlyrics',
        'unsynced lyrics',
        'syncedlyrics',
        'synclyrics',
        'wm/lyrics',
        'wm/synclyrics',
        '©lyr',
        '----:com.apple.itunes:lyrics',
    ].some((key) => normalized === key || normalized.endsWith(`:${key}`));
}
function getEmbeddedLyrics(metadata) {
    const lyricTexts = [];
    if (Array.isArray(metadata.common.lyrics)) {
        lyricTexts.push(...metadata.common.lyrics.flatMap(getLyricTextFromValue));
    }
    Object.values(metadata.native || {}).forEach((tags) => {
        tags.forEach((tag) => {
            if (isNativeLyricsTag(tag.id)) {
                lyricTexts.push(...getLyricTextFromValue(tag.value));
            }
        });
    });
    const cleanedTexts = Array.from(new Set(lyricTexts.map(cleanLyricText).filter(Boolean)));
    if (cleanedTexts.length === 0)
        return undefined;
    return cleanedTexts.find(hasSyncedLyricTimestamps) || cleanedTexts.join('\n\n');
}
function parseFilenameTemplate(fileName, artistFrequencies) {
    const baseName = fileName
        .replace(/\.[^.]+$/, '')
        .replace(/^\s*\d{1,3}\s*[-._]\s*/, '')
        .replace(/\s+-\s*$/, '')
        .trim();
    const parts = baseName
        .split(/\s+-\s+/)
        .map(cleanFilenamePart)
        .filter(Boolean);
    const readYear = (value) => {
        const match = value?.match(/\b(19|20)\d{2}\b/);
        if (!match)
            return undefined;
        const year = Number.parseInt(match[0], 10);
        return year >= 1900 && year <= 2100 ? year : undefined;
    };
    if (parts.length >= 5) {
        const year = readYear(parts[parts.length - 1]);
        return {
            title: parts[0],
            artist: parts[1],
            album: parts[2],
            genre: parts.slice(3, year ? -1 : undefined).join(' - '),
            year,
        };
    }
    if (parts.length === 4) {
        const year = readYear(parts[3]);
        return {
            title: parts[0],
            artist: parts[1],
            album: parts[2],
            genre: year ? undefined : parts[3],
            year,
        };
    }
    const cleanForArtistCheck = (str) => str.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim().toLowerCase();
    if (parts.length === 3) {
        let title = parts[1]; // default Artist - Title - Album
        let artist = parts[0];
        const album = parts[2];
        const p0Clean = cleanForArtistCheck(parts[0]);
        const p1Clean = cleanForArtistCheck(parts[1]);
        const p0Score = artistFrequencies?.get(p0Clean) || 0;
        const p1Score = artistFrequencies?.get(p1Clean) || 0;
        if (p1Score > p0Score) {
            title = parts[0];
            artist = parts[1];
        }
        artist = artist.replace(/\s*(\(lyrics\)|\(official[^)]*\)|\[official[^\]]*\])\s*/gi, '').trim();
        return { title, artist, album };
    }
    if (parts.length === 2) {
        // Default to the industry standard for mp3s: Artist - Title
        let title = parts[1];
        let artist = parts[0];
        const p0Clean = cleanForArtistCheck(parts[0]);
        const p1Clean = cleanForArtistCheck(parts[1]);
        const p0Score = artistFrequencies?.get(p0Clean) || 0;
        const p1Score = artistFrequencies?.get(p1Clean) || 0;
        if (p0Score !== p1Score) {
            if (p0Score > p1Score) {
                title = parts[1]; // p0 is artist
                artist = parts[0];
            }
            else {
                title = parts[0]; // p1 is artist
                artist = parts[1];
            }
        }
        else {
            // Heuristic 2: Title Markers
            const titleMarkers = /\b(lyrics|official|video|audio|feat\.?|ft\.?|prod\.?|remix|edit|mix|cover|live)\b/i;
            const part0HasMarker = titleMarkers.test(parts[0]);
            const part1HasMarker = titleMarkers.test(parts[1]);
            if (part0HasMarker && !part1HasMarker) {
                // e.g. "Risk It All (Lyrics) - Bruno Mars" -> Title - Artist
                title = parts[0];
                artist = parts[1];
            }
        }
        // Clean up artist string just in case it had (Lyrics) attached
        artist = artist.replace(/\s*(\(lyrics\)|\(official[^)]*\)|\[official[^\]]*\])\s*/gi, '').trim();
        return { title, artist };
    }
    return {
        title: cleanFilenamePart(baseName.replace(/[._]+/g, ' ')),
    };
}
function pickImportedText(embedded, filenameValue, fallback, mode) {
    if (mode === 'filename-only')
        return filenameValue || fallback;
    if (mode === 'filename-first')
        return filenameValue || (!isMissingMetadata(embedded) ? embedded || fallback : fallback);
    return isMissingMetadata(embedded) ? filenameValue || fallback : embedded || fallback;
}
function pickImportedYear(embedded, filenameValue, mode) {
    if (mode === 'filename-only')
        return filenameValue;
    if (mode === 'filename-first')
        return filenameValue || embedded;
    return embedded || filenameValue;
}
function findReusableAlbumCover(album, artist, tracks) {
    if (isMissingMetadata(album))
        return undefined;
    const normalizedAlbum = album.trim().toLowerCase();
    const normalizedArtist = artist.trim().toLowerCase();
    const sameArtistAlbum = tracks.find((track) => track.coverUrl &&
        track.album?.trim().toLowerCase() === normalizedAlbum &&
        track.artist?.trim().toLowerCase() === normalizedArtist);
    if (sameArtistAlbum?.coverUrl)
        return sameArtistAlbum.coverUrl;
    return tracks.find((track) => track.coverUrl &&
        track.album?.trim().toLowerCase() === normalizedAlbum)?.coverUrl;
}
async function getAudioDuration(file) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        const cleanup = () => {
            audio.removeAttribute('src');
            audio.load();
            URL.revokeObjectURL(url);
        };
        audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
            cleanup();
        });
        audio.addEventListener('error', () => {
            resolve(0);
            cleanup();
        });
    });
}
function syncTrackIntoPlayer(updatedTrack) {
    const playerState = usePlayerStore.getState();
    const mergeTrack = (track) => track.id === updatedTrack.id ? { ...track, ...updatedTrack } : track;
    const nextCurrentTrack = playerState.currentTrack
        ? mergeTrack(playerState.currentTrack)
        : null;
    const nextQueue = playerState.queue.map(mergeTrack);
    const nextHistory = playerState.history.map(mergeTrack);
    usePlayerStore.setState({
        currentTrack: nextCurrentTrack,
        queue: nextQueue,
        history: nextHistory,
    });
}
// ─── Store ───
export const useLocalLibraryStore = create((set, get) => ({
    localTracks: [],
    localPlaylists: [],
    playCounts: {},
    lastPlayed: {},
    isLoaded: false,
    importProgress: { total: 0, done: 0, current: '', isRunning: false, rejected: 0, skippedDuplicates: 0, abuseFlags: [] },
    searchQuery: '',
    loadLibrary: async () => {
        try {
            const [tracks, playlists, playCounts, lastPlayed] = await Promise.all([
                localDb.getTracks(),
                localDb.getPlaylists(),
                localDb.getSetting('playCounts'),
                localDb.getSetting('lastPlayed'),
            ]);
            set({
                localTracks: tracks,
                localPlaylists: playlists,
                playCounts: playCounts || {},
                lastPlayed: lastPlayed || {},
                isLoaded: true,
            });
            const playerState = usePlayerStore.getState();
            if (playerState.rememberLastPlayback) {
                playerState.restoreLastPlayback(tracks);
            }
        }
        catch (err) {
            console.error('Failed to load local library:', err);
            set({ isLoaded: true });
        }
    },
    importFiles: async (files) => {
        let allFiles = Array.from(files);
        console.info(`[LocalLibrary] Starting import with ${allFiles.length} file(s)`);
        // Log file types for debugging
        const fileTypes = allFiles.map(f => `${f.name} (${getFileExtension(f.name)})`);
        console.info(`[LocalLibrary] Files:`, fileTypes);
        // Extract compressed files first
        const compressedFiles = allFiles.filter(isCompressedFile);
        if (compressedFiles.length > 0) {
            console.info(`[LocalLibrary] Found ${compressedFiles.length} compressed file(s), extracting...`);
            console.info(`[LocalLibrary] Compressed files:`, compressedFiles.map(f => f.name));
            const extractedFilesArrays = await Promise.all(compressedFiles.map(file => extractFilesFromArchive(file)));
            const extractedFiles = extractedFilesArrays.flat();
            console.info(`[LocalLibrary] Extracted ${extractedFiles.length} files from archives`);
            // Remove compressed files from the list and add extracted files
            allFiles = allFiles.filter(f => !isCompressedFile(f)).concat(extractedFiles);
            console.info(`[LocalLibrary] Total files after extraction: ${allFiles.length}`);
        }
        const playerPreferences = usePlayerStore.getState();
        const coverIndex = playerPreferences.attachSidecarFiles ? buildCoverFileIndex(allFiles) : undefined;
        const lyricIndex = playerPreferences.attachSidecarFiles ? buildLyricFileIndex(allFiles) : undefined;
        const coverDataUrlCache = new Map();
        const lyricTextCache = new Map();
        const getBatchCoverUrl = (file) => {
            if (!coverIndex)
                return Promise.resolve(undefined);
            const coverFile = findBatchCoverFile(file, coverIndex);
            if (!coverFile)
                return Promise.resolve(undefined);
            let cached = coverDataUrlCache.get(coverFile);
            if (!cached) {
                cached = readFileAsDataUrl(coverFile);
                coverDataUrlCache.set(coverFile, cached);
            }
            return cached;
        };
        const getBatchLyrics = (file) => {
            if (!lyricIndex)
                return Promise.resolve(undefined);
            const lyricFile = findBatchLyricFile(file, lyricIndex);
            if (!lyricFile)
                return Promise.resolve(undefined);
            let cached = lyricTextCache.get(lyricFile);
            if (!cached) {
                cached = readFileAsText(lyricFile);
                lyricTextCache.set(lyricFile, cached);
            }
            return cached;
        };
        const audioFiles = allFiles.filter(isAudioFile);
        if (audioFiles.length === 0)
            return;
        const existingHashes = new Set(get().localTracks.map((track) => track.fileHash).filter(Boolean));
        const batchHashes = new Set();
        const screenedFiles = [];
        let duplicateCount = 0;
        for (const file of audioFiles) {
            const fileHash = await hashLocalFile(file);
            if (playerPreferences.duplicateImportBehavior === 'skip' && (existingHashes.has(fileHash) || batchHashes.has(fileHash))) {
                duplicateCount += 1;
                console.info(`[LocalLibrary] Duplicate file skipped: ${file.name}`);
                continue;
            }
            batchHashes.add(fileHash);
            screenedFiles.push({ file, fileHash });
        }
        if (screenedFiles.length === 0) {
            set({
                importProgress: {
                    total: 0,
                    done: 0,
                    current: '',
                    isRunning: false,
                    rejected: 0,
                    skippedDuplicates: duplicateCount,
                    abuseFlags: [],
                },
            });
            return;
        }
        set({
            importProgress: {
                total: screenedFiles.length,
                done: 0,
                current: '',
                isRunning: true,
                rejected: 0,
                skippedDuplicates: duplicateCount,
                abuseFlags: [],
            }
        });
        const { parseBlob } = await import('music-metadata-browser');
        const newTracks = [];
        // Build a frequency map of potential artist strings to smartly deduce Artist vs Title
        const artistFrequencies = new Map();
        // Give existing library artists a massive score weight
        get().localTracks.forEach(t => {
            const clean = t.artist.trim().toLowerCase();
            if (clean && clean !== 'unknown artist') {
                artistFrequencies.set(clean, 1000);
            }
        });
        // Analyze the current batch to find repeating strings (which are usually the artist name)
        const cleanForArtistCheck = (str) => str.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim().toLowerCase();
        for (const { file } of screenedFiles) {
            const baseName = file.name.replace(/\.[^.]+$/, '').replace(/^\s*\d{1,3}\s*[-._]\s*/, '').replace(/\s+-\s*$/, '').trim();
            const parts = baseName.split(/\s+-\s+/).map(cleanFilenamePart).filter(Boolean);
            for (const part of parts) {
                const clean = cleanForArtistCheck(part);
                if (clean) {
                    artistFrequencies.set(clean, (artistFrequencies.get(clean) || 0) + 1);
                }
            }
        }
        for (let i = 0; i < screenedFiles.length; i++) {
            const { file, fileHash } = screenedFiles[i];
            set(s => ({
                importProgress: { ...s.importProgress, done: i, current: file.name }
            }));
            try {
                const metadata = await parseBlob(file);
                const { common, format } = metadata;
                const filenameMetadata = parseFilenameTemplate(file.name, artistFrequencies);
                // Extract cover art
                let coverUrl;
                if (common.picture && common.picture.length > 0) {
                    const pic = common.picture[0];
                    const base64 = btoa(pic.data.reduce((data, byte) => data + String.fromCharCode(byte), ''));
                    coverUrl = `data:${pic.format};base64,${base64}`;
                }
                const title = cleanFilenamePart(pickImportedText(common.title, filenameMetadata.title, filenameMetadata.title, playerPreferences.importMetadataMode));
                const artist = cleanFilenamePart(pickImportedText(common.artist || common.albumartist, filenameMetadata.artist, 'Unknown Artist', playerPreferences.importMetadataMode));
                const album = cleanFilenamePart(pickImportedText(common.album, filenameMetadata.album, 'Unknown Album', playerPreferences.importMetadataMode));
                const genre = pickImportedText(common.genre?.[0], filenameMetadata.genre, '', playerPreferences.importMetadataMode);
                const releaseYear = pickImportedYear(common.year, filenameMetadata.year, playerPreferences.importMetadataMode);
                coverUrl = coverUrl
                    || await getBatchCoverUrl(file)
                    || findReusableAlbumCover(album, artist, [...get().localTracks, ...newTracks]);
                const embeddedLyrics = getEmbeddedLyrics(metadata);
                const sidecarLyrics = await getBatchLyrics(file);
                const lyrics = playerPreferences.lyricsImportMode === 'sidecar'
                    ? sidecarLyrics || embeddedLyrics
                    : embeddedLyrics || sidecarLyrics;
                // Check duplicate by same title+artist
                const existingTracks = get().localTracks;
                const isDuplicate = playerPreferences.duplicateImportBehavior === 'skip' && existingTracks.some(t => t.title === title && t.artist === artist && t.album === album);
                if (isDuplicate)
                    continue;
                const track = {
                    id: generateId(),
                    title,
                    artist,
                    artistId: `local_artist_${slugifyLocalId(artist, 'unknown')}`,
                    album,
                    albumId: `local_album_${slugifyLocalId(album, 'unknown')}`,
                    duration: format.duration ? Math.round(format.duration) : Math.round(await getAudioDuration(file)),
                    genre,
                    releaseDate: releaseYear ? String(releaseYear) : '',
                    lyrics,
                    plays: 0,
                    explicit: false,
                    coverUrl,
                    coverGradient: stringToGradient(title + artist),
                    fileHash,
                    uploadStatus: 'approved',
                    visibility: 'private',
                    moderationFlags: ['local_import'],
                    blob: file,
                    isLocal: true,
                    addedAt: Date.now(),
                };
                await localDb.saveTrack(track);
                newTracks.push(track);
            }
            catch {
                // Fallback: add with basic metadata derived from filename
                const filenameMetadata = parseFilenameTemplate(file.name, artistFrequencies);
                const title = filenameMetadata.title;
                const artist = filenameMetadata.artist || 'Unknown Artist';
                const album = filenameMetadata.album || 'Unknown Album';
                const releaseYear = filenameMetadata.year;
                const coverUrl = await getBatchCoverUrl(file)
                    || findReusableAlbumCover(album, artist, [...get().localTracks, ...newTracks]);
                const lyrics = await getBatchLyrics(file);
                const track = {
                    id: generateId(),
                    title,
                    artist,
                    artistId: `local_artist_${slugifyLocalId(artist, 'unknown')}`,
                    album,
                    albumId: `local_album_${slugifyLocalId(album, 'unknown')}`,
                    duration: Math.round(await getAudioDuration(file)),
                    genre: filenameMetadata.genre || '',
                    releaseDate: releaseYear ? String(releaseYear) : '',
                    lyrics,
                    plays: 0,
                    explicit: false,
                    coverUrl,
                    coverGradient: stringToGradient(title + artist),
                    fileHash,
                    uploadStatus: 'approved',
                    visibility: 'private',
                    moderationFlags: ['local_import', 'metadata_parse_failed'],
                    blob: file,
                    isLocal: true,
                    addedAt: Date.now(),
                };
                await localDb.saveTrack(track);
                newTracks.push(track);
            }
        }
        set(s => ({
            localTracks: [...s.localTracks, ...newTracks],
            importProgress: {
                ...s.importProgress,
                total: screenedFiles.length,
                done: screenedFiles.length,
                current: '',
                isRunning: false,
            },
        }));
    },
    removeTrack: async (id) => {
        await localDb.deleteTrack(id);
        set(s => ({ localTracks: s.localTracks.filter(t => t.id !== id) }));
    },
    updateTrack: async (id, updates) => {
        const { localTracks } = get();
        const track = localTracks.find(t => t.id === id);
        if (!track)
            return;
        const updated = { ...track, ...updates };
        await localDb.saveTrack(updated);
        set(s => ({ localTracks: s.localTracks.map(t => t.id === id ? updated : t) }));
        syncTrackIntoPlayer(updated);
    },
    clearLibrary: async () => {
        const { localTracks } = get();
        await Promise.all(localTracks.map(t => localDb.deleteTrack(t.id)));
        set({ localTracks: [] });
    },
    updateTrackDuration: async (id, duration) => {
        const { localTracks } = get();
        const track = localTracks.find(t => t.id === id);
        if (!track)
            return;
        const updated = { ...track, duration };
        await localDb.saveTrack(updated);
        set(s => ({ localTracks: s.localTracks.map(t => t.id === id ? updated : t) }));
        syncTrackIntoPlayer(updated);
    },
    createPlaylist: async (title) => {
        const playlist = {
            id: generateId(),
            title,
            description: '',
            owner: 'You',
            ownerName: 'You',
            trackIds: [],
            followers: 0,
            isPublic: false,
            isCollaborative: false,
            type: 'user',
            coverGradient: stringToGradient(title),
            createdAt: new Date().toISOString(),
        };
        await localDb.savePlaylist(playlist);
        set(s => ({ localPlaylists: [...s.localPlaylists, playlist] }));
        return playlist;
    },
    updatePlaylist: async (id, updates) => {
        const { localPlaylists } = get();
        const existing = localPlaylists.find(p => p.id === id);
        if (!existing)
            return;
        const updated = { ...existing, ...updates };
        await localDb.savePlaylist(updated);
        set(s => ({ localPlaylists: s.localPlaylists.map(p => p.id === id ? updated : p) }));
    },
    deletePlaylist: async (id) => {
        await localDb.deletePlaylist(id);
        set(s => ({ localPlaylists: s.localPlaylists.filter(p => p.id !== id) }));
    },
    addTrackToPlaylist: async (playlistId, trackId) => {
        const { localPlaylists } = get();
        const playlist = localPlaylists.find(p => p.id === playlistId);
        if (!playlist || playlist.trackIds.includes(trackId))
            return;
        const updated = { ...playlist, trackIds: [...playlist.trackIds, trackId] };
        await localDb.savePlaylist(updated);
        set(s => ({ localPlaylists: s.localPlaylists.map(p => p.id === playlistId ? updated : p) }));
    },
    removeTrackFromPlaylist: async (playlistId, trackId) => {
        const { localPlaylists } = get();
        const playlist = localPlaylists.find(p => p.id === playlistId);
        if (!playlist)
            return;
        const updated = { ...playlist, trackIds: playlist.trackIds.filter(id => id !== trackId) };
        await localDb.savePlaylist(updated);
        set(s => ({ localPlaylists: s.localPlaylists.map(p => p.id === playlistId ? updated : p) }));
    },
    reorderPlaylistTracks: async (playlistId, fromIdx, toIdx) => {
        const { localPlaylists } = get();
        const playlist = localPlaylists.find(p => p.id === playlistId);
        if (!playlist)
            return;
        const newIds = [...playlist.trackIds];
        const [moved] = newIds.splice(fromIdx, 1);
        newIds.splice(toIdx, 0, moved);
        const updated = { ...playlist, trackIds: newIds };
        await localDb.savePlaylist(updated);
        set(s => ({ localPlaylists: s.localPlaylists.map(p => p.id === playlistId ? updated : p) }));
    },
    recordPlay: (trackId) => {
        set(s => {
            const playCounts = { ...s.playCounts, [trackId]: (s.playCounts[trackId] || 0) + 1 };
            const lastPlayed = { ...s.lastPlayed, [trackId]: Date.now() };
            localDb.saveSetting('playCounts', playCounts);
            localDb.saveSetting('lastPlayed', lastPlayed);
            return { playCounts, lastPlayed };
        });
    },
    setSearchQuery: (q) => set({ searchQuery: q }),
    searchTracks: (query) => {
        const { localTracks } = get();
        if (!query.trim())
            return localTracks;
        const q = query.toLowerCase();
        return localTracks.filter(t => t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            (t.album || '').toLowerCase().includes(q) ||
            (t.genre || '').toLowerCase().includes(q));
    },
    getMostPlayed: (limit = 20) => {
        const { localTracks, playCounts } = get();
        return [...localTracks]
            .sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0))
            .slice(0, limit);
    },
    getRecentlyPlayed: (limit = 20) => {
        const { localTracks, lastPlayed } = get();
        return [...localTracks]
            .filter(t => lastPlayed[t.id])
            .sort((a, b) => (lastPlayed[b.id] || 0) - (lastPlayed[a.id] || 0))
            .slice(0, limit);
    },
}));
