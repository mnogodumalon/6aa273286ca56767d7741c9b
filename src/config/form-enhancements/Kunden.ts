import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'kundenname',
    'kundentyp',
    'email',
    'telefon',
    { row: ['strasse', 'hausnummer'], cols: '2fr 1fr' },
    { row: ['plz', 'ort'], cols: '1fr 2fr' },
    { row: ['re_strasse', 're_hausnummer'], cols: '2fr 1fr' },
    { row: ['re_plz', 're_ort'], cols: '1fr 2fr' },
    'anlagedatum',
    'ap_titel',
    { row: ['ap_vorname', 'ap_nachname'] },
    'ap_email',
    'ap_telefon',
    'bevorzugte_kontaktart',
    'letzter_kontakt_datum',
    'letzter_kontakt_ansprechpartner',
    'notizen',
    'laufende_projekte',
  ],
  defaults: {
    'anlagedatum': { kind: 'today' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
