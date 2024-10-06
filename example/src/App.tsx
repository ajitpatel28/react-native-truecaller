import { useEffect } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';

import {
  TRUECALLER_ANDROID_CUSTOMIZATIONS,
  useTruecaller,
} from '@ajitpatel28/react-native-truecaller';

export default function App() {
  const truecallerConfig = {
    androidClientId: '3e53mmvn8pxyb-1w8s4b1lv7-xzkh2bak3uzrij4vha',
    androidButtonColor: '#212121',
    androidButtonTextColor: '#FFFFFF',
    androidButtonStyle: TRUECALLER_ANDROID_CUSTOMIZATIONS.BUTTON_SHAPES.ROUNDED,
    androidButtonText: TRUECALLER_ANDROID_CUSTOMIZATIONS.BUTTON_TEXTS.ACCEPT,
    androidFooterButtonText:
      TRUECALLER_ANDROID_CUSTOMIZATIONS.FOOTER_TEXTS.ANOTHER_METHOD,
    androidConsentHeading:
      TRUECALLER_ANDROID_CUSTOMIZATIONS.CONSENT_HEADINGS.CHECKOUT_WITH,
  };
  const { initiateTruecallerVerification, user } =
    useTruecaller(truecallerConfig);

  useEffect(() => {
    console.log(user);
  }, [user]);

  console.log(user);

  return (
    <View style={styles.container}>
      <Pressable onPress={initiateTruecallerVerification}>
        <Text>Sign in with truecaller</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
