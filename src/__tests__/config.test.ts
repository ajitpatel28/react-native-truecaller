import { Platform, processColor } from 'react-native';
import { getConfigError, toAndroidNativeConfig } from '../config';
import {
  DEFAULT_BUTTON_COLOR,
  DEFAULT_BUTTON_SHAPE,
  DEFAULT_BUTTON_TEXT,
  DEFAULT_BUTTON_TEXT_COLOR,
  DEFAULT_CONSENT_HEADING,
  DEFAULT_FOOTER_BUTTON_TEXT,
  TRUECALLER_ANDROID_CUSTOMIZATIONS,
} from '../constants';

describe('toAndroidNativeConfig', () => {
  it('fills defaults and omits optional keys that were not set', () => {
    expect(toAndroidNativeConfig({ androidClientId: 'id' })).toEqual({
      buttonColor: processColor(DEFAULT_BUTTON_COLOR),
      buttonTextColor: processColor(DEFAULT_BUTTON_TEXT_COLOR),
      buttonText: DEFAULT_BUTTON_TEXT,
      buttonShape: DEFAULT_BUTTON_SHAPE,
      footerButtonText: DEFAULT_FOOTER_BUTTON_TEXT,
      consentHeading: DEFAULT_CONSENT_HEADING,
    });
  });

  it('passes every option through, keeping explicit false booleans', () => {
    const { BUTTON_TEXTS, BUTTON_SHAPES, FOOTER_TEXTS, CONSENT_HEADINGS } =
      TRUECALLER_ANDROID_CUSTOMIZATIONS;
    expect(
      toAndroidNativeConfig({
        androidButtonColor: '#F45722',
        androidButtonTextColor: 'white',
        androidButtonText: BUTTON_TEXTS.PROCEED,
        androidButtonShape: BUTTON_SHAPES.RECTANGLE,
        androidFooterButtonText: FOOTER_TEXTS.ANOTHER_METHOD,
        androidConsentHeading: CONSENT_HEADINGS.CHECKOUT_WITH,
        androidConsentMode: 'TRUECALLER_ANDROID_CONSENT_MODE_POPUP',
        androidSdkOptions: 'TRUECALLER_ANDROID_SDK_OPTION_VERIFY_ALL_USERS',
        androidDarkMode: false,
        androidEnhancedBottomSheet: false,
      })
    ).toEqual({
      buttonColor: processColor('#F45722'),
      buttonTextColor: processColor('white'),
      buttonText: BUTTON_TEXTS.PROCEED,
      buttonShape: BUTTON_SHAPES.RECTANGLE,
      footerButtonText: FOOTER_TEXTS.ANOTHER_METHOD,
      consentHeading: CONSENT_HEADINGS.CHECKOUT_WITH,
      consentMode: 'TRUECALLER_ANDROID_CONSENT_MODE_POPUP',
      sdkOptions: 'TRUECALLER_ANDROID_SDK_OPTION_VERIFY_ALL_USERS',
      darkMode: false,
      enhancedBottomSheet: false,
    });
  });

  it('falls back to the default for an unparseable colour', () => {
    const { buttonColor } = toAndroidNativeConfig({
      androidButtonColor: 'not-a-colour',
    });
    expect(buttonColor).toBe(processColor(DEFAULT_BUTTON_COLOR));
  });
});

describe('getConfigError', () => {
  it.each([
    ['android', {}, 'Android client ID is required for Android platform'],
    ['android', { androidClientId: 'id' }, null],
    [
      'ios',
      { iosAppKey: 'key' },
      'iOS app key and app link are required for iOS platform',
    ],
    ['ios', { iosAppKey: 'key', iosAppLink: 'link' }, null],
  ] as const)('%s %p → %p', (os, config, expected) => {
    Platform.OS = os;
    expect(getConfigError(config)).toBe(expected);
  });
});
