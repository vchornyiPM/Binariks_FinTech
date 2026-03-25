import api from './api';
import type { InSystemCard } from '@/types/api.types';

interface InSystemCardDto {
  id: string;
  number: string;
  coinSerial?: string;
  coin?: { serial: string };
  status: string;
  expiryDate?: string;
  name?: string;
}

function mapCard(c: InSystemCardDto): InSystemCard {
  return {
    id: c.id,
    number: c.number,
    coinSerial: c.coinSerial ?? c.coin?.serial ?? '',
    status: c.status,
    expiryDate: c.expiryDate,
    name: c.name,
  };
}

export const cardsService = {
  async getMyCards(): Promise<InSystemCard[]> {
    const response = await api.get<{ cards: InSystemCardDto[] }>('/v1/my/in-system-cards');
    return (response.data.cards ?? []).map(mapCard);
  },

  async getCard(id: string): Promise<InSystemCard> {
    const response = await api.get<{ card: InSystemCardDto }>(`/v1/my/in-system-cards/${id}`);
    return mapCard(response.data.card);
  },

  async createCard(coinSerial: string): Promise<InSystemCard> {
    const response = await api.post<{ card: InSystemCardDto }>('/v1/my/in-system-cards', { coinSerial });
    return mapCard(response.data.card);
  },

  async deleteCard(number: string): Promise<void> {
    await api.delete(`/v1/my/in-system-cards/number/${number}`);
  },
};
