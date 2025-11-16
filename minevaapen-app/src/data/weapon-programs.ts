export type WeaponProgramSeed = {
  weaponId: string;
  programId: string;
  status: 'approved' | 'pending' | 'proposed';
  isReserve: boolean;
};

export const weaponProgramSeeds: WeaponProgramSeed[] = [
  {
    weaponId: 'weapon-001',
    programId: '158',
    status: 'approved',
    isReserve: false,
  },
  {
    weaponId: 'weapon-001',
    programId: '160',
    status: 'approved',
    isReserve: true,
  },
  {
    weaponId: 'weapon-002',
    programId: '1',
    status: 'approved',
    isReserve: false,
  },
  {
    weaponId: 'weapon-002',
    programId: '31',
    status: 'approved',
    isReserve: false,
  },
];
