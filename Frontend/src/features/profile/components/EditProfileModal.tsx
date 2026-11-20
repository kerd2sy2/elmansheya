import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TextInput,
  Keyboard,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { useSmoothKeyboardOffset } from '@/core/theme/useSmoothKeyboardOffset';
import { styles } from '../styles/profile.styles';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  initialBirthDate: string;
  initialArea: string;
  onSave: (data: { full_name: string; birth_date: string; area: string }) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  initialName,
  initialBirthDate,
  initialArea,
  onSave,
}) => {
  const [name, setName] = useState(initialName);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [area, setArea] = useState(initialArea);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setBirthDate(initialBirthDate);
      setArea(initialArea);
    }
  }, [visible, initialName, initialBirthDate, initialArea]);

  const keyboardOffset = useSmoothKeyboardOffset(Platform.OS === 'android' ? 14 : 0);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'برجاء كتابة الاسم الكامل');
      return;
    }
    Keyboard.dismiss();
    onSave({
      full_name: name.trim(),
      birth_date: birthDate.trim(),
      area: area.trim(),
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}>
      <Pressable
        style={styles.sheetOverlay}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}>
        <Animated.View
          style={[
            styles.bottomSheetBox,
            { paddingBottom: Animated.add(keyboardOffset, Platform.OS === 'android' ? 24 : 36) },
          ]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetDragBar} />

            <Text style={styles.sheetInputLabel}>الاسم الكامل</Text>
            <TextInput
              style={styles.sheetInput}
              value={name}
              onChangeText={setName}
              placeholder="اكتب اسمك الثلاثي أو الرباعي"
              placeholderTextColor="#94A3B8"
              textAlign="right"
            />

            <Text style={styles.sheetInputLabel}>تاريخ الميلاد</Text>
            <TextInput
              style={styles.sheetInput}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="مثال: 15/08/1995"
              placeholderTextColor="#94A3B8"
              textAlign="right"
            />

            <Text style={styles.sheetInputLabel}>المنطقة / الحي داخل القرية</Text>
            <TextInput
              style={styles.sheetInput}
              value={area}
              onChangeText={setArea}
              placeholder="اسم الحي أو المنطقة بالقرية"
              placeholderTextColor="#94A3B8"
              textAlign="right"
            />

            <Pressable style={styles.sheetSaveBtnSingle} onPress={handleSave}>
              <Text style={styles.sheetSaveBtnText}>حفظ البيانات</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};
