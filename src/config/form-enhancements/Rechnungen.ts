import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'rechnungsnummer',
    'rechnungsdatum',
    'rechnungsstatus',
    'faelligkeitsdatum',
    'zahlungseingang',
    'kunde',
    'projekt',
    'abrechnungsmonat',
    'abrechnungsjahr',
    'nettobetrag',
    'mehrwertsteuer',
    'gesamtbetrag',
    'berater',
    'leistungspositionen',
    'notizen',
  ],
  defaults: {
    'rechnungsdatum': { kind: 'today' },
    'rechnungsstatus': { kind: 'lookup', key: 'offen', label: 'Offen' },
    'mehrwertsteuer': { kind: 'literal', value: 19 },
    'faelligkeitsdatum': { kind: 'todayOffset', days: 14 },
  },
  computed: {
    '_mwst_betrag': { op: 'div', left: { op: 'mul', left: { kind: 'field', key: 'nettobetrag' }, right: { kind: 'field', key: 'mehrwertsteuer' } }, right: { kind: 'literal', value: 100 } },
    '_rechnungssumme': { op: 'add', left: { kind: 'field', key: 'nettobetrag' }, right: { kind: 'field', key: '_mwst_betrag' } },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
