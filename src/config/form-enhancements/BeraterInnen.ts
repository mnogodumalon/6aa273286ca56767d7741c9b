import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'nachname',
    'vorname',
    'titel',
    { row: ['strasse', 'hausnummer'], cols: '2fr 1fr' },
    { row: ['plz', 'ort'], cols: '1fr 2fr' },
    'email_beruflich',
    'email_privat',
    'telefon',
    'einstiegsdatum',
    'status',
    'stundensatz',
    'leistungen',
    'projekte',
    'sonstiges_1',
    'sonstiges_2',
    'stunden_aktueller_monat',
    'stunden_aktuelles_quartal',
    'stunden_aktuelles_jahr',
    'stunden_letzter_monat',
    'stunden_letztes_quartal',
    'stunden_letztes_jahr',
  ],
  defaults: {
    'status': { kind: 'lookup', key: 'aktiv', label: 'Aktiv' },
    'einstiegsdatum': { kind: 'today' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
