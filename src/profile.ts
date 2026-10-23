import type {
  TruecallerIOSResponse,
  TruecallerUserInfoResponse,
  TruecallerUserProfile,
} from './interfaces';

export const mapAndroidUserInfoToUserProfile = (
  data: TruecallerUserInfoResponse
): TruecallerUserProfile => ({
  firstName: data.given_name,
  lastName: data.family_name,
  email: data.email,
  countryCode: data.phone_number_country_code,
  gender: data.gender,
  phoneNumber: data.phone_number,
});

export const mapIOSResponseToUserProfile = (
  data: TruecallerIOSResponse
): TruecallerUserProfile => ({
  firstName: data.firstName,
  lastName: data.lastName,
  email: data.email,
  countryCode: data.countryCode,
  gender: data.gender !== 0 ? String(data.gender) : null,
  phoneNumber: data.phoneNumber,
});
