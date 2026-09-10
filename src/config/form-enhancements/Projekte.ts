import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'projektkennung',
    'projektnummer',
    'kunde',
    'projektart',
    'projektstart_jahr',
    'projektstart_monat',
    'status',
    'projektleitung',
    'ansprechpartner_kunde',
    'projektende',
    'letzter_schritt',
    'notizen',
  ],
  defaults: {
    'status': { kind: 'lookup', key: 'in_bearbeitung', label: 'In Bearbeitung' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
