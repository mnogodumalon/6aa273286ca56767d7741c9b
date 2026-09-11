/**
 * Occupancy semantics — DECIDED BY THE BUILD AGENT, never by a heuristic.
 *
 * The Phase-2 orchestrator writes its decision to `.intents-staging/occupancy.json`
 * (stay pair, booked resource, statuses that do not occupy); the integration
 * step validates it against the app metadata and renders it into the block
 * below. Scaffold updates keep the block. Do not edit outside the markers.
 *
 * Both doors read this and nothing else: `occupancyFor` (internal flows AND
 * public pages) and the owner service (the public grant's occupancy read).
 * No rule for an entity = no availability calendar, no occupancy claim —
 * a plain date field pair is shown instead.
 *
 * Facts from the metadata — candidates, NOT decisions:
 *   - zeiterfassung: applookups berater→berater/innen, projekt→projekte, leistung→leistungskatalog · lookups monat[januar|februar|maerz|april|mai|juni|juli|august|september|oktober|november|dezember]
 *   - rechnungen: applookups kunde→kunden, projekt→projekte, berater→berater/innen · lookups rechnungsstatus[bezahlt|storniert|ueberfaellig|offen], abrechnungsmonat[januar|februar|maerz|april|mai|juni|juli|august|september|oktober|november|dezember]
 *   - projekte: applookups kunde→kunden, projektleitung→berater/innen · lookups projektart[entwicklung|schulung|konzeption|support|sonstiges|it_beratung], projektstart_monat[januar|februar|maerz|april|mai|juni|juli|august|september|oktober|november|dezember], status[in_bearbeitung|akquise|abgeschlossen]
 *   - leistungskatalog: applookups berater→berater/innen · lookups leistungstyp[beratung|entwicklung|schulung|support|konzeption|sonstiges], einheit[stunde|tag|pauschal|monat]
 *   - kunden: applookups laufende_projekte→projekte · lookups kundentyp[einzelperson|firma|behoerde|sonstiges], bevorzugte_kontaktart[email|telefon|post|persoenlich]
 *   - berater/innen: applookups leistungen→leistungskatalog, projekte→projekte · lookups status[aktiv|urlaub|elternzeit|sonstiges]
 *   - angebote: applookups kunde→kunden, projekt→projekte · lookups angebotstyp[dienstleistung|projekt|wartung|schulung|sonstiges], kostentyp[einmalig|monatlich|jaehrlich|nach_aufwand|pauschal|sonstiges], angebotsstatus[offen|gesendet|angenommen|abgelehnt|standard_offen]
 */
import type { EntityKey } from '@/lib/journey/rules';

export interface OccupancyRule {
  /** Arrival / departure fields (the departure day is exclusive). */
  from: string;
  to: string;
  /** applookup field naming the booked RESOURCE (room, vehicle, court).
   *  Omit when the entity itself is the one resource (a single holiday flat). */
  resource?: string;
  /** lookup field + the keys that mean "does NOT occupy" (cancelled, no-show). */
  statusField?: string;
  freeKeys?: string[];
}

export const OCCUPANCY: Partial<Record<EntityKey, OccupancyRule>> = {
  // <custom:occupancy>
  // </custom:occupancy>
};
