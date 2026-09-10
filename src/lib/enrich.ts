import type { EnrichedAngebote, EnrichedBeraterInnen, EnrichedKunden, EnrichedLeistungskatalog, EnrichedProjekte, EnrichedRechnungen, EnrichedZeiterfassung } from '@/types/enriched';
import type { Angebote, BeraterInnen, Kunden, Leistungskatalog, Projekte, Rechnungen, Zeiterfassung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BeraterInnenMaps {
  leistungskatalogMap: Map<string, Leistungskatalog>;
  projekteMap: Map<string, Projekte>;
}

export function enrichBeraterInnen(
  beraterInnen: BeraterInnen[],
  maps: BeraterInnenMaps
): EnrichedBeraterInnen[] {
  return beraterInnen.map(r => ({
    ...r,
    leistungenName: resolveDisplay(r.fields.leistungen, maps.leistungskatalogMap, 'leistungsbezeichnung'),
    projekteName: resolveDisplay(r.fields.projekte, maps.projekteMap, 'projektkennung'),
  }));
}

interface KundenMaps {
  projekteMap: Map<string, Projekte>;
}

export function enrichKunden(
  kunden: Kunden[],
  maps: KundenMaps
): EnrichedKunden[] {
  return kunden.map(r => ({
    ...r,
    laufende_projekteName: resolveDisplay(r.fields.laufende_projekte, maps.projekteMap, 'projektkennung'),
  }));
}

interface LeistungskatalogMaps {
  beraterInnenMap: Map<string, BeraterInnen>;
}

export function enrichLeistungskatalog(
  leistungskatalog: Leistungskatalog[],
  maps: LeistungskatalogMaps
): EnrichedLeistungskatalog[] {
  return leistungskatalog.map(r => ({
    ...r,
    beraterName: resolveDisplay(r.fields.berater, maps.beraterInnenMap, 'vorname', 'nachname'),
  }));
}

interface ProjekteMaps {
  kundenMap: Map<string, Kunden>;
  beraterInnenMap: Map<string, BeraterInnen>;
}

export function enrichProjekte(
  projekte: Projekte[],
  maps: ProjekteMaps
): EnrichedProjekte[] {
  return projekte.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'kundenname'),
    projektleitungName: resolveDisplay(r.fields.projektleitung, maps.beraterInnenMap, 'vorname', 'nachname'),
  }));
}

interface AngeboteMaps {
  projekteMap: Map<string, Projekte>;
  kundenMap: Map<string, Kunden>;
}

export function enrichAngebote(
  angebote: Angebote[],
  maps: AngeboteMaps
): EnrichedAngebote[] {
  return angebote.map(r => ({
    ...r,
    projektName: resolveDisplay(r.fields.projekt, maps.projekteMap, 'projektkennung'),
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'kundenname'),
  }));
}

interface ZeiterfassungMaps {
  beraterInnenMap: Map<string, BeraterInnen>;
  projekteMap: Map<string, Projekte>;
  leistungskatalogMap: Map<string, Leistungskatalog>;
}

export function enrichZeiterfassung(
  zeiterfassung: Zeiterfassung[],
  maps: ZeiterfassungMaps
): EnrichedZeiterfassung[] {
  return zeiterfassung.map(r => ({
    ...r,
    beraterName: resolveDisplay(r.fields.berater, maps.beraterInnenMap, 'vorname', 'nachname'),
    projektName: resolveDisplay(r.fields.projekt, maps.projekteMap, 'projektkennung'),
    leistungName: resolveDisplay(r.fields.leistung, maps.leistungskatalogMap, 'leistungsbezeichnung'),
  }));
}

interface RechnungenMaps {
  kundenMap: Map<string, Kunden>;
  projekteMap: Map<string, Projekte>;
  beraterInnenMap: Map<string, BeraterInnen>;
}

export function enrichRechnungen(
  rechnungen: Rechnungen[],
  maps: RechnungenMaps
): EnrichedRechnungen[] {
  return rechnungen.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'kundenname'),
    projektName: resolveDisplay(r.fields.projekt, maps.projekteMap, 'projektkennung'),
    beraterName: resolveDisplay(r.fields.berater, maps.beraterInnenMap, 'vorname', 'nachname'),
  }));
}
