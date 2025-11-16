export type WeaponSeed = {
  id: string;
  displayName: string;
  type: 'pistol' | 'rifle' | 'shotgun' | 'carbine' | 'combined';
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  acquisitionDate?: string;
  acquisitionPrice?: number;
  weaponCardRef?: string;
  notes?: string;
};

export const weaponSeeds: WeaponSeed[] = [
  {
    id: 'weapon-001',
    displayName: 'CZ Shadow 2',
    type: 'pistol',
    manufacturer: 'CZ',
    model: 'Shadow 2',
    serialNumber: 'CZSHADOW2-001',
    acquisitionDate: '2022-03-15',
    acquisitionPrice: 19000,
    weaponCardRef: 'Våpenkort 12345',
    notes: 'Matchpistol satt opp for DSSN Production Optics.',
  },
  {
    id: 'weapon-002',
    displayName: 'Tikka T3x Super Varmint',
    type: 'rifle',
    manufacturer: 'Tikka',
    model: 'T3x Super Varmint',
    serialNumber: 'TIKKA-T3X-042',
    acquisitionDate: '2020-08-20',
    acquisitionPrice: 23000,
    weaponCardRef: 'Våpenkort 67890',
    notes: 'Brukes primært til DFS baneskyting og jaktfelt.',
  },
];
