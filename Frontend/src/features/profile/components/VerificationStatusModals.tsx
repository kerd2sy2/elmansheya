import React from 'react';
import { Modal, Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/profile.styles';

interface VerifiedUserModalProps {
  visible: boolean;
  onClose: () => void;
  fullName: string;
  phone: string;
}

export const VerifiedUserModal: React.FC<VerifiedUserModalProps> = ({
  visible,
  onClose,
  fullName,
  phone,
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
          <View style={styles.verifiedHeaderIcon}>
            <Ionicons name="shield-checkmark" size={44} color="#15803D" />
          </View>
          <Text style={styles.verifiedModalDesc}>
            تمت مراجعة بطاقة الرقم القومي الخاصة بك واعتماد حسابك رسمياً كمواطن موثق في قرية المنشية.
          </Text>
          <View style={styles.verifiedDetailRow}>
            <Ionicons name="checkmark-circle" size={16} color="#15803D" />
            <Text style={styles.verifiedDetailText}>
              الاسم المعتمد: {fullName}
            </Text>
          </View>
          <View style={styles.verifiedDetailRow}>
            <Ionicons name="checkmark-circle" size={16} color="#15803D" />
            <Text style={styles.verifiedDetailText}>
              الهاتف المسجل: {phone}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

interface PendingUserModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PendingUserModal: React.FC<PendingUserModalProps> = ({
  visible,
  onClose,
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
          <View style={styles.pendingHeaderIcon}>
            <Ionicons name="time" size={44} color="#0284C7" />
          </View>
          <Text style={styles.pendingModalDesc}>
            تم استلام صور البطاقة وتشفيرها بنجاح بخوارزمية AES-256. يقوم مشرفو القرية حالياً بمطابقة البيانات لتفعيل شارة التوثيق في أقرب وقت.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
