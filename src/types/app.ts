import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Zeiterfassung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    stunden?: number;
    monat?: LookupValue;
    jahr?: string;
    taetigkeitsbeschreibung?: string;
    verrechenbar?: boolean;
    notizen?: string;
    berater?: RecordUrl; // applookup -> URL zu 'BeraterInnen' Record
    projekt?: RecordUrl; // applookup -> URL zu 'Projekte' Record
    leistung?: RecordUrl; // applookup -> URL zu 'Leistungskatalog' Record
  };
}

export interface Rechnungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    rechnungsnummer?: string;
    rechnungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    faelligkeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    rechnungsstatus?: LookupValue;
    abrechnungsmonat?: LookupValue;
    abrechnungsjahr?: string;
    nettobetrag?: number;
    mehrwertsteuer?: number;
    gesamtbetrag?: number;
    zahlungseingang?: string; // Format: YYYY-MM-DD oder ISO String
    leistungspositionen?: string;
    notizen?: string;
    rechnungsdatei?: string;
    kunde?: RecordUrl; // applookup -> URL zu 'Kunden' Record
    projekt?: RecordUrl; // applookup -> URL zu 'Projekte' Record
    berater?: RecordUrl[];
  };
}

export interface Projekte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    budget?: number;
    projektkennung?: string;
    projektnummer?: number;
    projektart?: LookupValue;
    projektstart_jahr?: string;
    projektstart_monat?: LookupValue;
    status?: LookupValue;
    ansprechpartner_kunde?: string;
    letzter_schritt?: string;
    projektende?: string; // Format: YYYY-MM-DD oder ISO String
    notizen?: string;
    kunde?: RecordUrl; // applookup -> URL zu 'Kunden' Record
    projektleitung?: RecordUrl; // applookup -> URL zu 'BeraterInnen' Record
  };
}

export interface Leistungskatalog {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    berater?: RecordUrl[];
    leistungsbezeichnung?: string;
    leistungstyp?: LookupValue;
    beschreibung?: string;
    kostenvoranschlag?: number;
    stundensatz_leistung?: number;
    einheit?: LookupValue;
    verfuegbarkeit?: string;
  };
}

export interface Kunden {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kundenname?: string;
    kundentyp?: LookupValue;
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    re_strasse?: string;
    re_hausnummer?: string;
    re_plz?: string;
    re_ort?: string;
    anlagedatum?: string; // Format: YYYY-MM-DD oder ISO String
    ap_titel?: string;
    ap_vorname?: string;
    ap_nachname?: string;
    ap_email?: string;
    ap_telefon?: string;
    bevorzugte_kontaktart?: LookupValue;
    letzter_kontakt_datum?: string; // Format: YYYY-MM-DD oder ISO String
    letzter_kontakt_ansprechpartner?: string;
    notizen?: string;
    laufende_projekte?: RecordUrl[];
  };
}

export interface BeraterInnen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    nachname?: string;
    vorname?: string;
    titel?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    email_beruflich?: string;
    email_privat?: string;
    telefon?: string;
    einstiegsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    stundensatz?: number;
    sonstiges_1?: string;
    sonstiges_2?: string;
    stunden_aktueller_monat?: number;
    stunden_aktuelles_quartal?: number;
    stunden_aktuelles_jahr?: number;
    stunden_letzter_monat?: number;
    stunden_letztes_quartal?: number;
    stunden_letztes_jahr?: number;
    leistungen?: RecordUrl[];
    projekte?: RecordUrl[];
  };
}

export interface Angebote {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kunde?: RecordUrl; // applookup -> URL zu 'Kunden' Record
    angebotsnummer?: string;
    angebotsjahr?: string;
    angebotstyp?: LookupValue;
    angebotsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    gueltig_bis?: string; // Format: YYYY-MM-DD oder ISO String
    zeitrahmen_anfang?: string; // Format: YYYY-MM-DD oder ISO String
    zeitrahmen_ende?: string; // Format: YYYY-MM-DD oder ISO String
    dauer?: string;
    kostentyp?: LookupValue;
    kostenbetrag?: number;
    kosten_beschreibung?: string;
    angebotsbeschreibung?: string;
    leistungspositionen?: string;
    anmerkungen?: string;
    vorlage_datei?: string;
    projekt?: RecordUrl; // applookup -> URL zu 'Projekte' Record
    angebotsstatus?: LookupValue;
  };
}

export const APP_IDS = {
  ZEITERFASSUNG: '6aa2732a257f97e973b1bd1e',
  RECHNUNGEN: '6aa2732aa4e4e2be4c8e8430',
  PROJEKTE: '6aa273295a15f8de72caafa5',
  LEISTUNGSKATALOG: '6aa273296dbcd7b108665956',
  KUNDEN: '6aa273294c403c0fd2685a6a',
  BERATERINNEN: '6aa2732961edefefe81f0158',
  ANGEBOTE: '6aa27329e0c6d41166a81758',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'zeiterfassung': {
    monat: [{ key: "januar", get label() { return lookupLabel('zeiterfassung', 'monat', "januar") ?? "Januar"; } }, { key: "februar", get label() { return lookupLabel('zeiterfassung', 'monat', "februar") ?? "Februar"; } }, { key: "maerz", get label() { return lookupLabel('zeiterfassung', 'monat', "maerz") ?? "März"; } }, { key: "april", get label() { return lookupLabel('zeiterfassung', 'monat', "april") ?? "April"; } }, { key: "mai", get label() { return lookupLabel('zeiterfassung', 'monat', "mai") ?? "Mai"; } }, { key: "juni", get label() { return lookupLabel('zeiterfassung', 'monat', "juni") ?? "Juni"; } }, { key: "juli", get label() { return lookupLabel('zeiterfassung', 'monat', "juli") ?? "Juli"; } }, { key: "august", get label() { return lookupLabel('zeiterfassung', 'monat', "august") ?? "August"; } }, { key: "september", get label() { return lookupLabel('zeiterfassung', 'monat', "september") ?? "September"; } }, { key: "oktober", get label() { return lookupLabel('zeiterfassung', 'monat', "oktober") ?? "Oktober"; } }, { key: "november", get label() { return lookupLabel('zeiterfassung', 'monat', "november") ?? "November"; } }, { key: "dezember", get label() { return lookupLabel('zeiterfassung', 'monat', "dezember") ?? "Dezember"; } }],
  },
  'rechnungen': {
    rechnungsstatus: [{ key: "bezahlt", get label() { return lookupLabel('rechnungen', 'rechnungsstatus', "bezahlt") ?? "Bezahlt"; } }, { key: "storniert", get label() { return lookupLabel('rechnungen', 'rechnungsstatus', "storniert") ?? "Storniert"; } }, { key: "ueberfaellig", get label() { return lookupLabel('rechnungen', 'rechnungsstatus', "ueberfaellig") ?? "Überfällig"; } }, { key: "offen", get label() { return lookupLabel('rechnungen', 'rechnungsstatus', "offen") ?? "Offen"; } }],
    abrechnungsmonat: [{ key: "januar", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "januar") ?? "Januar"; } }, { key: "februar", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "februar") ?? "Februar"; } }, { key: "maerz", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "maerz") ?? "März"; } }, { key: "april", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "april") ?? "April"; } }, { key: "mai", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "mai") ?? "Mai"; } }, { key: "juni", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "juni") ?? "Juni"; } }, { key: "juli", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "juli") ?? "Juli"; } }, { key: "august", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "august") ?? "August"; } }, { key: "september", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "september") ?? "September"; } }, { key: "oktober", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "oktober") ?? "Oktober"; } }, { key: "november", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "november") ?? "November"; } }, { key: "dezember", get label() { return lookupLabel('rechnungen', 'abrechnungsmonat', "dezember") ?? "Dezember"; } }],
  },
  'projekte': {
    projektart: [{ key: "entwicklung", get label() { return lookupLabel('projekte', 'projektart', "entwicklung") ?? "Entwicklung"; } }, { key: "schulung", get label() { return lookupLabel('projekte', 'projektart', "schulung") ?? "Schulung"; } }, { key: "konzeption", get label() { return lookupLabel('projekte', 'projektart', "konzeption") ?? "Konzeption"; } }, { key: "support", get label() { return lookupLabel('projekte', 'projektart', "support") ?? "Support"; } }, { key: "sonstiges", get label() { return lookupLabel('projekte', 'projektart', "sonstiges") ?? "Sonstiges"; } }, { key: "it_beratung", get label() { return lookupLabel('projekte', 'projektart', "it_beratung") ?? "IT-Beratung"; } }],
    projektstart_monat: [{ key: "januar", get label() { return lookupLabel('projekte', 'projektstart_monat', "januar") ?? "Januar"; } }, { key: "februar", get label() { return lookupLabel('projekte', 'projektstart_monat', "februar") ?? "Februar"; } }, { key: "maerz", get label() { return lookupLabel('projekte', 'projektstart_monat', "maerz") ?? "März"; } }, { key: "april", get label() { return lookupLabel('projekte', 'projektstart_monat', "april") ?? "April"; } }, { key: "mai", get label() { return lookupLabel('projekte', 'projektstart_monat', "mai") ?? "Mai"; } }, { key: "juni", get label() { return lookupLabel('projekte', 'projektstart_monat', "juni") ?? "Juni"; } }, { key: "juli", get label() { return lookupLabel('projekte', 'projektstart_monat', "juli") ?? "Juli"; } }, { key: "august", get label() { return lookupLabel('projekte', 'projektstart_monat', "august") ?? "August"; } }, { key: "september", get label() { return lookupLabel('projekte', 'projektstart_monat', "september") ?? "September"; } }, { key: "oktober", get label() { return lookupLabel('projekte', 'projektstart_monat', "oktober") ?? "Oktober"; } }, { key: "november", get label() { return lookupLabel('projekte', 'projektstart_monat', "november") ?? "November"; } }, { key: "dezember", get label() { return lookupLabel('projekte', 'projektstart_monat', "dezember") ?? "Dezember"; } }],
    status: [{ key: "in_bearbeitung", get label() { return lookupLabel('projekte', 'status', "in_bearbeitung") ?? "In Bearbeitung"; } }, { key: "akquise", get label() { return lookupLabel('projekte', 'status', "akquise") ?? "Akquise"; } }, { key: "abgeschlossen", get label() { return lookupLabel('projekte', 'status', "abgeschlossen") ?? "Abgeschlossen"; } }],
  },
  'leistungskatalog': {
    leistungstyp: [{ key: "beratung", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "beratung") ?? "Beratung"; } }, { key: "entwicklung", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "entwicklung") ?? "Entwicklung"; } }, { key: "schulung", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "schulung") ?? "Schulung"; } }, { key: "support", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "support") ?? "Support"; } }, { key: "konzeption", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "konzeption") ?? "Konzeption"; } }, { key: "sonstiges", get label() { return lookupLabel('leistungskatalog', 'leistungstyp', "sonstiges") ?? "Sonstiges"; } }],
    einheit: [{ key: "stunde", get label() { return lookupLabel('leistungskatalog', 'einheit', "stunde") ?? "Stunde"; } }, { key: "tag", get label() { return lookupLabel('leistungskatalog', 'einheit', "tag") ?? "Tag"; } }, { key: "pauschal", get label() { return lookupLabel('leistungskatalog', 'einheit', "pauschal") ?? "Pauschal"; } }, { key: "monat", get label() { return lookupLabel('leistungskatalog', 'einheit', "monat") ?? "Monat"; } }],
  },
  'kunden': {
    kundentyp: [{ key: "einzelperson", get label() { return lookupLabel('kunden', 'kundentyp', "einzelperson") ?? "Einzelperson"; } }, { key: "firma", get label() { return lookupLabel('kunden', 'kundentyp', "firma") ?? "Firma"; } }, { key: "behoerde", get label() { return lookupLabel('kunden', 'kundentyp', "behoerde") ?? "Behörde"; } }, { key: "sonstiges", get label() { return lookupLabel('kunden', 'kundentyp', "sonstiges") ?? "Sonstiges"; } }],
    bevorzugte_kontaktart: [{ key: "email", get label() { return lookupLabel('kunden', 'bevorzugte_kontaktart', "email") ?? "E-Mail"; } }, { key: "telefon", get label() { return lookupLabel('kunden', 'bevorzugte_kontaktart', "telefon") ?? "Telefon"; } }, { key: "post", get label() { return lookupLabel('kunden', 'bevorzugte_kontaktart', "post") ?? "Post"; } }, { key: "persoenlich", get label() { return lookupLabel('kunden', 'bevorzugte_kontaktart', "persoenlich") ?? "Persönlich"; } }],
  },
  'berater/innen': {
    status: [{ key: "aktiv", get label() { return lookupLabel('berater/innen', 'status', "aktiv") ?? "Aktiv"; } }, { key: "urlaub", get label() { return lookupLabel('berater/innen', 'status', "urlaub") ?? "Urlaub"; } }, { key: "elternzeit", get label() { return lookupLabel('berater/innen', 'status', "elternzeit") ?? "Elternzeit"; } }, { key: "sonstiges", get label() { return lookupLabel('berater/innen', 'status', "sonstiges") ?? "Sonstiges"; } }],
  },
  'angebote': {
    angebotstyp: [{ key: "dienstleistung", get label() { return lookupLabel('angebote', 'angebotstyp', "dienstleistung") ?? "Dienstleistungsangebot"; } }, { key: "projekt", get label() { return lookupLabel('angebote', 'angebotstyp', "projekt") ?? "Projektangebot"; } }, { key: "wartung", get label() { return lookupLabel('angebote', 'angebotstyp', "wartung") ?? "Wartungsangebot"; } }, { key: "schulung", get label() { return lookupLabel('angebote', 'angebotstyp', "schulung") ?? "Schulungsangebot"; } }, { key: "sonstiges", get label() { return lookupLabel('angebote', 'angebotstyp', "sonstiges") ?? "Sonstiges"; } }],
    kostentyp: [{ key: "einmalig", get label() { return lookupLabel('angebote', 'kostentyp', "einmalig") ?? "Einmalig"; } }, { key: "monatlich", get label() { return lookupLabel('angebote', 'kostentyp', "monatlich") ?? "Monatlich"; } }, { key: "jaehrlich", get label() { return lookupLabel('angebote', 'kostentyp', "jaehrlich") ?? "Jährlich"; } }, { key: "nach_aufwand", get label() { return lookupLabel('angebote', 'kostentyp', "nach_aufwand") ?? "Nach Aufwand"; } }, { key: "pauschal", get label() { return lookupLabel('angebote', 'kostentyp', "pauschal") ?? "Pauschal"; } }, { key: "sonstiges", get label() { return lookupLabel('angebote', 'kostentyp', "sonstiges") ?? "Sonstiges"; } }],
    angebotsstatus: [{ key: "offen", get label() { return lookupLabel('angebote', 'angebotsstatus', "offen") ?? "Offen"; } }, { key: "gesendet", get label() { return lookupLabel('angebote', 'angebotsstatus', "gesendet") ?? "Gesendet"; } }, { key: "angenommen", get label() { return lookupLabel('angebote', 'angebotsstatus', "angenommen") ?? "Angenommen"; } }, { key: "abgelehnt", get label() { return lookupLabel('angebote', 'angebotsstatus', "abgelehnt") ?? "Abgelehnt"; } }, { key: "standard_offen", get label() { return lookupLabel('angebote', 'angebotsstatus', "standard_offen") ?? "Standard Offen"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'zeiterfassung': {
    'datum': 'date/date',
    'stunden': 'number',
    'monat': 'lookup/select',
    'jahr': 'string/text',
    'taetigkeitsbeschreibung': 'string/textarea',
    'verrechenbar': 'bool',
    'notizen': 'string/textarea',
    'berater': 'applookup/select',
    'projekt': 'applookup/select',
    'leistung': 'applookup/select',
  },
  'rechnungen': {
    'rechnungsnummer': 'string/text',
    'rechnungsdatum': 'date/date',
    'faelligkeitsdatum': 'date/date',
    'rechnungsstatus': 'lookup/radio',
    'abrechnungsmonat': 'lookup/select',
    'abrechnungsjahr': 'string/text',
    'nettobetrag': 'number',
    'mehrwertsteuer': 'number',
    'gesamtbetrag': 'number',
    'zahlungseingang': 'date/date',
    'leistungspositionen': 'string/textarea',
    'notizen': 'string/textarea',
    'rechnungsdatei': 'file',
    'kunde': 'applookup/select',
    'projekt': 'applookup/select',
    'berater': 'multipleapplookup/select',
  },
  'projekte': {
    'budget': 'number',
    'projektkennung': 'string/text',
    'projektnummer': 'number',
    'projektart': 'lookup/select',
    'projektstart_jahr': 'string/text',
    'projektstart_monat': 'lookup/select',
    'status': 'lookup/radio',
    'ansprechpartner_kunde': 'string/text',
    'letzter_schritt': 'string/textarea',
    'projektende': 'date/date',
    'notizen': 'string/textarea',
    'kunde': 'applookup/select',
    'projektleitung': 'applookup/select',
  },
  'leistungskatalog': {
    'berater': 'multipleapplookup/select',
    'leistungsbezeichnung': 'string/text',
    'leistungstyp': 'lookup/select',
    'beschreibung': 'string/textarea',
    'kostenvoranschlag': 'number',
    'stundensatz_leistung': 'number',
    'einheit': 'lookup/select',
    'verfuegbarkeit': 'string/textarea',
  },
  'kunden': {
    'kundenname': 'string/text',
    'kundentyp': 'lookup/radio',
    'email': 'string/email',
    'telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    're_strasse': 'string/text',
    're_hausnummer': 'string/text',
    're_plz': 'string/text',
    're_ort': 'string/text',
    'anlagedatum': 'date/date',
    'ap_titel': 'string/text',
    'ap_vorname': 'string/text',
    'ap_nachname': 'string/text',
    'ap_email': 'string/email',
    'ap_telefon': 'string/tel',
    'bevorzugte_kontaktart': 'lookup/select',
    'letzter_kontakt_datum': 'date/date',
    'letzter_kontakt_ansprechpartner': 'string/text',
    'notizen': 'string/textarea',
    'laufende_projekte': 'multipleapplookup/select',
  },
  'berater/innen': {
    'nachname': 'string/text',
    'vorname': 'string/text',
    'titel': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'email_beruflich': 'string/email',
    'email_privat': 'string/email',
    'telefon': 'string/tel',
    'einstiegsdatum': 'date/date',
    'status': 'lookup/radio',
    'stundensatz': 'number',
    'sonstiges_1': 'string/textarea',
    'sonstiges_2': 'string/textarea',
    'stunden_aktueller_monat': 'number',
    'stunden_aktuelles_quartal': 'number',
    'stunden_aktuelles_jahr': 'number',
    'stunden_letzter_monat': 'number',
    'stunden_letztes_quartal': 'number',
    'stunden_letztes_jahr': 'number',
    'leistungen': 'multipleapplookup/select',
    'projekte': 'multipleapplookup/select',
  },
  'angebote': {
    'kunde': 'applookup/select',
    'angebotsnummer': 'string/text',
    'angebotsjahr': 'string/text',
    'angebotstyp': 'lookup/select',
    'angebotsdatum': 'date/date',
    'gueltig_bis': 'date/date',
    'zeitrahmen_anfang': 'date/date',
    'zeitrahmen_ende': 'date/date',
    'dauer': 'string/text',
    'kostentyp': 'lookup/select',
    'kostenbetrag': 'number',
    'kosten_beschreibung': 'string/textarea',
    'angebotsbeschreibung': 'string/textarea',
    'leistungspositionen': 'string/textarea',
    'anmerkungen': 'string/textarea',
    'vorlage_datei': 'file',
    'projekt': 'applookup/select',
    'angebotsstatus': 'lookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
  'projekte': [
    { field: 'projekt', entity: 'zeiterfassung' },
    { field: 'projekt', entity: 'rechnungen' },
    { field: 'laufende_projekte', entity: 'kunden' },
    { field: 'projekte', entity: 'berater/innen' },
    { field: 'projekt', entity: 'angebote' },
  ],
  'kunden': [
    { field: 'kunde', entity: 'rechnungen' },
    { field: 'kunde', entity: 'projekte' },
    { field: 'kunde', entity: 'angebote' },
  ],
  'berater/innen': [
    { field: 'berater', entity: 'zeiterfassung' },
    { field: 'berater', entity: 'rechnungen' },
    { field: 'projektleitung', entity: 'projekte' },
    { field: 'berater', entity: 'leistungskatalog' },
  ],
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateZeiterfassung = StripLookup<Zeiterfassung['fields']>;
export type CreateRechnungen = StripLookup<Rechnungen['fields']>;
export type CreateProjekte = StripLookup<Projekte['fields']>;
export type CreateLeistungskatalog = StripLookup<Leistungskatalog['fields']>;
export type CreateKunden = StripLookup<Kunden['fields']>;
export type CreateBeraterInnen = StripLookup<BeraterInnen['fields']>;
export type CreateAngebote = StripLookup<Angebote['fields']>;