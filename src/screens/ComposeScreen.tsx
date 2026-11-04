import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CameraOptions,
  ImageLibraryOptions,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import { CameraIcon, CloseIcon, ImageIcon } from '../components/Icons';
import { generateUUID } from '../services/storage';
import { queueManager } from '../services/queueManager';
import { LocalImage, Report } from '../types/report';

interface Props {
  onReportSubmitted: () => void;
}

export const ComposeScreen: React.FC<Props> = ({ onReportSubmitted }) => {
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<LocalImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Android Runtime Permission for Camera
   */
  const checkAndRequestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (alreadyGranted) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission Needed',
          message: 'SnapReport needs access to your camera to take inspection photos.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Grant Permission',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Permission Blocked',
          'Camera permission is disabled. Please open device Settings to allow camera access for SnapReport.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      } else {
        Alert.alert(
          'Camera Permission Required',
          'SnapReport cannot capture photos without camera permission. You can enable it in device Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
      return false;
    } catch (err) {
      console.warn('Camera permission error:', err);
      return false;
    }
  };

  // Open camera
  const handleTakePhoto = async () => {
    if (selectedImages.length >= 5) {
      Alert.alert(
        'Maximum 5 Photos Reached',
        'You have already attached the maximum allowed 5 inspection photos. To replace a photo, tap the (✕) button on any image first.'
      );
      return;
    }

    // Android runtime permission check
    const hasPermission = await checkAndRequestCameraPermission();
    if (!hasPermission) return;

    const options: CameraOptions = {
      mediaType: 'photo',
      saveToPhotos: false,
      quality: 1, // Full camera quality (raw size)
    };

    try {
      const response = await launchCamera(options);

      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Camera Error', response.errorMessage || 'Failed to open camera');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        if (asset.uri) {
          const newImage: LocalImage = {
            id: generateUUID(),
            uri: asset.uri,
            fileSizeBytes: asset.fileSize || 0,
            width: asset.width,
            height: asset.height,
            isCompressed: false,
          };
          setSelectedImages((prev) => [...prev, newImage]);
        }
      }
    } catch (err: any) {
      Alert.alert('Permission / Camera Error', err.message);
    }
  };

  // Open gallery
  const handlePickFromGallery = async () => {
    const remainingSlots = 5 - selectedImages.length;
    if (remainingSlots <= 0) {
      Alert.alert(
        'Maximum 5 Photos Reached',
        'You have already attached the maximum allowed 5 inspection photos. To replace a photo, tap the (✕) button on any image first.'
      );
      return;
    }

    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      selectionLimit: remainingSlots,
      quality: 1,
    };

    try {
      const response = await launchImageLibrary(options);

      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Gallery Error', response.errorMessage || 'Failed to open gallery');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const newImages: LocalImage[] = response.assets
          .filter((asset) => asset.uri)
          .map((asset) => ({
            id: generateUUID(),
            uri: asset.uri!,
            fileSizeBytes: asset.fileSize || 0,
            width: asset.width,
            height: asset.height,
            isCompressed: false,
          }));

        setSelectedImages((prev) => [...prev, ...newImages].slice(0, 5));
      }
    } catch (err: any) {
      Alert.alert('Permission / Gallery Error', err.message);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = async () => {
    const trimmedDesc = description.trim();

    if (!trimmedDesc) {
      Alert.alert('Description Required', 'Please enter a short description for the report.');
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert('Photo Required', 'Please attach at least 1 photo (1 to 5 photos allowed).');
      return;
    }

    if (selectedImages.length > 5) {
      Alert.alert('Limit Exceeded', 'A report cannot have more than 5 photos.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newReport: Report = {
        id: generateUUID(),
        description: trimmedDesc,
        images: selectedImages,
        createdAt: new Date().toISOString(),
        status: 'QUEUED',
        retryCount: 0,
      };

      await queueManager.enqueue(newReport);

      setDescription('');
      setSelectedImages([]);

      Alert.alert(
        'Report Saved to Queue',
        'Your report is securely saved on the device and queued for delivery.',
        [{ text: 'View Outbox', onPress: onReportSubmitted }]
      );
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save report: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>New Field Report</Text>
        <Text style={styles.subtitle}>
          Capture inspection details and 1–5 photos. Works offline automatically.
        </Text>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Broken foundation beam observed at Sector B-3"
            placeholderTextColor="#80868B"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Photos Section */}
        <View style={styles.inputGroup}>
          <View style={styles.photoHeaderRow}>
            <Text style={styles.label}>
              Inspection Photos ({selectedImages.length} / 5) <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.photoRule}>1 to 5 photos</Text>
          </View>

          {/* Action Buttons: Camera & Gallery */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionBtn, selectedImages.length >= 5 && styles.actionBtnFull]}
              onPress={handleTakePhoto}
            >
              <CameraIcon
                size={18}
                color={selectedImages.length >= 5 ? '#5F6368' : '#1A73E8'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  selectedImages.length >= 5 && styles.actionBtnTextFull,
                ]}
              >
                Take Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, selectedImages.length >= 5 && styles.actionBtnFull]}
              onPress={handlePickFromGallery}
            >
              <ImageIcon
                size={18}
                color={selectedImages.length >= 5 ? '#5F6368' : '#1A73E8'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  selectedImages.length >= 5 && styles.actionBtnTextFull,
                ]}
              >
                Choose Gallery
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected Photos Thumbnails */}
          {selectedImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
              {selectedImages.map((img, idx) => (
                <View key={img.id} style={styles.thumbWrapper}>
                  <Image source={{ uri: img.uri }} style={styles.thumbnail} />
                  <TouchableOpacity
                    style={styles.removeBadge}
                    onPress={() => handleRemovePhoto(img.id)}
                  >
                    <CloseIcon size={12} color="#FFFFFF" strokeWidth={2.8} />
                  </TouchableOpacity>
                  <Text style={styles.thumbIndex}>#{idx + 1}</Text>
                  {img.fileSizeBytes > 0 && (
                    <Text style={styles.sizeText}>
                      {(img.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyPhotoBox}>
              <Text style={styles.emptyPhotoText}>No photos attached yet (Minimum 1 required)</Text>
            </View>
          )}
        </View>

        {/* Submit to Queue Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitBtnText}>
            {isSubmitting ? 'Saving to Queue...' : 'Save & Queue Report'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#5F6368',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
  },
  required: {
    color: '#D93025',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#202124',
    textAlignVertical: 'top',
    minHeight: 90,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoRule: {
    fontSize: 12,
    color: '#5F6368',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1A73E8',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  actionBtnDisabled: {
    borderColor: '#DADCE0',
    opacity: 0.5,
  },
  actionBtnFull: {
    borderColor: '#DADCE0',
    backgroundColor: '#F8F9FA',
  },
  actionBtnText: {
    color: '#1A73E8',
    fontSize: 13.5,
    fontWeight: '600',
  },
  actionBtnTextFull: {
    color: '#5F6368',
  },
  emptyPhotoBox: {
    borderWidth: 1.5,
    borderColor: '#DADCE0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  emptyPhotoText: {
    fontSize: 13,
    color: '#80868B',
  },
  thumbScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  thumbWrapper: {
    position: 'relative',
    marginRight: 12,
    alignItems: 'center',
  },
  thumbnail: {
    width: 82,
    height: 82,
    borderRadius: 8,
    backgroundColor: '#E8EAED',
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#D93025',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  thumbIndex: {
    fontSize: 10.5,
    color: '#5F6368',
    marginTop: 4,
  },
  sizeText: {
    fontSize: 10,
    color: '#80868B',
  },
  submitBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: {
    backgroundColor: '#8AB4F8',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

