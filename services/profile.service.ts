import api from './api';
import type { UserProfile, KycStatus } from '@/types/api.types';

interface NameDto {
  first?: string;
  last?: string;
  middle?: string;
}

interface PersonDto {
  namePlain?: NameDto;
  nameIntl?: NameDto;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
}

interface ProfileDto {
  person?: PersonDto;
  contact?: { countryCode?: string };
  type?: string;
  status?: string;
}

interface ProfileApiResponse {
  profile: ProfileDto;
  memberships?: { organization?: { id?: string } }[];
}

function mapKycStatus(status?: string): KycStatus {
  if (status === 'approved') return 'VERIFIED';
  if (status === 'pending' || status === 'review_required') return 'PENDING';
  return 'NOT_STARTED';
}

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    const response = await api.get<ProfileApiResponse>('/v1/profiles/my');
    const { person, type, status } = response.data.profile;
    const orgId = response.data.memberships?.[0]?.organization?.id ?? '';
    const firstName = person?.namePlain?.first ?? '';
    const lastName = person?.namePlain?.last ?? '';
    return {
      id: orgId,
      email: person?.email ?? '',
      name: [firstName, lastName].filter(Boolean).join(' ') || 'User',
      firstName,
      lastName,
      phone: person?.phoneNumber,
      status,
      type,
    };
  },

  async getKycStatus(): Promise<KycStatus> {
    const response = await api.get<ProfileApiResponse>('/v1/profiles/my');
    return mapKycStatus(response.data.profile.status);
  },

  /** Update personal info: first/last name and phone */
  async updatePerson(data: { firstName?: string; lastName?: string; phone?: string }): Promise<void> {
    const namePlain: NameDto = {};
    if (data.firstName !== undefined) namePlain.first = data.firstName;
    if (data.lastName !== undefined) namePlain.last = data.lastName;
    const person: PersonDto = {};
    if (Object.keys(namePlain).length > 0) person.namePlain = namePlain;
    if (data.phone !== undefined) person.phoneNumber = data.phone;
    await api.patch('/v1/profiles/my/person', { person });
  },

  /** Update address */
  async updateAddress(data: { country?: string; city?: string; street?: string; zip?: string }): Promise<void> {
    await api.patch('/v1/profiles/my/address', {
      address: {
        country: data.country,
        city: data.city,
        street: data.street,
        zip: data.zip,
      },
    });
  },

  /** Change password */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.patch('/v1/profiles/my/password', {
      currentUserPassword: currentPassword,
      newUserPassword: newPassword,
    });
  },

  /** Get Master PIN status */
  async getMasterPin(): Promise<{ active: boolean; createdAt?: string; updatedAt?: string }> {
    const { data } = await api.get<{ pin: { active: boolean; createdAt?: string; updatedAt?: string } }>(
      '/v1/profiles/my/master-pin'
    );
    return data.pin ?? { active: false };
  },

  /** Set or update Master PIN */
  async setMasterPin(newPin: string, oldPin?: string): Promise<void> {
    await api.put('/v1/profiles/my/master-pin', {
      newPin,
      oldPin: oldPin ?? undefined,
      active: true,
    });
  },
};
