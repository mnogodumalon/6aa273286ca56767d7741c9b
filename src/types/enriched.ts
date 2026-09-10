import type { Angebote, BeraterInnen, Kunden, Leistungskatalog, Projekte, Rechnungen, Zeiterfassung } from './app';

export type EnrichedBeraterInnen = BeraterInnen & {
  leistungenName: string;
  projekteName: string;
};

export type EnrichedKunden = Kunden & {
  laufende_projekteName: string;
};

export type EnrichedLeistungskatalog = Leistungskatalog & {
  beraterName: string;
};

export type EnrichedProjekte = Projekte & {
  kundeName: string;
  projektleitungName: string;
};

export type EnrichedAngebote = Angebote & {
  projektName: string;
  kundeName: string;
};

export type EnrichedZeiterfassung = Zeiterfassung & {
  beraterName: string;
  projektName: string;
  leistungName: string;
};

export type EnrichedRechnungen = Rechnungen & {
  kundeName: string;
  projektName: string;
  beraterName: string;
};
