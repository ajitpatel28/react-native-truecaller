import { type ColorValue } from 'react-native';
import type { TRUECALLER_ANDROID_CUSTOMIZATIONS } from './constants';

/**
 * Type for Button Text Customizations
 */
export type TruecallerButtonTextKey =
  keyof typeof TRUECALLER_ANDROID_CUSTOMIZATIONS.BUTTON_TEXTS;
export type TruecallerButtonTextValue =
  (typeof TRUECALLER_ANDROID_CUSTOMIZATIONS.BUTTON_TEXTS)[TruecallerButtonTextKey];

/**
 * Type for Button Shape Customizations
 */
export type TruecallerButtonShapeKey =
  keyof typeof TRUECALLER_ANDROID_CUSTOMIZATIONS.BUTTON_SHAPES;
export type TruecallerButtonShapeValue =
  (typeof TRUECALLER_ANDROID_CUSTOMIZATIONS.BUTTON_SHAPES)[TruecallerButtonShapeKey];

/**
 * Type for Footer Button Text Customizations
 */
export type TruecallerFooterButtonTextKey =
  keyof typeof TRUECALLER_ANDROID_CUSTOMIZATIONS.FOOTER_TEXTS;
export type TruecallerFooterButtonTextValue =
  (typeof TRUECALLER_ANDROID_CUSTOMIZATIONS.FOOTER_TEXTS)[TruecallerFooterButtonTextKey];

/**
 * Type for Consent Heading Customizations
 */
export type TruecallerConsentHeadingKey =
  keyof typeof TRUECALLER_ANDROID_CUSTOMIZATIONS.CONSENT_HEADINGS;
export type TruecallerConsentHeadingValue =
  (typeof TRUECALLER_ANDROID_CUSTOMIZATIONS.CONSENT_HEADINGS)[TruecallerConsentHeadingKey];

/**
 * Configuration interface for initializing Truecaller
 */
export interface TruecallerConfig {
  /** Android client ID for Truecaller SDK */
  androidClientId?: string;
  /** iOS app key for Truecaller SDK */
  iosAppKey?: string;
  /** iOS app link for Truecaller SDK */
  iosAppLink?: string;
  /** Color of the Truecaller button on Android */
  androidButtonColor?: ColorValue;
  /** Text color of the Truecaller button on Android */
  androidButtonTextColor?: ColorValue;
  /** Shape of the Truecaller button on Android */
  androidButtonShape?: TruecallerButtonShapeValue;
  /** Text displayed on the Truecaller button on Android */
  androidButtonText?: TruecallerButtonTextValue;
  /** Text displayed on the footer button on Android */
  androidFooterButtonText?: TruecallerFooterButtonTextValue;
  /** Heading text for the consent screen on Android */
  androidConsentHeading?: TruecallerConsentHeadingValue;
}

/**
 * User Profile Interface returned by Truecaller
 */
export interface TruecallerUserProfile {
  firstName: string;
  lastName: string | null;
  phoneNumber: string;
  countryCode: string;
  gender: string | null;
  email: string | null;
}

/**
 * Android-specific user response interface
 */
export interface TruecallerAndroidResponse {
  authorizationCode: string;
  codeVerifier: string;
  given_name: string;
  family_name: string | null;
  phone_number: string;
  phone_number_country_code: string;
  gender: string | null;
  email: string | null;
}

/**
 * iOS-specific user response interface
 */
export interface TruecallerIOSResponse {
  firstName: string;
  lastName: string | null;
  phoneNumber: string;
  countryCode: string;
  gender: string | null;
  email: string | null;
}

/**
 * Interface for the Truecaller hook result
 */
export interface UseTruecallerResult {
  userProfile: TruecallerUserProfile | null;
  error: string | null;
  initializeSDK: () => Promise<void>;
  openTruecallerForVerification: () => Promise<void>;
}
