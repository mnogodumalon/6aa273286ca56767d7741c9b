import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'angebotsnummer',
    'angebotsjahr',
    'angebotstyp',
    'kunde',
    'projekt',
    'angebotsdatum',
    'gueltig_bis',
    'zeitrahmen_anfang',
    'zeitrahmen_ende',
    'dauer',
    'kostentyp',
    'kostenbetrag',
    'kosten_beschreibung',
    'angebotsbeschreibung',
    'leistungspositionen',
    'anmerkungen',
  ],
  defaults: {
    'angebotsdatum': { kind: 'today' },
    'angebotstyp': { kind: 'lookup', key: 'dienstleistung', label: 'Dienstleistungsangebot' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
