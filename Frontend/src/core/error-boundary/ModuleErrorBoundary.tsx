import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ModuleErrorBoundaryProps {
  moduleName: string;
  moduleTitleAr: string;
  children: ReactNode;
}

interface ModuleErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ModuleErrorBoundary يعزل أي خطأ داخل شاشة رئيسية أو موديول كاملة.
 * إذا تعطلت موديول واحدة، لا يتوقف التطبيق ولا تتأثر باقي الشاشات في شريط التنقل السفلي.
 */
export class ModuleErrorBoundary extends Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'خطأ غير متوقع في الموديول',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[ModuleErrorBoundary:${this.props.moduleName}] Isolated fault:`,
      error,
      info.componentStack
    );
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.badge}>عطل معزول في قسم واحد فقط</Text>
            <Text style={styles.title}>
              تعذر عرض قسم «{this.props.moduleTitleAr}» مؤقتاً
            </Text>
            <Text style={styles.subtitle}>
              باقي أقسام تطبيق المنشية تعمل بشكل طبيعي تماماً. يمكنك التنقل بين الشاشات الأخرى أو إعادة المحاولة الآن.
            </Text>
            <Pressable style={styles.retryButton} onPress={this.handleReset}>
              <Text style={styles.retryButtonText}>إعادة تشغيل هذا القسم</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAF5EE',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 22,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
