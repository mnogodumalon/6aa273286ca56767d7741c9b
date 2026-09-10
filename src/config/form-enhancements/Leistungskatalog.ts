import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'leistungsbezeichnung',
    'leistungstyp',
    'berater',
    'einheit',
    'kostenvoranschlag',
    'stundensatz_leistung',
    'beschreibung',
    'verfuegbarkeit',
  ],
  defaults: {
    'leistungstyp': { kind: 'lookup', key: 'beratung', label: 'Beratung' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
