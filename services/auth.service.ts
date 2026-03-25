import api from './api';
import type { AuthResponse, ParsedAuthTokens } from '@/types/api.types';

function parseTokens(data: AuthResponse): ParsedAuthTokens {
  const member = data.members[0];
  return {
    token: member.token.token,
    refreshToken: member.refreshToken.token,
    user: { id: member.user.id, name: member.user.name },
    organizationId: member.organization.id,
  };
}

export const authService = {
  async login(login: string, password: string): Promise<ParsedAuthTokens> {
    const response = await api.post<AuthResponse>('/v1/authorization', { login, password });
    return parseTokens(response.data);
  },

  async refresh(refreshToken: string): Promise<ParsedAuthTokens> {
    const response = await api.put<AuthResponse>(
      '/v1/authorization',
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } }
    );
    return parseTokens(response.data);
  },
};
