import { EventEmitter } from 'expo';

export const DATABASE_EVENTS = {
  RESTORED: 'database_restored',
} as const;

type DatabaseEventName = (typeof DATABASE_EVENTS)[keyof typeof DATABASE_EVENTS];

const eventEmitter = new EventEmitter<Record<DatabaseEventName, () => void>>();

export const databaseEvents = {
  emitRestored: () => eventEmitter.emit(DATABASE_EVENTS.RESTORED),
  addListener: (event: DatabaseEventName, listener: () => void) => eventEmitter.addListener(event, listener),
};
