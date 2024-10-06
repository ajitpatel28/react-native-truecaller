import { useState, useEffect, useCallback } from 'react';
import {
  Platform,
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
} from 'react-native';
import axios from 'axios';
import type {
  TruecallerConfig,
  TruecallerUserProfile,
  UseTruecallerResult,
  TruecallerAndroidResponse,
  TruecallerIOSResponse,
} from '../interfaces';
import {
  TRUECALLER_ANDROID_EVENTS,
  TRUECALLER_IOS_EVENTS,
  TRUECALLER_API_URLS,
} from '../constants';

const TruecallerAndroidModule = NativeModules.TruecallerModule;
const TruecallerIOS = NativeModules.ReactNativeTruecaller;

export const useTruecaller = (
  config: TruecallerConfig
): UseTruecallerResult => {
  const [userProfile, setUserProfile] = useState<TruecallerUserProfile | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeSDK = useCallback(async () => {
    try {
      if (Platform.OS === 'android' && !config.androidClientId) {
        throw new Error('Android client ID is required for Android platform');
      }
      if (Platform.OS === 'ios' && (!config.iosAppKey || !config.iosAppLink)) {
        throw new Error(
          'iOS app key and app link are required for iOS platform'
        );
      }

      if (Platform.OS === 'android') {
        await TruecallerAndroidModule.initializeSdk(config);
      } else {
        await TruecallerIOS.initializeSdk(config);
      }
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setIsInitialized(false);
    }
  }, [config]);

  useEffect(() => {
    let successListener: any;
    let failureListener: any;

    if (isInitialized) {
      if (Platform.OS === 'android') {
        if (!config.androidClientId) {
          setError('Android client ID is required for Android platform');
          return;
        }
        successListener = DeviceEventEmitter.addListener(
          TRUECALLER_ANDROID_EVENTS.SUCCESS,
          handleAuthorizationSuccess
        );

        failureListener = DeviceEventEmitter.addListener(
          TRUECALLER_ANDROID_EVENTS.FAILURE,
          (err: { errorMessage: string }) => {
            setError(err.errorMessage);
            setUserProfile(null);
          }
        );
      } else if (Platform.OS === 'ios') {
        if (!config.iosAppKey || !config.iosAppLink) {
          setError('iOS app key and app link are required for iOS platform');
          return;
        }
        const eventEmitter = new NativeEventEmitter(TruecallerIOS);

        successListener = eventEmitter.addListener(
          TRUECALLER_IOS_EVENTS.SUCCESS,
          handleAuthorizationSuccess
        );

        failureListener = eventEmitter.addListener(
          TRUECALLER_IOS_EVENTS.FAILURE,
          (err: { errorMessage: string }) => {
            setError(err.errorMessage);
            setUserProfile(null);
          }
        );
      }
    }

    return () => {
      if (successListener) {
        if (Platform.OS === 'android') {
          successListener.remove();
        } else {
          successListener.remove();
        }
      }
      if (failureListener) {
        if (Platform.OS === 'android') {
          failureListener.remove();
        } else {
          failureListener.remove();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, config]);

  const handleAuthorizationSuccess = async (
    data: TruecallerAndroidResponse | TruecallerIOSResponse
  ) => {
    try {
      if (Platform.OS === 'android') {
        const { authorizationCode, codeVerifier } =
          data as TruecallerAndroidResponse;
        const accessToken = await exchangeAuthorizationCodeForAccessToken(
          authorizationCode,
          codeVerifier
        );
        const userInfo = await fetchUserProfile(accessToken);
        setUserProfile(userInfo);
      } else {
        // For iOS, the profile data is directly available
        setUserProfile(
          mapIOSResponseToUserProfile(data as TruecallerIOSResponse)
        );
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setUserProfile(null);
    }
  };

  const exchangeAuthorizationCodeForAccessToken = async (
    authorizationCode: string,
    codeVerifier: string
  ): Promise<string> => {
    const clientId = config.androidClientId;
    const response = await axios.post(TRUECALLER_API_URLS.TOKEN_URL, {
      grant_type: 'authorization_code',
      client_id: clientId,
      code: authorizationCode,
      code_verifier: codeVerifier,
    });
    return response.data.access_token;
  };

  const fetchUserProfile = async (
    accessToken: string
  ): Promise<TruecallerUserProfile> => {
    const response = await axios.get(TRUECALLER_API_URLS.USER_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return mapAndroidResponseToUserProfile(response.data);
  };

  const mapAndroidResponseToUserProfile = (
    data: TruecallerAndroidResponse
  ): TruecallerUserProfile => ({
    firstName: data.given_name,
    lastName: data.family_name,
    email: data.email,
    countryCode: data.phone_number_country_code,
    gender: data.gender,
    phoneNumber: data.phone_number,
  });

  const mapIOSResponseToUserProfile = (
    data: TruecallerIOSResponse
  ): TruecallerUserProfile =>
    ({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      countryCode: data.countryCode,
      gender: data.gender,
      phoneNumber: data.phoneNumber,
    }) as TruecallerUserProfile;

  const isSdkUsable = () => {
    if (Platform.OS === 'android') return TruecallerAndroidModule.isSdkUsable();
    else if (Platform.OS === 'ios') return TruecallerIOS.isSupported();
    return false;
  };

  const openTruecallerForVerification = useCallback(async () => {
    if (!isInitialized) {
      setError('SDK is not initialized. Call initializeSDK first.');
      return;
    }

    try {
      if (!isSdkUsable()) {
        throw new Error('Truecaller SDK is not usable on this device');
      }
      if (Platform.OS === 'android') {
        if (!config.androidClientId) {
          throw new Error('Android client ID is required for Android platform');
        }
        await TruecallerAndroidModule.requestAuthorizationCode();
      } else {
        if (!config.iosAppKey || !config.iosAppLink) {
          throw new Error(
            'iOS app key and app link are required for iOS platform'
          );
        }
        await TruecallerIOS.requestTrueProfile();
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [isInitialized, config]);

  return {
    userProfile,
    error,
    initializeSDK,
    openTruecallerForVerification,
  };
};
