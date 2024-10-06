#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <TrueSDK/TrueSDK.h>

@interface ReactNativeTruecaller : RCTEventEmitter <RCTBridgeModule, TCTrueSDKDelegate>

+ (BOOL)handleUserActivity:(NSUserActivity *)userActivity
        restorationHandler:(void (^)(NSArray *restorableObjects))restorationHandler;

@end
