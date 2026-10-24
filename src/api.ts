import axios from 'axios';
import type { TruecallerUserInfoResponse } from './interfaces';
import { TRUECALLER_API_URLS } from './constants';

// Redeems the one-time authorization code and returns Truecaller's raw user info.
export const fetchAndroidUserInfo = async (
  clientId: string | undefined,
  {
    authorizationCode,
    codeVerifier,
  }: { authorizationCode: string; codeVerifier: string }
): Promise<TruecallerUserInfoResponse> => {
  const tokenResponse = await axios.post(
    TRUECALLER_API_URLS.TOKEN_URL,
    {
      grant_type: 'authorization_code',
      client_id: clientId,
      code: authorizationCode,
      code_verifier: codeVerifier,
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  const { data } = await axios.get<TruecallerUserInfoResponse>(
    TRUECALLER_API_URLS.USER_INFO_URL,
    { headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` } }
  );
  return data;
};
