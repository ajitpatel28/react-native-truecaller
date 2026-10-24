import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from 'react';
import {
  Platform,
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
  type EventSubscription,
} from 'react-native';
import type {
  TruecallerConfig,
  TruecallerUserProfile,
  UseTruecallerResult,
  TruecallerAndroidResponse,
  TruecallerIOSResponse,
  TruecallerError,
} from '../interfaces';
import { TRUECALLER_ANDROID_EVENTS, TRUECALLER_IOS_EVENTS } from '../constants';
import { toAndroidNativeConfig, getConfigError } from '../config';
import {
  mapAndroidUserInfoToUserProfile,
  mapIOSResponseToUserProfile,
} from '../profile';
import { fetchAndroidUserInfo } from '../api';

const TruecallerAndroidModule = NativeModules.TruecallerModule;
const TruecallerIOS = NativeModules.ReactNativeTruecaller;

const isSdkUsable = async (): Promise<boolean> => {
  if (Platform.OS === 'android') return TruecallerAndroidModule.isSdkUsable();
  if (Platform.OS === 'ios') return TruecallerIOS.isSupported();
  return false;
};

export const useTruecaller = (
  latestConfig: TruecallerConfig
): UseTruecallerResult => {
  // Callers often pass an inline object; reading the latest config through a
  // ref keeps callbacks stable and listeners subscribed across re-renders.
  const configRef = useRef(latestConfig);
  useLayoutEffect(() => {
    configRef.current = latestConfig;
  });
  const [userProfile, setUserProfile] = useState<TruecallerUserProfile | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isTruecallerInitialized, setIsTruecallerInitialized] = useState(false);
  const [isUsable, setIsUsable] = useState<boolean | undefined>(undefined);
  const initListenersRef = useRef<EventSubscription[]>([]);

  // Removes not-yet-fired init listeners so a late event from an earlier init
  // can't flip state after a retry, a clear, or unmount.
  const clearInitListeners = useCallback(() => {
    initListenersRef.current.forEach((l) => l.remove());
    initListenersRef.current = [];
  }, []);

  const initializeTruecallerSDK = useCallback(async () => {
    const config = configRef.current;
    try {
      const configError = getConfigError(config);
      if (configError) throw new Error(configError);

      if (Platform.OS === 'android') {
        clearInitListeners();

        // Init is async: initializeSdk() only accepts the request, and a
        // failure can be reported before isTruecallerInitialized ever becomes
        // true, via two different native channels:
        // - TRUECALLER_ANDROID_EVENTS.ERROR: TruecallerModule.java's
        //   initializeSdk() catch block, for exceptions thrown on the JS
        //   wrapper's own side (e.g. malformed config).
        // - TRUECALLER_ANDROID_EVENTS.FAILURE: the SDK's own
        //   TcOAuthCallback.onFailure(TcOAuthError), which is how the SDK
        //   itself reports failures (including SdkInitError-style init
        //   failures) through the same callback used for the OAuth flow.
        // Without listeners registered up front for both, an init-time
        // failure would be dropped on the floor and the hook would hang
        // silently forever.
        const handleInitFailure = (err: TruecallerError) => {
          setError(err.errorMessage);
          clearInitListeners();
        };
        initListenersRef.current = [
          DeviceEventEmitter.addListener(
            TRUECALLER_ANDROID_EVENTS.READY,
            () => {
              setIsTruecallerInitialized(true);
              setError(null);
              clearInitListeners();
            }
          ),
          DeviceEventEmitter.addListener(
            TRUECALLER_ANDROID_EVENTS.ERROR,
            handleInitFailure
          ),
          DeviceEventEmitter.addListener(
            TRUECALLER_ANDROID_EVENTS.FAILURE,
            handleInitFailure
          ),
        ];

        try {
          await TruecallerAndroidModule.initializeSdk(
            toAndroidNativeConfig(config)
          );
        } catch (initErr) {
          // If native init itself throws, remove the pending listeners so a
          // late/racing event can't silently flip isTruecallerInitialized
          // back to true, or double-report an error, after we've reported it.
          clearInitListeners();
          throw initErr;
        }
      } else {
        await TruecallerIOS.initialize(config.iosAppKey, config.iosAppLink);
        setIsTruecallerInitialized(true);
        setError(null);
      }
    } catch (err) {
      setError((err as Error).message);
      setIsTruecallerInitialized(false);
    }
  }, [clearInitListeners]);

  useEffect(() => clearInitListeners, [clearInitListeners]);

  useEffect(() => {
    if (!isTruecallerInitialized) {
      setIsUsable(undefined);
      return;
    }
    let cancelled = false;
    isSdkUsable()
      .catch(() => false)
      .then((usable) => {
        if (!cancelled) setIsUsable(usable);
      });
    return () => {
      cancelled = true;
    };
  }, [isTruecallerInitialized]);

  useEffect(() => {
    if (!isTruecallerInitialized) return;

    const reportError = (err: TruecallerError) => setError(err.errorMessage);
    const reportFailure = (err: TruecallerError) => {
      setError(err.errorMessage);
      setUserProfile(null);
    };
    const showProfile = async (load: () => Promise<TruecallerUserProfile>) => {
      try {
        setUserProfile(await load());
        setError(null);
      } catch (err) {
        reportFailure({ errorMessage: (err as Error).message });
      }
    };

    let subscriptions: EventSubscription[] = [];
    if (Platform.OS === 'android') {
      subscriptions = [
        DeviceEventEmitter.addListener(
          TRUECALLER_ANDROID_EVENTS.SUCCESS,
          (data: TruecallerAndroidResponse) => {
            const { androidSuccessHandler, androidClientId } =
              configRef.current;
            if (androidSuccessHandler) {
              androidSuccessHandler(data);
            } else {
              showProfile(async () =>
                mapAndroidUserInfoToUserProfile(
                  await fetchAndroidUserInfo(androidClientId, data)
                )
              );
            }
          }
        ),
        DeviceEventEmitter.addListener(
          TRUECALLER_ANDROID_EVENTS.FAILURE,
          reportFailure
        ),
        DeviceEventEmitter.addListener(
          TRUECALLER_ANDROID_EVENTS.ERROR,
          reportError
        ),
        DeviceEventEmitter.addListener(
          TRUECALLER_ANDROID_EVENTS.VERIFICATION_REQUIRED,
          reportError
        ),
      ];
    } else if (Platform.OS === 'ios') {
      const eventEmitter = new NativeEventEmitter<{
        [TRUECALLER_IOS_EVENTS.SUCCESS]: [TruecallerIOSResponse];
        [TRUECALLER_IOS_EVENTS.FAILURE]: [TruecallerError];
      }>(TruecallerIOS);
      subscriptions = [
        eventEmitter.addListener(TRUECALLER_IOS_EVENTS.SUCCESS, (data) => {
          const { iosSuccessHandler } = configRef.current;
          if (iosSuccessHandler) {
            iosSuccessHandler(data);
          } else {
            setUserProfile(mapIOSResponseToUserProfile(data));
            setError(null);
          }
        }),
        eventEmitter.addListener(TRUECALLER_IOS_EVENTS.FAILURE, reportFailure),
      ];
    }

    return () => subscriptions.forEach((s) => s.remove());
  }, [isTruecallerInitialized]);

  const openTruecallerForVerification = useCallback(async () => {
    if (!isTruecallerInitialized) {
      setError('SDK is not initialized. Call initializeSDK first.');
      return;
    }

    try {
      if (!(await isSdkUsable())) {
        throw new Error('Truecaller SDK is not usable on this device');
      }
      const configError = getConfigError(configRef.current);
      if (configError) throw new Error(configError);

      if (Platform.OS === 'android') {
        await TruecallerAndroidModule.requestAuthorizationCode();
      } else {
        await TruecallerIOS.requestProfile();
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [isTruecallerInitialized]);

  const clearTruecallerSdk = useCallback(() => {
    if (Platform.OS === 'android') {
      clearInitListeners();
      TruecallerAndroidModule.clearSdk();
      setIsTruecallerInitialized(false);
    }
  }, [clearInitListeners]);

  return {
    userProfile,
    error,
    isTruecallerInitialized,
    isUsable,
    initializeTruecallerSDK,
    isSdkUsable,
    openTruecallerForVerification,
    clearTruecallerSdk,
  };
};
