import axios from 'axios';
import { fetchAndroidUserInfo } from '../api';
import { TRUECALLER_API_URLS } from '../constants';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('fetchAndroidUserInfo', () => {
  it('redeems the code, then fetches user info with the access token', async () => {
    const userInfo = { given_name: 'Ada' };
    mockedAxios.post.mockResolvedValue({ data: { access_token: 'token' } });
    mockedAxios.get.mockResolvedValue({ data: userInfo });

    await expect(
      fetchAndroidUserInfo('client-id', {
        authorizationCode: 'code',
        codeVerifier: 'verifier',
      })
    ).resolves.toBe(userInfo);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      TRUECALLER_API_URLS.TOKEN_URL,
      {
        grant_type: 'authorization_code',
        client_id: 'client-id',
        code: 'code',
        code_verifier: 'verifier',
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    expect(mockedAxios.get).toHaveBeenCalledWith(
      TRUECALLER_API_URLS.USER_INFO_URL,
      { headers: { Authorization: 'Bearer token' } }
    );
  });
});
