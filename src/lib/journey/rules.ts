/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'zeiterfassung' | 'rechnungen' | 'projekte' | 'leistungskatalog' | 'kunden' | 'berater/innen' | 'angebote';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "zeiterfassung": "jahr" | "taetigkeitsbeschreibung" | "notizen";
  "rechnungen": "rechnungsnummer" | "abrechnungsjahr" | "leistungspositionen" | "notizen";
  "projekte": "projektkennung" | "projektstart_jahr" | "ansprechpartner_kunde" | "letzter_schritt" | "notizen";
  "leistungskatalog": "leistungsbezeichnung" | "beschreibung" | "verfuegbarkeit";
  "kunden": "kundenname" | "email" | "telefon" | "strasse" | "hausnummer" | "plz" | "ort" | "re_strasse" | "re_hausnummer" | "re_plz" | "re_ort" | "ap_titel" | "ap_vorname" | "ap_nachname" | "ap_email" | "ap_telefon" | "letzter_kontakt_ansprechpartner" | "notizen";
  "berater/innen": "nachname" | "vorname" | "titel" | "strasse" | "hausnummer" | "plz" | "ort" | "email_beruflich" | "email_privat" | "telefon" | "sonstiges_1" | "sonstiges_2";
  "angebote": "angebotsnummer" | "angebotsjahr" | "dauer" | "kosten_beschreibung" | "angebotsbeschreibung" | "leistungspositionen" | "anmerkungen";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "zeiterfassung": "berater" | "projekt" | "leistung";
  "rechnungen": "kunde" | "projekt" | "berater";
  "projekte": "kunde" | "projektleitung";
  "leistungskatalog": "berater";
  "kunden": "laufende_projekte";
  "berater/innen": "leistungen" | "projekte";
  "angebote": "kunde" | "projekt";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it (`file` is upload-only, never via a journey). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "zeiterfassung": {
    "key": "zeiterfassung",
    "appId": "6aa2732a257f97e973b1bd1e",
    "label": "Zeiterfassung",
    "pascal": "Zeiterfassung",
    "single": "ZeiterfassungEntry"
  },
  "rechnungen": {
    "key": "rechnungen",
    "appId": "6aa2732aa4e4e2be4c8e8430",
    "label": "Rechnungen",
    "pascal": "Rechnungen",
    "single": "RechnungenEntry"
  },
  "projekte": {
    "key": "projekte",
    "appId": "6aa273295a15f8de72caafa5",
    "label": "Projekte",
    "pascal": "Projekte",
    "single": "ProjekteEntry"
  },
  "leistungskatalog": {
    "key": "leistungskatalog",
    "appId": "6aa273296dbcd7b108665956",
    "label": "Leistungskatalog",
    "pascal": "Leistungskatalog",
    "single": "LeistungskatalogEntry"
  },
  "kunden": {
    "key": "kunden",
    "appId": "6aa273294c403c0fd2685a6a",
    "label": "Kunden",
    "pascal": "Kunden",
    "single": "KundenEntry"
  },
  "berater/innen": {
    "key": "berater/innen",
    "appId": "6aa2732961edefefe81f0158",
    "label": "Berater/innen",
    "pascal": "BeraterInnen",
    "single": "BeraterInnenEntry"
  },
  "angebote": {
    "key": "angebote",
    "appId": "6aa27329e0c6d41166a81758",
    "label": "Angebote",
    "pascal": "Angebote",
    "single": "AngeboteEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "zeiterfassung": {
    "datum": {
      "key": "datum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Datum",
      "writable": true
    },
    "stunden": {
      "key": "stunden",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Geleistete Stunden",
      "writable": true
    },
    "monat": {
      "key": "monat",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Abrechnungsmonat",
      "writable": true,
      "options": [
        "januar",
        "februar",
        "maerz",
        "april",
        "mai",
        "juni",
        "juli",
        "august",
        "september",
        "oktober",
        "november",
        "dezember"
      ]
    },
    "jahr": {
      "key": "jahr",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Abrechnungsjahr",
      "writable": true,
      "maxLength": 4000
    },
    "taetigkeitsbeschreibung": {
      "key": "taetigkeitsbeschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Tätigkeitsbeschreibung",
      "writable": true
    },
    "verrechenbar": {
      "key": "verrechenbar",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Verrechenbar",
      "writable": true
    },
    "notizen": {
      "key": "notizen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Notizen",
      "writable": true
    },
    "berater": {
      "key": "berater",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Berater/in",
      "writable": true,
      "targetAppId": "6aa2732961edefefe81f0158",
      "targetEntity": "berater/innen"
    },
    "projekt": {
      "key": "projekt",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Projekt",
      "writable": true,
      "targetAppId": "6aa273295a15f8de72caafa5",
      "targetEntity": "projekte"
    },
    "leistung": {
      "key": "leistung",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Erbrachte Leistung",
      "writable": true,
      "targetAppId": "6aa273296dbcd7b108665956",
      "targetEntity": "leistungskatalog"
    }
  },
  "rechnungen": {
    "rechnungsnummer": {
      "key": "rechnungsnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Rechnungsnummer",
      "writable": true,
      "maxLength": 4000
    },
    "rechnungsdatum": {
      "key": "rechnungsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Rechnungsdatum",
      "writable": true
    },
    "faelligkeitsdatum": {
      "key": "faelligkeitsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Fälligkeitsdatum",
      "writable": true
    },
    "rechnungsstatus": {
      "key": "rechnungsstatus",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Rechnungsstatus",
      "writable": true,
      "options": [
        "bezahlt",
        "storniert",
        "ueberfaellig",
        "offen"
      ]
    },
    "abrechnungsmonat": {
      "key": "abrechnungsmonat",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Abrechnungsmonat",
      "writable": true,
      "options": [
        "januar",
        "februar",
        "maerz",
        "april",
        "mai",
        "juni",
        "juli",
        "august",
        "september",
        "oktober",
        "november",
        "dezember"
      ]
    },
    "abrechnungsjahr": {
      "key": "abrechnungsjahr",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Abrechnungsjahr",
      "writable": true,
      "maxLength": 4000
    },
    "nettobetrag": {
      "key": "nettobetrag",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Nettobetrag (€)",
      "writable": true,
      "format": "currency"
    },
    "mehrwertsteuer": {
      "key": "mehrwertsteuer",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Mehrwertsteuer (%)",
      "writable": true
    },
    "gesamtbetrag": {
      "key": "gesamtbetrag",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Gesamtbetrag (€)",
      "writable": true,
      "format": "currency"
    },
    "zahlungseingang": {
      "key": "zahlungseingang",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Zahlungseingang",
      "writable": true
    },
    "leistungspositionen": {
      "key": "leistungspositionen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Leistungspositionen",
      "writable": true
    },
    "notizen": {
      "key": "notizen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Notizen",
      "writable": true
    },
    "rechnungsdatei": {
      "key": "rechnungsdatei",
      "fulltype": "file",
      "kind": "file",
      "required": false,
      "label": "Rechnungsdokument (PDF)",
      "writable": false
    },
    "kunde": {
      "key": "kunde",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Kunde",
      "writable": true,
      "targetAppId": "6aa273294c403c0fd2685a6a",
      "targetEntity": "kunden"
    },
    "projekt": {
      "key": "projekt",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Projekt",
      "writable": true,
      "targetAppId": "6aa273295a15f8de72caafa5",
      "targetEntity": "projekte"
    },
    "berater": {
      "key": "berater",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Beteiligte Berater/innen",
      "writable": true,
      "targetAppId": "6aa2732961edefefe81f0158",
      "targetEntity": "berater/innen"
    }
  },
  "projekte": {
    "budget": {
      "key": "budget",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Budget (€)",
      "writable": true,
      "format": "currency"
    },
    "projektkennung": {
      "key": "projektkennung",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Projektkennung",
      "writable": true,
      "maxLength": 4000
    },
    "projektnummer": {
      "key": "projektnummer",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Projektnummer",
      "writable": true
    },
    "projektart": {
      "key": "projektart",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Projektart",
      "writable": true,
      "options": [
        "entwicklung",
        "schulung",
        "konzeption",
        "support",
        "sonstiges",
        "it_beratung"
      ]
    },
    "projektstart_jahr": {
      "key": "projektstart_jahr",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Startjahr",
      "writable": true,
      "maxLength": 4000
    },
    "projektstart_monat": {
      "key": "projektstart_monat",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Startmonat",
      "writable": true,
      "options": [
        "januar",
        "februar",
        "maerz",
        "april",
        "mai",
        "juni",
        "juli",
        "august",
        "september",
        "oktober",
        "november",
        "dezember"
      ]
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Projektstatus",
      "writable": true,
      "options": [
        "in_bearbeitung",
        "akquise",
        "abgeschlossen"
      ]
    },
    "ansprechpartner_kunde": {
      "key": "ansprechpartner_kunde",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ansprechpartner beim Kunden",
      "writable": true,
      "maxLength": 4000
    },
    "letzter_schritt": {
      "key": "letzter_schritt",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Letzter Schritt / aktueller Stand",
      "writable": true
    },
    "projektende": {
      "key": "projektende",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Geplantes Projektende",
      "writable": true
    },
    "notizen": {
      "key": "notizen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Notizen",
      "writable": true
    },
    "kunde": {
      "key": "kunde",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Kunde",
      "writable": true,
      "targetAppId": "6aa273294c403c0fd2685a6a",
      "targetEntity": "kunden"
    },
    "projektleitung": {
      "key": "projektleitung",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Projektleitung",
      "writable": true,
      "targetAppId": "6aa2732961edefefe81f0158",
      "targetEntity": "berater/innen"
    }
  },
  "leistungskatalog": {
    "berater": {
      "key": "berater",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Ausführende Berater/innen",
      "writable": true,
      "targetAppId": "6aa2732961edefefe81f0158",
      "targetEntity": "berater/innen"
    },
    "leistungsbezeichnung": {
      "key": "leistungsbezeichnung",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Leistungsbezeichnung",
      "writable": true,
      "maxLength": 4000
    },
    "leistungstyp": {
      "key": "leistungstyp",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Leistungstyp",
      "writable": true,
      "options": [
        "beratung",
        "entwicklung",
        "schulung",
        "support",
        "konzeption",
        "sonstiges"
      ]
    },
    "beschreibung": {
      "key": "beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung",
      "writable": true
    },
    "kostenvoranschlag": {
      "key": "kostenvoranschlag",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Normaler Kostenvoranschlag (€)",
      "writable": true,
      "format": "currency"
    },
    "stundensatz_leistung": {
      "key": "stundensatz_leistung",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Stundensatz für diese Leistung (€/h)",
      "writable": true,
      "format": "currency"
    },
    "einheit": {
      "key": "einheit",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Abrechnungseinheit",
      "writable": true,
      "options": [
        "stunde",
        "tag",
        "pauschal",
        "monat"
      ]
    },
    "verfuegbarkeit": {
      "key": "verfuegbarkeit",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Verfügbarkeit / Hinweise",
      "writable": true
    }
  },
  "kunden": {
    "kundenname": {
      "key": "kundenname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Name / Firmenname",
      "writable": true,
      "maxLength": 4000
    },
    "kundentyp": {
      "key": "kundentyp",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Kundentyp",
      "writable": true,
      "options": [
        "einzelperson",
        "firma",
        "behoerde",
        "sonstiges"
      ]
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": true,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "strasse": {
      "key": "strasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Straße",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-line1"
    },
    "hausnummer": {
      "key": "hausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "plz": {
      "key": "plz",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Postleitzahl",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ort",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "re_strasse": {
      "key": "re_strasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rechnungsstraße",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-line1"
    },
    "re_hausnummer": {
      "key": "re_hausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rechnungs-Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "re_plz": {
      "key": "re_plz",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rechnungs-Postleitzahl",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "re_ort": {
      "key": "re_ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rechnungs-Ort",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "anlagedatum": {
      "key": "anlagedatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Anlagedatum",
      "writable": true
    },
    "ap_titel": {
      "key": "ap_titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Titel Ansprechpartner",
      "writable": true,
      "maxLength": 4000
    },
    "ap_vorname": {
      "key": "ap_vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Vorname Ansprechpartner",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "ap_nachname": {
      "key": "ap_nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Nachname Ansprechpartner",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "ap_email": {
      "key": "ap_email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail Ansprechpartner",
      "writable": true,
      "autoComplete": "email"
    },
    "ap_telefon": {
      "key": "ap_telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon Ansprechpartner",
      "writable": true,
      "autoComplete": "tel"
    },
    "bevorzugte_kontaktart": {
      "key": "bevorzugte_kontaktart",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Bevorzugte Kontaktart",
      "writable": true,
      "options": [
        "email",
        "telefon",
        "post",
        "persoenlich"
      ]
    },
    "letzter_kontakt_datum": {
      "key": "letzter_kontakt_datum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Datum letzter Kontakt",
      "writable": true
    },
    "letzter_kontakt_ansprechpartner": {
      "key": "letzter_kontakt_ansprechpartner",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ansprechpartner beim letzten Kontakt",
      "writable": true,
      "maxLength": 4000
    },
    "notizen": {
      "key": "notizen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Notizen",
      "writable": true
    },
    "laufende_projekte": {
      "key": "laufende_projekte",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Aktuell laufende Projekte",
      "writable": true,
      "targetAppId": "6aa273295a15f8de72caafa5",
      "targetEntity": "projekte"
    }
  },
  "berater/innen": {
    "nachname": {
      "key": "nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "vorname": {
      "key": "vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "titel": {
      "key": "titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Titel (optional)",
      "writable": true,
      "maxLength": 4000
    },
    "strasse": {
      "key": "strasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Straße",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-line1"
    },
    "hausnummer": {
      "key": "hausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "plz": {
      "key": "plz",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Postleitzahl",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ort",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "email_beruflich": {
      "key": "email_beruflich",
      "fulltype": "string/email",
      "kind": "email",
      "required": true,
      "label": "E-Mail (beruflich)",
      "writable": true,
      "autoComplete": "email"
    },
    "email_privat": {
      "key": "email_privat",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail (privat)",
      "writable": true,
      "autoComplete": "email"
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "einstiegsdatum": {
      "key": "einstiegsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Einstiegsdatum",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "aktiv",
        "urlaub",
        "elternzeit",
        "sonstiges"
      ]
    },
    "stundensatz": {
      "key": "stundensatz",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Stundensatz (€/h)",
      "writable": true,
      "format": "currency"
    },
    "sonstiges_1": {
      "key": "sonstiges_1",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Sonstige Anmerkungen (1)",
      "writable": true
    },
    "sonstiges_2": {
      "key": "sonstiges_2",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Sonstige Anmerkungen (2)",
      "writable": true
    },
    "stunden_aktueller_monat": {
      "key": "stunden_aktueller_monat",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – aktueller Monat",
      "writable": true
    },
    "stunden_aktuelles_quartal": {
      "key": "stunden_aktuelles_quartal",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – aktuelles Quartal",
      "writable": true
    },
    "stunden_aktuelles_jahr": {
      "key": "stunden_aktuelles_jahr",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – aktuelles Jahr",
      "writable": true
    },
    "stunden_letzter_monat": {
      "key": "stunden_letzter_monat",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – letzter Monat",
      "writable": true
    },
    "stunden_letztes_quartal": {
      "key": "stunden_letztes_quartal",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – letztes Quartal",
      "writable": true
    },
    "stunden_letztes_jahr": {
      "key": "stunden_letztes_jahr",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gebuchte Stunden – letztes Jahr",
      "writable": true
    },
    "leistungen": {
      "key": "leistungen",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Erbringbare Leistungen",
      "writable": true,
      "targetAppId": "6aa273296dbcd7b108665956",
      "targetEntity": "leistungskatalog"
    },
    "projekte": {
      "key": "projekte",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Aktuell zugewiesene Projekte",
      "writable": true,
      "targetAppId": "6aa273295a15f8de72caafa5",
      "targetEntity": "projekte"
    }
  },
  "angebote": {
    "kunde": {
      "key": "kunde",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Kunde",
      "writable": true,
      "targetAppId": "6aa273294c403c0fd2685a6a",
      "targetEntity": "kunden"
    },
    "angebotsnummer": {
      "key": "angebotsnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Angebotsnummer",
      "writable": true,
      "maxLength": 4000
    },
    "angebotsjahr": {
      "key": "angebotsjahr",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Jahr",
      "writable": true,
      "maxLength": 4000
    },
    "angebotstyp": {
      "key": "angebotstyp",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Angebotstyp",
      "writable": true,
      "options": [
        "dienstleistung",
        "projekt",
        "wartung",
        "schulung",
        "sonstiges"
      ]
    },
    "angebotsdatum": {
      "key": "angebotsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Angebotsdatum",
      "writable": true
    },
    "gueltig_bis": {
      "key": "gueltig_bis",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Gültig bis",
      "writable": true
    },
    "zeitrahmen_anfang": {
      "key": "zeitrahmen_anfang",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Beginn",
      "writable": true
    },
    "zeitrahmen_ende": {
      "key": "zeitrahmen_ende",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Ende (falls vorhanden)",
      "writable": true
    },
    "dauer": {
      "key": "dauer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Dauer",
      "writable": true,
      "maxLength": 4000
    },
    "kostentyp": {
      "key": "kostentyp",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Kostentyp",
      "writable": true,
      "options": [
        "einmalig",
        "monatlich",
        "jaehrlich",
        "nach_aufwand",
        "pauschal",
        "sonstiges"
      ]
    },
    "kostenbetrag": {
      "key": "kostenbetrag",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Betrag (€)",
      "writable": true,
      "format": "currency"
    },
    "kosten_beschreibung": {
      "key": "kosten_beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Kostenbeschreibung",
      "writable": true
    },
    "angebotsbeschreibung": {
      "key": "angebotsbeschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Angebotsbeschreibung",
      "writable": true
    },
    "leistungspositionen": {
      "key": "leistungspositionen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Leistungspositionen",
      "writable": true
    },
    "anmerkungen": {
      "key": "anmerkungen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Anmerkungen / Sonstiges",
      "writable": true
    },
    "vorlage_datei": {
      "key": "vorlage_datei",
      "fulltype": "file",
      "kind": "file",
      "required": false,
      "label": "Angebotsvorlage (PDF/Dokument)",
      "writable": false
    },
    "projekt": {
      "key": "projekt",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Zugewiesenes Projekt",
      "writable": true,
      "targetAppId": "6aa273295a15f8de72caafa5",
      "targetEntity": "projekte"
    },
    "angebotsstatus": {
      "key": "angebotsstatus",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Angebotsstatus",
      "writable": true,
      "options": [
        "offen",
        "gesendet",
        "angenommen",
        "abgelehnt",
        "standard_offen"
      ]
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "zeiterfassung": [
    {
      "kind": "record",
      "field": "berater",
      "targetEntity": "berater/innen"
    },
    {
      "kind": "record",
      "field": "projekt",
      "targetEntity": "projekte"
    },
    {
      "kind": "record",
      "field": "leistung",
      "targetEntity": "leistungskatalog"
    }
  ],
  "rechnungen": [
    {
      "kind": "choice",
      "field": "rechnungsstatus",
      "count": 4
    },
    {
      "kind": "record",
      "field": "kunde",
      "targetEntity": "kunden"
    },
    {
      "kind": "record",
      "field": "projekt",
      "targetEntity": "projekte"
    },
    {
      "kind": "record",
      "field": "berater",
      "targetEntity": "berater/innen"
    }
  ],
  "projekte": [
    {
      "kind": "choice",
      "field": "projektart",
      "count": 6
    },
    {
      "kind": "choice",
      "field": "status",
      "count": 3
    },
    {
      "kind": "record",
      "field": "kunde",
      "targetEntity": "kunden"
    },
    {
      "kind": "record",
      "field": "projektleitung",
      "targetEntity": "berater/innen"
    }
  ],
  "leistungskatalog": [
    {
      "kind": "choice",
      "field": "leistungstyp",
      "count": 6
    },
    {
      "kind": "choice",
      "field": "einheit",
      "count": 4
    },
    {
      "kind": "record",
      "field": "berater",
      "targetEntity": "berater/innen"
    }
  ],
  "kunden": [
    {
      "kind": "choice",
      "field": "kundentyp",
      "count": 4
    },
    {
      "kind": "choice",
      "field": "bevorzugte_kontaktart",
      "count": 4
    },
    {
      "kind": "record",
      "field": "laufende_projekte",
      "targetEntity": "projekte"
    }
  ],
  "berater/innen": [
    {
      "kind": "choice",
      "field": "status",
      "count": 4
    },
    {
      "kind": "record",
      "field": "leistungen",
      "targetEntity": "leistungskatalog"
    },
    {
      "kind": "record",
      "field": "projekte",
      "targetEntity": "projekte"
    }
  ],
  "angebote": [
    {
      "kind": "choice",
      "field": "angebotstyp",
      "count": 5
    },
    {
      "kind": "choice",
      "field": "kostentyp",
      "count": 6
    },
    {
      "kind": "choice",
      "field": "angebotsstatus",
      "count": 5
    },
    {
      "kind": "record",
      "field": "kunde",
      "targetEntity": "kunden"
    },
    {
      "kind": "record",
      "field": "projekt",
      "targetEntity": "projekte"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "zeiterfassung": [
    "jahr"
  ],
  "rechnungen": [
    "rechnungsnummer"
  ],
  "projekte": [
    "projektkennung"
  ],
  "leistungskatalog": [
    "leistungsbezeichnung"
  ],
  "kunden": [
    "kundenname"
  ],
  "berater/innen": [
    "vorname",
    "nachname"
  ],
  "angebote": [
    "angebotsnummer"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => fields[k])
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .map(v => v.trim());
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — runtime bundle first, generated label second. */
export function labelOf(entity: EntityKey, key: string): string {
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
