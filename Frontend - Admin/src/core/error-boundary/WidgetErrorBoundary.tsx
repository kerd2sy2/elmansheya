import { Ionicons } from '@expo/vector-icons';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface WidgetErrorBoundaryProps {
  widgetNameAr: string;
  children: ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

/**
 * WidgetErrorBoundary يعزل جزءاً صغيراً داخل الشاشة الواحدة.
 * إذا تعطل هذا الجزء، تظهر رسالة صغيرة مكانه فقط بينما تظل باقي الشاشة تعمل بشكل طبيعي.
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn(
      `[WidgetErrorBoundary:${this.props.widgetNameAr}] Isolated widget fault:`,
      error,
      info.componentStack
    );
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.box}>
          <View style={styles.leftRow}>
            <Ionicons name="warning-outline" size={18} color="#92400E" />
            <Text style={styles.text}>
              تعذر عرض «{this.props.widgetNameAr}» حالياً
            </Text>
          </View>
          <Pressable style={styles.button} onPress={this.handleRetry}>
            <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
            <Text style={styles.buttonText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  text: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  button: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
