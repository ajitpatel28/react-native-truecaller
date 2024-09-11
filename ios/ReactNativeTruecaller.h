
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNReactNativeTruecallerSpec.h"

@interface ReactNativeTruecaller : NSObject <NativeReactNativeTruecallerSpec>
#else
#import <React/RCTBridgeModule.h>

@interface ReactNativeTruecaller : NSObject <RCTBridgeModule>
#endif

@end
