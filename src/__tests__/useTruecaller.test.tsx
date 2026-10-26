import { act, create } from 'react-test-renderer';
import {
  DeviceEventEmitter,
  NativeModules,
  Platform,
  processColor,
} from 'react-native';
import { TRUECALLER_ANDROID_EVENTS } from '../constants';
import type { UseTruecallerResult } from '../interfaces';

// `useTruecaller.ts` reads `NativeModules.TruecallerModule` into a
// module-level constant at import time, so the native module mock must exist
// on NativeModules *before* the hook module is first required.
NativeModules.TruecallerModule = {
  initializeSdk: jest.fn().mockResolvedValue(undefined),
  isSdkUsable: jest.fn().mockResolvedValue(true),
  requestAuthorizationCode: jest.fn().mockResolvedValue(undefined),
  clearSdk: jest.fn(),
};
NativeModules.ReactNativeTruecaller = {
  initialize: jest.fn().mockResolvedValue(undefined),
  isSupported: jest.fn().mockResolvedValue(true),
  requestProfile: jest.fn().mockResolvedValue(undefined),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

const { useTruecaller } = require('../hooks/useTruecaller');

// Minimal harness: renders the hook via a bare functional component and
// exposes the latest hook result through a mutable ref, since this repo has
// no @testing-library/react-hooks (or equivalent) in devDependencies.
type Config = Parameters<typeof useTruecaller>[0];

function renderTruecallerHook(config: Config) {
  const resultRef: { current: UseTruecallerResult | null } = { current: null };

  function Harness({ hookConfig }: { hookConfig: Config }) {
    resultRef.current = useTruecaller(hookConfig);
    return null;
  }

  let root: ReturnType<typeof create>;
  act(() => {
    root = create(<Harness hookConfig={config} />);
  });

  return {
    result: resultRef,
    rerender: (nextConfig: Config) => {
      act(() => {
        root.update(<Harness hookConfig={nextConfig} />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

const config = { androidClientId: 'test-client-id' };

beforeEach(() => {
  Platform.OS = 'android';
  (NativeModules.TruecallerModule.initializeSdk as jest.Mock)
    .mockReset()
    .mockResolvedValue(undefined);
  (NativeModules.TruecallerModule.isSdkUsable as jest.Mock)
    .mockReset()
    .mockResolvedValue(true);
  (NativeModules.TruecallerModule.requestAuthorizationCode as jest.Mock)
    .mockReset()
    .mockResolvedValue(undefined);
  (NativeModules.TruecallerModule.clearSdk as jest.Mock).mockReset();
  DeviceEventEmitter.removeAllListeners(TRUECALLER_ANDROID_EVENTS.READY);
  DeviceEventEmitter.removeAllListeners(TRUECALLER_ANDROID_EVENTS.ERROR);
  DeviceEventEmitter.removeAllListeners(TRUECALLER_ANDROID_EVENTS.FAILURE);
  DeviceEventEmitter.removeAllListeners(TRUECALLER_ANDROID_EVENTS.SUCCESS);
  DeviceEventEmitter.removeAllListeners(
    TRUECALLER_ANDROID_EVENTS.VERIFICATION_REQUIRED
  );
});

const initAndReady = async (result: {
  current: UseTruecallerResult | null;
}) => {
  await act(async () => {
    await result.current!.initializeTruecallerSDK();
  });
  await act(async () => {
    DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.READY);
  });
};

describe('useTruecaller (Android ready-listener lifecycle)', () => {
  it('flips isTruecallerInitialized to true when TruecallerAndroidReady fires after init', async () => {
    const { result } = renderTruecallerHook(config);

    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });
    expect(result.current!.isTruecallerInitialized).toBe(false);

    await act(async () => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.READY);
    });

    expect(result.current!.isTruecallerInitialized).toBe(true);
  });

  it('does not stack listeners when initializeTruecallerSDK is called twice before ready fires', async () => {
    const { result } = renderTruecallerHook(config);

    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });
    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });

    const listenerCountBefore = DeviceEventEmitter.listenerCount(
      TRUECALLER_ANDROID_EVENTS.READY
    );
    expect(listenerCountBefore).toBe(1);

    await act(async () => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.READY);
    });

    expect(result.current!.isTruecallerInitialized).toBe(true);
    // Listener should have removed itself after firing once.
    expect(
      DeviceEventEmitter.listenerCount(TRUECALLER_ANDROID_EVENTS.READY)
    ).toBe(0);
  });

  it('ignores a late TruecallerAndroidReady event if native init rejected', async () => {
    (
      NativeModules.TruecallerModule.initializeSdk as jest.Mock
    ).mockRejectedValue(new Error('native init failed'));

    const { result } = renderTruecallerHook(config);

    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });

    expect(result.current!.isTruecallerInitialized).toBe(false);
    expect(result.current!.error).toBe('native init failed');

    act(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.READY);
    });

    expect(result.current!.isTruecallerInitialized).toBe(false);
  });

  it('removes the pending ready listener on unmount', async () => {
    const { result, unmount } = renderTruecallerHook(config);

    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });
    expect(
      DeviceEventEmitter.listenerCount(TRUECALLER_ANDROID_EVENTS.READY)
    ).toBe(1);

    unmount();

    expect(
      DeviceEventEmitter.listenerCount(TRUECALLER_ANDROID_EVENTS.READY)
    ).toBe(0);

    // Emitting after unmount must not throw or resurrect state.
    expect(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.READY);
    }).not.toThrow();
  });

  it('registers an init-time error listener that reports errors emitted before ready fires', async () => {
    const { result } = renderTruecallerHook(config);

    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });

    act(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.ERROR, {
        errorMessage: 'init blew up',
      });
    });

    expect(result.current!.error).toBe('init blew up');
    expect(result.current!.isTruecallerInitialized).toBe(false);
  });

  it('registers an init-time failure listener that reports SDK-side onFailure events emitted before ready fires', async () => {
    const { result } = renderTruecallerHook(config);

    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });

    act(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.FAILURE, {
        errorMessage: 'sdk init failure',
      });
    });

    expect(result.current!.error).toBe('sdk init failure');
    expect(result.current!.isTruecallerInitialized).toBe(false);
  });

  it('ignores a late TruecallerAndroidReady event after an init-time FAILURE was already reported', async () => {
    const { result } = renderTruecallerHook(config);

    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });

    act(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.FAILURE, {
        errorMessage: 'sdk init failure',
      });
    });
    expect(result.current!.error).toBe('sdk init failure');

    act(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.READY);
    });

    expect(result.current!.isTruecallerInitialized).toBe(false);
    expect(result.current!.error).toBe('sdk init failure');
  });

  it('sends colours to native as ARGB ints, falling back to the default for unparseable values', async () => {
    const { result } = renderTruecallerHook({
      ...config,
      androidButtonColor: 'rgba(255, 0, 0, 1)',
      androidButtonTextColor: 'not-a-colour',
    });

    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });

    const sent = (NativeModules.TruecallerModule.initializeSdk as jest.Mock)
      .mock.calls[0][0];
    expect(sent.buttonColor).toBe(processColor('rgba(255, 0, 0, 1)'));
    expect(sent.buttonTextColor).toBe(processColor('#FFFFFF'));
  });

  it('resets isTruecallerInitialized on clear so a re-init is observable', async () => {
    const { result } = renderTruecallerHook(config);
    await initAndReady(result);
    expect(result.current!.isTruecallerInitialized).toBe(true);

    act(() => {
      result.current!.clearTruecallerSdk();
    });

    expect(NativeModules.TruecallerModule.clearSdk).toHaveBeenCalledTimes(1);
    expect(result.current!.isTruecallerInitialized).toBe(false);
  });

  it('ignores a pending ready event once the SDK has been cleared', async () => {
    const { result } = renderTruecallerHook(config);
    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });

    act(() => {
      result.current!.clearTruecallerSdk();
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.READY);
    });

    expect(result.current!.isTruecallerInitialized).toBe(false);
  });

  it('keeps callbacks and listeners stable across re-renders with a new inline config', async () => {
    const firstHandler = jest.fn();
    const latestHandler = jest.fn();
    const { result, rerender } = renderTruecallerHook({
      ...config,
      androidSuccessHandler: firstHandler,
    });
    await initAndReady(result);
    const { initializeTruecallerSDK, openTruecallerForVerification } =
      result.current!;
    const removeSpy = jest.fn();
    const addListener = DeviceEventEmitter.addListener;
    const addSpy = jest
      .spyOn(DeviceEventEmitter, 'addListener')
      .mockImplementation((...args) => {
        const sub = addListener.apply(DeviceEventEmitter, args);
        return { ...sub, remove: removeSpy };
      });

    rerender({ ...config, androidSuccessHandler: latestHandler });
    addSpy.mockRestore();

    expect(addSpy).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
    expect(result.current!.initializeTruecallerSDK).toBe(
      initializeTruecallerSDK
    );
    expect(result.current!.openTruecallerForVerification).toBe(
      openTruecallerForVerification
    );

    const payload = { authorizationCode: 'code', codeVerifier: 'verifier' };
    act(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.SUCCESS, payload);
    });
    expect(firstHandler).not.toHaveBeenCalled();
    expect(latestHandler).toHaveBeenCalledWith(payload);
  });

  it('exposes isUsable: undefined until initialized, then the isSdkUsable result', async () => {
    const { result } = renderTruecallerHook(config);
    expect(result.current!.isUsable).toBeUndefined();

    await initAndReady(result);
    expect(result.current!.isUsable).toBe(true);

    act(() => {
      result.current!.clearTruecallerSdk();
    });
    expect(result.current!.isUsable).toBeUndefined();
  });

  it('reports isUsable as false when isSdkUsable rejects', async () => {
    (NativeModules.TruecallerModule.isSdkUsable as jest.Mock).mockRejectedValue(
      new Error('boom')
    );
    const { result } = renderTruecallerHook(config);

    await initAndReady(result);

    expect(result.current!.isUsable).toBe(false);
  });
});

describe('onError', () => {
  const FOOTER_ERROR = {
    errorCode: 14,
    errorMessage: 'User denied by pressing the footer button',
  };

  it('calls onError with the error code on every failure, including repeats', async () => {
    const onError = jest.fn();
    const { result } = renderTruecallerHook({ ...config, onError });
    await initAndReady(result);

    act(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.FAILURE, FOOTER_ERROR);
    });
    act(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.FAILURE, FOOTER_ERROR);
    });

    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenLastCalledWith(FOOTER_ERROR);
  });

  it('calls onError once for a failure during re-init, without resetting init', async () => {
    const onError = jest.fn();
    const { result } = renderTruecallerHook({ ...config, onError });
    await initAndReady(result);

    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });
    expect(result.current!.isTruecallerInitialized).toBe(true);
    act(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.FAILURE, FOOTER_ERROR);
    });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('calls onError for ERROR and FAILURE events emitted before ready', async () => {
    const onError = jest.fn();
    const { result } = renderTruecallerHook({ ...config, onError });

    for (const event of [
      TRUECALLER_ANDROID_EVENTS.ERROR,
      TRUECALLER_ANDROID_EVENTS.FAILURE,
    ]) {
      await act(async () => {
        await result.current!.initializeTruecallerSDK();
      });
      act(() => {
        DeviceEventEmitter.emit(event, { errorCode: 18, errorMessage: event });
      });
    }

    expect(onError.mock.calls).toEqual([
      [{ errorCode: 18, errorMessage: TRUECALLER_ANDROID_EVENTS.ERROR }],
      [{ errorCode: 18, errorMessage: TRUECALLER_ANDROID_EVENTS.FAILURE }],
    ]);
  });

  it('calls onError with errorCode 0 for errors raised by the library', async () => {
    const onError = jest.fn();
    const { result } = renderTruecallerHook({ ...config, onError });

    await act(async () => {
      await result.current!.openTruecallerForVerification();
    });

    expect(onError).toHaveBeenCalledWith({
      errorCode: 0,
      errorMessage: 'SDK is not initialized. Call initializeSDK first.',
    });
  });

  it('clears the error state when the sheet is opened again', async () => {
    const { result } = renderTruecallerHook(config);
    await initAndReady(result);
    act(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.FAILURE, FOOTER_ERROR);
    });
    expect(result.current!.error).toBe(FOOTER_ERROR.errorMessage);

    await act(async () => {
      await result.current!.openTruecallerForVerification();
    });

    expect(result.current!.error).toBeNull();
  });

  it('calls the latest inline onError without re-subscribing listeners', async () => {
    const firstOnError = jest.fn();
    const latestOnError = jest.fn();
    const { result, rerender } = renderTruecallerHook({
      ...config,
      onError: firstOnError,
    });
    await initAndReady(result);
    const addSpy = jest.spyOn(DeviceEventEmitter, 'addListener');

    rerender({ ...config, onError: latestOnError });
    addSpy.mockRestore();
    act(() => {
      DeviceEventEmitter.emit(TRUECALLER_ANDROID_EVENTS.FAILURE, FOOTER_ERROR);
    });

    expect(addSpy).not.toHaveBeenCalled();
    expect(firstOnError).not.toHaveBeenCalled();
    expect(latestOnError).toHaveBeenCalledWith(FOOTER_ERROR);
  });
});

describe('iOS', () => {
  it('resets isTruecallerInitialized on clear on iOS without calling the Android clearSdk', async () => {
    Platform.OS = 'ios';
    const { result } = renderTruecallerHook({
      iosAppKey: 'key',
      iosAppLink: 'https://example.com',
    });
    await act(async () => {
      await result.current!.initializeTruecallerSDK();
    });
    expect(result.current!.isTruecallerInitialized).toBe(true);

    act(() => {
      result.current!.clearTruecallerSdk();
    });

    expect(result.current!.isTruecallerInitialized).toBe(false);
    expect(NativeModules.TruecallerModule.clearSdk).not.toHaveBeenCalled();
  });
});
