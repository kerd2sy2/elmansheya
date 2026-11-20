import React from 'react';
import { Modal, Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/profile.styles';

interface AvatarActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickFromGallery: () => void;
  onRemovePhoto: () => void;
  hasAvatar: boolean;
}

export const AvatarActionSheet: React.FC<AvatarActionSheetProps> = ({
  visible,
  onClose,
  onTakePhoto,
  onPickFromGallery,
  onRemovePhoto,
  hasAvatar,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable
        style={styles.sheetOverlay}
        onPress={onClose}>
        <Pressable
          style={styles.bottomSheetBox}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetDragBar} />

          <Pressable style={styles.sheetOptionRow} onPress={onTakePhoto}>
            <View style={[styles.sheetIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="camera" size={20} color="#973c00" />
            </View>
            <Text style={styles.sheetOptionText}>التقاط صورة بالكاميرا</Text>
          </Pressable>

          <Pressable style={styles.sheetOptionRow} onPress={onPickFromGallery}>
            <View style={[styles.sheetIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="image" size={20} color="#0284C7" />
            </View>
            <Text style={styles.sheetOptionText}>اختيار صورة من المعرض</Text>
          </Pressable>

          {hasAvatar ? (
            <Pressable
              style={[styles.sheetOptionRow, { borderBottomWidth: 0 }]}
              onPress={onRemovePhoto}>
              <View style={[styles.sheetIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              </View>
              <Text style={[styles.sheetOptionText, { color: '#DC2626' }]}>
                حذف الصورة الحالية
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
