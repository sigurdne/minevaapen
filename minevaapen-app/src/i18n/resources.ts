import type { Resource } from 'i18next';

export const resources = {
  nb_NO: {
    translation: {
      'common.loading': 'Laster...',
      'errors.databaseSeeding': 'Kunne ikke initialisere databasen. Prøv igjen.',
      'navigation.modalTitle': 'Modal',
    },
  },
  nn_NO: {
    translation: {
      'common.loading': 'Lastar...',
      'errors.databaseSeeding': 'Klarte ikkje initialisere databasen. Prøv på nytt.',
      'navigation.modalTitle': 'Modal',
    },
  },
} satisfies Resource;

export type AppResources = typeof resources;