import { StyleSheet } from 'react-native';
import { APP_THEME } from '@/core/theme/colors';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';

export const authStepStyles = StyleSheet.create({
  stepBody: {
    width: '100%',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  fieldBlock: {
    width: '100%',
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: rtlTextAlign,
    marginBottom: 8,
  },
  textInput: {
    height: 52,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 0,
    fontSize: 15,
    color: '#0F172A',
    textAlign: rtlTextAlign,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: APP_THEME.primary,
    borderRadius: 14,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: APP_THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resendWrap: {
    marginTop: 18,
    alignItems: 'center',
  },
  resendTimerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  resendActionText: {
    fontSize: 14,
    color: APP_THEME.primary,
    fontWeight: '800',
  },
});
