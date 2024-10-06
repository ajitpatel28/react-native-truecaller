package com.ajit.reactnativetruecaller;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;

import androidx.annotation.Nullable;
import androidx.fragment.app.FragmentActivity;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.truecaller.android.sdk.oAuth.*;

import java.math.BigInteger;
import java.security.SecureRandom;
import java.util.Locale;

public class TruecallerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "TruecallerModule";
    private final ReactApplicationContext reactContext;
    private String codeVerifier;

    public TruecallerModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
        reactContext.addActivityEventListener(activityEventListener);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private final TcOAuthCallback oauthCallback = new TcOAuthCallback() {
        @Override
        public void onSuccess(TcOAuthData oauthData) {
            WritableMap params = createSuccessMap(oauthData);
            emitEvent("TruecallerAndroidSuccess", params);
        }

        @Override
        public void onFailure(TcOAuthError oauthError) {
            WritableMap params = createErrorMap(oauthError.getErrorCode(), oauthError.getErrorMessage());
            emitEvent("TruecallerAndroidFailure", params);
        }

        @Override
        public void onVerificationRequired(TcOAuthError oauthError) {
            WritableMap params = createErrorMap(oauthError.getErrorCode(), oauthError.getErrorMessage());
            emitEvent("TruecallerAndroidVerificationRequired", params);
        }
    };

    @ReactMethod
    public void initializeSdk(ReadableMap config) {
        try {
            TcSdkOptions sdkOptions = buildSdkOptions(config);
            TcSdk.init(sdkOptions);
        } catch (Exception e) {
            emitErrorEvent(e.getMessage());
        }
    }

    @ReactMethod
    public void requestAuthorizationCode() {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                emitErrorEvent("Current activity is null");
                return;
            }
            if (!(currentActivity instanceof FragmentActivity)) {
                emitErrorEvent("Current activity is not a FragmentActivity");
                return;
            }
            String state = generateOAuthState();
            String codeChallenge = generateCodeChallenge();

            TcSdk.getInstance().setOAuthState(state);
            TcSdk.getInstance().setOAuthScopes(new String[]{"profile", "phone", "email"});
            TcSdk.getInstance().setCodeChallenge(codeChallenge);
            TcSdk.getInstance().getAuthorizationCode((FragmentActivity) currentActivity);
        } catch (Exception e) {
            emitErrorEvent(e.getMessage());
        }
    }

    @ReactMethod
    public void isSdkUsable(Promise promise) {
        try {
            boolean isUsable = TcSdk.getInstance().isOAuthFlowUsable();
            promise.resolve(isUsable);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
    
private TcSdkOptions buildSdkOptions(ReadableMap config) {
    TcSdkOptions.Builder sdkOptionsBuilder = new TcSdkOptions.Builder(reactContext, oauthCallback);

    if (config.hasKey("buttonColor")) {
        String buttonColor = config.getString("buttonColor");
        sdkOptionsBuilder.buttonColor(Color.parseColor(buttonColor));
    }
    if (config.hasKey("buttonTextColor")) {
        String buttonTextColor = config.getString("buttonTextColor");
        sdkOptionsBuilder.buttonTextColor(Color.parseColor(buttonTextColor));
    }
    if (config.hasKey("buttonText")) {
        String buttonText = config.getString("buttonText");
        sdkOptionsBuilder.ctaText(mapCtaText(buttonText));
    }
    if (config.hasKey("buttonShape")) {
        String buttonShape = config.getString("buttonShape");
        sdkOptionsBuilder.buttonShapeOptions(mapButtonShape(buttonShape));
    }
    if (config.hasKey("footerText")) {
        String footerText = config.getString("footerText");
        sdkOptionsBuilder.footerType(mapFooterText(footerText));
    }
    if (config.hasKey("consentHeading")) {
        String consentHeading = config.getString("consentHeading");
        sdkOptionsBuilder.consentTitleOption(mapConsentHeading(consentHeading));
    }

    TcSdkOptions sdkOptions = sdkOptionsBuilder.build();

    // Set locale after building the options
    if (config.hasKey("languageCode")) {
        String languageCode = config.getString("languageCode");
        if (languageCode != null && !languageCode.isEmpty()) {
            Locale locale = new Locale(languageCode);
            TcSdk.getInstance().setLocale(locale);
        }
    }

    return sdkOptions;
}

    private String generateOAuthState() {
        SecureRandom random = new SecureRandom();
        BigInteger stateBigInt = new BigInteger(130, random);
        return stateBigInt.toString(32);
    }

    private String generateCodeChallenge() {
        codeVerifier = CodeVerifierUtil.Companion.generateRandomCodeVerifier();
        return CodeVerifierUtil.Companion.getCodeChallenge(codeVerifier);
    }

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            super.onActivityResult(activity, requestCode, resultCode, data);
            if (requestCode == TcSdk.SHARE_PROFILE_REQUEST_CODE) {
                TcSdk.getInstance().onActivityResultObtained((FragmentActivity) activity, requestCode, resultCode, data);
            }
        }
    };

    private void emitEvent(String eventName, @Nullable WritableMap params) {
        reactContext
                .runOnUiQueueThread(() -> reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit(eventName, params));
    }

    private void emitErrorEvent(String errorMessage) {
        WritableMap params = createErrorMap(0, errorMessage);
        emitEvent("TruecallerAndroidError", params);
    }

    private WritableMap createSuccessMap(TcOAuthData data) {
        WritableMap params = Arguments.createMap();
        params.putString("authorizationCode", data.getAuthorizationCode());
        params.putString("codeVerifier", codeVerifier);
        return params;
    }

    private WritableMap createErrorMap(int errorCode, String errorMessage) {
        WritableMap params = Arguments.createMap();
        params.putInt("errorCode", errorCode);
        params.putString("errorMessage", errorMessage);
        return params;
    }

    // Mapping functions with all available options

    private int mapCtaText(String ctaText) {
        switch (ctaText) {
            case "TRUECALLER_ANDROID_BUTTON_TEXT_ACCEPT":
                return TcSdkOptions.CTA_TEXT_ACCEPT;
            case "TRUECALLER_ANDROID_BUTTON_TEXT_CONFIRM":
                return TcSdkOptions.CTA_TEXT_CONFIRM;
            case "TRUECALLER_ANDROID_BUTTON_TEXT_PROCEED":
                return TcSdkOptions.CTA_TEXT_PROCEED;
            default:
                return TcSdkOptions.CTA_TEXT_CONTINUE;
        }
    }

    private int mapButtonShape(String buttonShape) {
        if ("TRUECALLER_ANDROID_BUTTON_RECTANGLE".equals(buttonShape)) {
            return TcSdkOptions.BUTTON_SHAPE_RECTANGLE;
        }
        return TcSdkOptions.BUTTON_SHAPE_ROUNDED;
    }

    private int mapFooterText(String footerText) {
        switch (footerText) {
            case "TRUECALLER_ANDROID_FOOTER_BUTTON_TEXT_ANOTHER_MOBILE_NUMBER":
                return TcSdkOptions.FOOTER_TYPE_ANOTHER_MOBILE_NO;
            case "TRUECALLER_ANDROID_FOOTER_BUTTON_TEXT_ANOTHER_METHOD":
                return TcSdkOptions.FOOTER_TYPE_ANOTHER_METHOD;
            case "TRUECALLER_ANDROID_FOOTER_BUTTON_TEXT_MANUALLY":
                return TcSdkOptions.FOOTER_TYPE_MANUALLY;
            case "TRUECALLER_ANDROID_FOOTER_BUTTON_TEXT_LATER":
                return TcSdkOptions.FOOTER_TYPE_LATER;
            default:
                return TcSdkOptions.FOOTER_TYPE_SKIP;
        }
    }

    private int mapConsentHeading(String consentHeading) {
        switch (consentHeading) {
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_SIGN_UP_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_SIGN_UP_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_SIGN_IN_TO":
                return TcSdkOptions.SDK_CONSENT_HEADING_SIGN_IN_TO;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_VERIFY_NUMBER_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_VERIFY_NUMBER_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_REGISTER_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_REGISTER_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_GET_STARTED_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_GET_STARTED_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_PROCEED_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_PROCEED_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_VERIFY_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_VERIFY_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_VERIFY_PROFILE_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_VERIFY_PROFILE_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_VERIFY_YOUR_PROFILE_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_VERIFY_YOUR_PROFILE_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_VERIFY_PHONE_NO_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_VERIFY_PHONE_NO_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_VERIFY_YOUR_NO_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_VERIFY_YOUR_NO_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_CONTINUE_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_CONTINUE_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_COMPLETE_ORDER_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_COMPLETE_ORDER_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_PLACE_ORDER_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_PLACE_ORDER_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_COMPLETE_BOOKING_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_COMPLETE_BOOKING_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_CHECKOUT_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_CHECKOUT_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_MANAGE_DETAILS_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_MANAGE_DETAILS_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_MANAGE_YOUR_DETAILS_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_MANAGE_YOUR_DETAILS_WITH;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_LOGIN_TO_WITH_ONE_TAP":
                return TcSdkOptions.SDK_CONSENT_HEADING_LOGIN_TO_WITH_ONE_TAP;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_SUBSCRIBE_TO":
                return TcSdkOptions.SDK_CONSENT_HEADING_SUBSCRIBE_TO;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_GET_UPDATES_FROM":
                return TcSdkOptions.SDK_CONSENT_HEADING_GET_UPDATES_FROM;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_CONTINUE_READING_ON":
                return TcSdkOptions.SDK_CONSENT_HEADING_CONTINUE_READING_ON;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_GET_NEW_UPDATES_FROM":
                return TcSdkOptions.SDK_CONSENT_HEADING_GET_NEW_UPDATES_FROM;
            case "TRUECALLER_ANDROID_CONSENT_HEADING_TEXT_LOGIN_SIGNUP_WITH":
                return TcSdkOptions.SDK_CONSENT_HEADING_LOGIN_SIGNUP_WITH;
            default:
                return TcSdkOptions.SDK_CONSENT_HEADING_LOG_IN_TO;
        }
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Keep: Required for RN built in Event Emitter Calls.
    }
}