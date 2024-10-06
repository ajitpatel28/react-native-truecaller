# @ajitpatel28/react-native-truecaller


React Native library for seamless Truecaller integration, supporting Android SDK v3.0.1 and iOS SDK v0.1.8

## Features

- Easy integration with Truecaller SDK for both Android and iOS
- Customizable UI options for Android
- Simplified user authentication flow
- TypeScript support

## Installation

```sh
npm install @ajitpatel28/react-native-truecaller
# or
yarn add @ajitpatel28/react-native-truecaller
```

## Setup

### iOS Setup

To generate a client ID, follow the instructions in the [Truecaller IOS Guide](https://docs.truecaller.com/truecaller-sdk/android/oauth-sdk-3.0.0/integration-steps/generating-client-id).

1. Add the following to your `Podfile`:

```ruby
pod '@ajitpatel28/react-native-truecaller', :path => '../node_modules/@ajitpatel28/react-native-truecaller'
```

2. Run `pod install` in your iOS directory.

3. In your iOS project, add URL schemes for Truecaller in your `Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
<dict>
  <key>CFBundleURLSchemes</key>
  <array>
    <string>truecallersdk-{YOUR_APP_ID}</string>
  </array>
</dict>
</array>
```

Replace `{YOUR_APP_ID}` with your actual Truecaller App ID.

4. Add the `truesdk` entry under `LSApplicationQueriesSchemes` in your `Info.plist` file:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
<string>truesdk</string>
</array>
```

5. Add the associated domain provided by Truecaller:
  - In Xcode, go to your project's target
  - Select the "Signing & Capabilities" tab
  - Click on "+ Capability" and add "Associated Domains"
  - Add the domain provided by Truecaller with the "applinks:" prefix

   For example: `applinks:your-provided-domain.com`

   Note: Do not include "http://" or "https://" in the domain.

### Android Setup

To generate a client ID, follow the instructions in the [Truecaller Android Guide](https://docs.truecaller.com/truecaller-sdk/android/oauth-sdk-3.0.0/integration-steps/generating-client-id).

1. Add the Truecaller SDK client ID to your `AndroidManifest.xml` file inside the `<application>` tag:

```xml
<meta-data
  android:name="com.truecaller.android.sdk.ClientId"
  android:value="YOUR_CLIENT_ID"/>
```

Replace `YOUR_CLIENT_ID` with your actual Truecaller client ID.

2. Ensure your app has the `INTERNET` permission in the `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## Usage

```typescript
import React, { useEffect } from 'react';
import { View, Button } from 'react-native';
import { useTruecaller } from '@ajitpatel28/react-native-truecaller';
const TruecallerLoginComponent = () => {
  const {
    initializeSDK,
    openTruecallerForVerification,
    userProfile,
    error
  } = useTruecaller({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    iosAppKey: 'YOUR_IOS_APP_KEY',
    iosAppLink: 'YOUR_IOS_APP_LINK',
  });
  useEffect(() => {
// Initialize the Truecaller SDK when the component mounts
    initializeSDK();
  }, []);
  const handleTruecallerLogin = async () => {
    try {
      await openTruecallerForVerification();
// The userProfile will be updated automatically if verification is successful
    } catch (err) {
      console.error('Truecaller login error:', err);
// Handle error
    }
  };
  useEffect(() => {
    if (userProfile) {
      console.log('Truecaller profile:', userProfile);
// Handle successful login, e.g., navigate to a new screen or update app state
    }
  }, [userProfile]);
  useEffect(() => {
    if (error) {
      console.error('Truecaller error:', error);
// Handle error, e.g., show an error message to the user
    }
  }, [error]);
  return (
    <View>
      <Button title="Login with Truecaller" onPress={handleTruecallerLogin} />
  </View>
);
};
export default TruecallerLoginComponent;
```

## API

### `useTruecaller(config: TruecallerConfig)`

A custom hook that provides access to Truecaller functionality.

#### Parameters

- `config`: `TruecallerConfig` object with the following properties:
  - `androidClientId`: (string) Your Android client ID
  - `iosAppKey`: (string) Your iOS app key
  - `iosAppLink`: (string) Your iOS app link
  - `androidButtonColor`: (optional) Color of the Truecaller button on Android
  - `androidButtonTextColor`: (optional) Text color of the Truecaller button on Android
  - `androidButtonShape`: (optional) Shape of the Truecaller button on Android
  - `androidButtonText`: (optional) Text displayed on the Truecaller button on Android
  - `androidFooterButtonText`: (optional) Text displayed on the footer button on Android
  - `androidConsentHeading`: (optional) Heading text for the consent screen on Android

#### Returns

- `initializeTruecaller(): Promise<void>`: Initializes the Truecaller SDK.
- `requestTruecallerProfile(): Promise<TruecallerUserProfile>`: Requests the user's Truecaller profile.
- `userProfile`: The user's Truecaller profile (if available).
- `error`: Any error that occurred during the Truecaller operations.

## Constants

The library provides several constants for customization:

```typescript
import {
  TRUECALLER_ANDROID_CUSTOMIZATIONS,
  TRUECALLER_ANDROID_EVENTS,
  TRUECALLER_IOS_EVENTS,
  TRUECALLER_LANGUAGES,
} from '@ajitpatel28/react-native-truecaller';
```

These constants include options for button styles, consent modes, event types, and supported languages.

## Error Handling

The library throws errors in case of initialization or profile request failures. Implement proper error handling in your application using try-catch blocks or by checking the `error` value returned from the `useTruecaller` hook.

## Notes

- Ensure you have the necessary permissions set up in your app for accessing user information.
- Follow Truecaller's guidelines and policies when implementing this SDK in your application.
- For more detailed customization options, refer to the Truecaller SDK documentation for [Android](https://docs.truecaller.com/truecaller-sdk/android/getting-started) and [iOS](https://docs.truecaller.com/truecaller-sdk/ios/getting-started).

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with ❤️ by [Ajit Patel](https://github.com/ajitpatel28) and [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
