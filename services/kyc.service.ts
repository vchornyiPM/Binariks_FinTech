import api from './api';

export interface KycVerificationItem {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export type KycDocStatus = 'not_started' | 'uploaded' | 'in_verification' | 'approved' | 'rejected';

export interface ProfileDocument {
  id: string;
  type: string;
  status: KycDocStatus;
  createdAt: string;
}

// Static verification checklist — same for all Individual accounts
export const VERIFICATION_ITEMS: KycVerificationItem[] = [
  {
    id: 'identity',
    label: 'Identity Document',
    description: 'Passport or national ID card',
    icon: 'person.crop.rectangle',
  },
  {
    id: 'selfie',
    label: 'Selfie with ID',
    description: 'A photo of yourself holding your ID',
    icon: 'camera.fill',
  },
  {
    id: 'proof_of_address',
    label: 'Proof of Address',
    description: 'Utility bill or bank statement (last 3 months)',
    icon: 'house.fill',
  },
];

interface MediaFileResp {
  file: { id: string; name: string };
}

export const kycService = {
  async getMyDocuments(): Promise<ProfileDocument[]> {
    try {
      const { data } = await api.get<{ documents: ProfileDocument[] }>('/v1/profile-documents/my');
      return data.documents ?? [];
    } catch {
      return [];
    }
  },

  async uploadDocument(uri: string, fileName: string, mimeType: string): Promise<string> {
    const formData = new FormData();
    // React Native FormData file append
    formData.append('file', { uri, name: fileName, type: mimeType } as any);
    const { data } = await api.post<MediaFileResp>('/v1/media-files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.file.id;
  },
};
