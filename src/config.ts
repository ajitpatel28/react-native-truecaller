import { Platform, processColor, type ColorValue } from 'react-native';
import type { AndroidNativeConfig, TruecallerConfig } from './interfaces';
import {
  DEFAULT_BUTTON_TEXT_COLOR,
  DEFAULT_BUTTON_COLOR,
  DEFAULT_BUTTON_SHAPE,
  DEFAULT_BUTTON_TEXT,
  DEFAULT_CONSENT_HEADING,
  DEFAULT_FOOTER_BUTTON_TEXT,
} from './constants';

// Native expects an ARGB int; an unparseable colour falls back to the default
// instead of failing SDK init.
export const toNativeColor = (
  color: ColorValue | undefined,
  fallback: string
) => {
  const processed = processColor(color ?? fallback);
  // The fallbacks are hex constants, so processColor always returns a number for them.
  return (
    typeof processed === 'number' ? processed : processColor(fallback)
  ) as number;
};

export const toAndroidNativeConfig = (
  config: TruecallerConfig
): AndroidNativeConfig => {
  const nativeConfig: AndroidNativeConfig = {
    buttonColor: toNativeColor(config.androidButtonColor, DEFAULT_BUTTON_COLOR),
    buttonTextColor: toNativeColor(
      config.androidButtonTextColor,
      DEFAULT_BUTTON_TEXT_COLOR
    ),
    buttonText: config.androidButtonText || DEFAULT_BUTTON_TEXT,
    buttonShape: config.androidButtonShape || DEFAULT_BUTTON_SHAPE,
    footerButtonText:
      config.androidFooterButtonText || DEFAULT_FOOTER_BUTTON_TEXT,
    consentHeading: config.androidConsentHeading || DEFAULT_CONSENT_HEADING,
  };
  if (config.androidConsentMode) {
    nativeConfig.consentMode = config.androidConsentMode;
  }
  if (config.androidSdkOptions) {
    nativeConfig.sdkOptions = config.androidSdkOptions;
  }
  if (config.androidDarkMode !== undefined) {
    nativeConfig.darkMode = config.androidDarkMode;
  }
  if (config.androidEnhancedBottomSheet !== undefined) {
    nativeConfig.enhancedBottomSheet = config.androidEnhancedBottomSheet;
  }
  return nativeConfig;
};

export const getConfigError = (config: TruecallerConfig): string | null => {
  if (Platform.OS === 'android' && !config.androidClientId) {
    return 'Android client ID is required for Android platform';
  }
  if (Platform.OS === 'ios' && (!config.iosAppKey || !config.iosAppLink)) {
    return 'iOS app key and app link are required for iOS platform';
  }
  return null;
};
