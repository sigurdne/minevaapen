export type OrganizationSeed = {
  id: string;
  name: string;
  shortName: string;
  country: string;
  orgNumber: string;
};

export const organizationSeeds: OrganizationSeed[] = [
  {
    id: '943942102',
    name: 'Det Frivillige Skyttervesen',
    shortName: 'DFS',
    country: 'NO',
    orgNumber: '943942102',
  },
  {
    id: '988539155',
    name: 'Dynamisk Sportsskyting Norge',
    shortName: 'DSSN',
    country: 'NO',
    orgNumber: '988539155',
  },
  {
    id: '946168114',
    name: 'Norges Sportsskytterforbund',
    shortName: 'NSF',
    country: 'NO',
    orgNumber: '946168114',
  },
  {
    id: '956792150',
    name: 'Norges Jeger Og Fiskerforbund',
    shortName: 'NJFF',
    country: 'NO',
    orgNumber: '956792150',
  },
];
