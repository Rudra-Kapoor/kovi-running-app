import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const INSTAGRAM_APP_ID = process.env.EXPO_PUBLIC_INSTAGRAM_APP_ID ?? '';

/** Saves the rendered story card PNG to the camera roll. */
export async function saveToDevice(uri: string) {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) throw new Error('Photos permission is needed to save the card.');
  await MediaLibrary.saveToLibraryAsync(uri);
}

/**
 * Shares the story card to Instagram Stories.
 *  - Android: Instagram's ADD_TO_STORY intent opens the story composer directly with the image.
 *  - iOS: Instagram's pasteboard API needs native code, so the share sheet is used - the user picks
 *    Instagram > "Story". If Instagram is not installed, the share sheet is shown on both platforms.
 * Returns which path was used so the UI can explain.
 */
export async function shareToInstagramStory(uri: string): Promise<'instagram' | 'sheet'> {
  if (Platform.OS === 'android') {
    try {
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('com.instagram.share.ADD_TO_STORY', {
        data: contentUri,
        type: 'image/png',
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        packageName: 'com.instagram.android',
        extra: INSTAGRAM_APP_ID ? { source_application: INSTAGRAM_APP_ID } : undefined,
      });
      return 'instagram';
    } catch {
      // Instagram not installed or intent rejected - fall back to the system sheet.
    }
  } else if (await Linking.canOpenURL('instagram://app').catch(() => false)) {
    // Share sheet lists Instagram (Story/Feed) for images.
    await shareSheet(uri);
    return 'sheet';
  }
  await shareSheet(uri);
  return 'sheet';
}

export async function shareSheet(uri: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your run' });
}
