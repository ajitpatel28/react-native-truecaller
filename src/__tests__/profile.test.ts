import {
  mapAndroidUserInfoToUserProfile,
  mapIOSResponseToUserProfile,
} from '../profile';
import type { TruecallerIOSResponse } from '../interfaces';

describe('mapAndroidUserInfoToUserProfile', () => {
  it('maps Truecaller user info to the public profile shape', () => {
    expect(
      mapAndroidUserInfoToUserProfile({
        given_name: 'Ada',
        family_name: 'Lovelace',
        phone_number: '919999999999',
        phone_number_country_code: 'IN',
        gender: 'female',
        email: 'ada@example.com',
      })
    ).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      countryCode: 'IN',
      gender: 'female',
      phoneNumber: '919999999999',
    });
  });
});

describe('mapIOSResponseToUserProfile', () => {
  const response = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    phoneNumber: '+919999999999',
    countryCode: 'in',
    email: 'ada@example.com',
    gender: 2,
  } as TruecallerIOSResponse;

  it('maps the iOS profile, stringifying gender', () => {
    expect(mapIOSResponseToUserProfile(response)).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      countryCode: 'in',
      gender: '2',
      phoneNumber: '+919999999999',
    });
  });

  it('maps gender 0 (unspecified) to null', () => {
    expect(
      mapIOSResponseToUserProfile({ ...response, gender: 0 }).gender
    ).toBeNull();
  });
});
