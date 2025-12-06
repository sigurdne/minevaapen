import { EventEmitter } from 'expo-modules-core';

const eventEmitter = new EventEmitter({} as any);

export const DATABASE_EVENTS = {
  RESTORED: 'database_restored',
};

export const databaseEvents = {
  emitRestored: () => eventEmitter.emit(DATABASE_EVENTS.RESTORED),
  addListener: (event: string, listener: () => void) => eventEmitter.addListener(event, listener),
};
