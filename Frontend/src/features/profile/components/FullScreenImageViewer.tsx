import React from 'react';
import { Modal, View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDirectImageUrl } from '@/core/utils/googleDrive';
import { styles } from '../styles/profile.styles';

interface FullScreenImageViewerProps {
  visible: boolean;
  onClose: () => void;
  fullName: string;
  avatarUrl?: string | null;
  initials: string;
  topInset: number;
}

export const FullScreenImageViewer: React.FC<FullScreenImageViewerProps> = ({
  visible,
  onClose,
  fullName,
  avatarUrl,
  initials,
  topInset,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.fullScreenViewerContainer}>
        {/* شريط علوي للهيدر */}
        <View style={[styles.fullScreenViewerHeader, { paddingTop: topInset + 10 }]}>
          <View style={styles.fullScreenViewerUserCol}>
            <Text style={styles.fullScreenViewerName} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={styles.fullScreenViewerSub}>الصورة الشخصية</Text>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.fullScreenCloseBtn}
            hitSlop={12}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* محتوى الصورة بالكامل بوسط الشاشة */}
        <Pressable
          style={styles.fullScreenImageBody}
          onPress={onClose}>
          {getDirectImageUrl(avatarUrl) ? (
            <Image
              source={{ uri: getDirectImageUrl(avatarUrl)! }}
              style={styles.fullScreenAvatarImg}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.fullScreenInitialsCircle}>
              <Text style={styles.fullScreenInitialsText}>{initials}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </Modal>
  );
};
