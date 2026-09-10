import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'datum',
    'berater',
    'projekt',
    'leistung',
    'stunden',
    'monat',
    'jahr',
    'verrechenbar',
    'taetigkeitsbeschreibung',
    'notizen',
  ],
  defaults: {
    'datum': { kind: 'today' },
    'verrechenbar': { kind: 'literal', value: true },
  },
  computed: {
    '_arbeitskosten': { op: 'mul', left: { kind: 'field', key: 'stunden' }, right: { kind: 'applookup', ownKey: 'berater', lookupKey: 'stundensatz' } },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
