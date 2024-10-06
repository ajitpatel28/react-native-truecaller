#import "ReactNativeTruecaller.h"
#import <React/RCTBridge.h>
#import <React/RCTRootView.h>
#import <TrueSDK/TrueSDK.h>

@implementation ReactNativeTruecaller

RCT_EXPORT_MODULE()

- (NSArray<NSString *> *)supportedEvents {
    return @[@"TruecallerIOSSuccess", @"TruecallerIOSFailure"];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(isSupported) {
    @try {
        return @([[TCTrueSDK sharedManager] isSupported]);
    }
    @catch (NSException *exception) {
        [self sendTruecallerFailureEvent:0 message:exception.reason];
        return @NO;
    }
}

RCT_EXPORT_METHOD(initialize:(NSString *)appKey appLink:(NSString *)appLink) {
    if ([[TCTrueSDK sharedManager] isSupported]) {
        [[TCTrueSDK sharedManager] setupWithAppKey:appKey appLink:appLink];
        [TCTrueSDK sharedManager].delegate = self;
    } else {
        [self sendTruecallerFailureEvent:0 message:@"Please make sure you have truecaller app installed on your device."];
    }
}

RCT_EXPORT_METHOD(requestProfile) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [[TCTrueSDK sharedManager] requestTrueProfile];
    });
}

+ (BOOL)handleUserActivity:(NSUserActivity *)userActivity
        restorationHandler:(void (^)(NSArray *restorableObjects))restorationHandler {
    return [[TCTrueSDK sharedManager] application:[UIApplication sharedApplication] continueUserActivity:userActivity restorationHandler:restorationHandler];
}

- (void)didReceiveTrueProfileResponse:(TCTrueProfileResponse *)profileResponse {
    NSDictionary *profileData = @{
        @"firstName": profileResponse.profile.firstName ?: [NSNull null],
        @"lastName": profileResponse.profile.lastName ?: [NSNull null],
        @"email": profileResponse.profile.email ?: [NSNull null],
        @"phoneNumber": profileResponse.profile.phoneNumber ?: [NSNull null],
        @"countryCode": profileResponse.profile.countryCode ?: [NSNull null],
        @"gender": profileResponse.profile.gender ?: [NSNull null],
    };

    [self sendEventWithName:@"TruecallerIOSSuccess" body:profileData];
}

- (void)didFailToReceiveTrueProfileWithError:(TCError *)error {
    [self sendTruecallerFailureEvent:error.code message:error.description];
}

- (void)sendTruecallerFailureEvent:(NSInteger)errorCode message:(NSString *)errorMessage {
    NSDictionary *errorData = @{
        @"errorCode": @(errorCode),
        @"errorMessage": errorMessage ?: (NSString *)[NSNull null]
    };

    [self sendEventWithName:@"TruecallerIOSFailure" body:errorData];
}

@end
