/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'zeiterfassung'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.zeiterfassung.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.zeiterfassung.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.zeiterfassung.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.zeiterfassung              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   zeiterfassung: datum, stunden, monat, jahr, taetigkeitsbeschreibung, verrechenbar, notizen, berater, …  ·  → berater/innen · → projekte · → leistungskatalog
 *   rechnungen: rechnungsnummer, rechnungsdatum, faelligkeitsdatum, rechnungsstatus, abrechnungsmonat, abrechnungsjahr, nettobetrag, mehrwertsteuer, …  ·  → kunden · → projekte · → berater/innen
 *   projekte: budget, projektkennung, projektnummer, projektart, projektstart_jahr, projektstart_monat, status, ansprechpartner_kunde, …  ·  → kunden · → berater/innen · ← zeiterfassung (list + contextual +) · ← rechnungen (list + contextual +) · ← kunden (list + contextual + + choose existing) · ← berater/innen (list + contextual + + choose existing) · ← angebote (list + contextual +)
 *   leistungskatalog: berater, leistungsbezeichnung, leistungstyp, beschreibung, kostenvoranschlag, stundensatz_leistung, einheit, verfuegbarkeit  ·  → berater/innen · ← zeiterfassung (list + contextual +) · ← berater/innen (list + contextual + + choose existing)
 *   kunden: kundenname, kundentyp, email, telefon, strasse, hausnummer, plz, ort, …  ·  → projekte · ← rechnungen (list + contextual +) · ← projekte (list + contextual +) · ← angebote (list + contextual +)
 *   berater/innen: nachname, vorname, titel, strasse, hausnummer, plz, ort, email_beruflich, …  ·  → leistungskatalog · → projekte · ← zeiterfassung (list + contextual +) · ← rechnungen (list + contextual + + choose existing) · ← projekte (list + contextual +) · ← leistungskatalog (list + contextual + + choose existing)
 *   angebote: kunde, angebotsnummer, angebotsjahr, angebotstyp, angebotsdatum, gueltig_bis, zeitrahmen_anfang, zeitrahmen_ende, …  ·  → kunden · → projekte
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Zeiterfassung, Rechnungen, Projekte, Leistungskatalog, Kunden, BeraterInnen, Angebote } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordIds } from '@/services/livingAppsService';
import { enrichZeiterfassung, enrichRechnungen, enrichProjekte, enrichLeistungskatalog, enrichKunden, enrichBeraterInnen, enrichAngebote } from '@/lib/enrich';
import type { EnrichedZeiterfassung, EnrichedRechnungen, EnrichedProjekte, EnrichedLeistungskatalog, EnrichedKunden, EnrichedBeraterInnen, EnrichedAngebote } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { ZeiterfassungDialog, type ZeiterfassungDialogDefaults } from '@/components/dialogs/ZeiterfassungDialog';
import { ZeiterfassungDetails } from '@/components/details/ZeiterfassungDetails';
import { RechnungenDialog, type RechnungenDialogDefaults } from '@/components/dialogs/RechnungenDialog';
import { RechnungenDetails } from '@/components/details/RechnungenDetails';
import { ProjekteDialog, type ProjekteDialogDefaults } from '@/components/dialogs/ProjekteDialog';
import { ProjekteDetails } from '@/components/details/ProjekteDetails';
import { LeistungskatalogDialog, type LeistungskatalogDialogDefaults } from '@/components/dialogs/LeistungskatalogDialog';
import { LeistungskatalogDetails } from '@/components/details/LeistungskatalogDetails';
import { KundenDialog, type KundenDialogDefaults } from '@/components/dialogs/KundenDialog';
import { KundenDetails } from '@/components/details/KundenDetails';
import { BeraterInnenDialog, type BeraterInnenDialogDefaults } from '@/components/dialogs/BeraterInnenDialog';
import { BeraterInnenDetails } from '@/components/details/BeraterInnenDetails';
import { AngeboteDialog, type AngeboteDialogDefaults } from '@/components/dialogs/AngeboteDialog';
import { AngeboteDetails } from '@/components/details/AngeboteDetails';
import { PickExistingDialog } from '@/components/PickExistingDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'zeiterfassung'; record: EnrichedZeiterfassung }
  | { type: 'rechnungen'; record: EnrichedRechnungen }
  | { type: 'projekte'; record: EnrichedProjekte }
  | { type: 'leistungskatalog'; record: EnrichedLeistungskatalog }
  | { type: 'kunden'; record: EnrichedKunden }
  | { type: 'beraterInnen'; record: EnrichedBeraterInnen }
  | { type: 'angebote'; record: EnrichedAngebote };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  zeiterfassung: EntityCrudApi<Zeiterfassung, ZeiterfassungDialogDefaults>;
  rechnungen: EntityCrudApi<Rechnungen, RechnungenDialogDefaults>;
  projekte: EntityCrudApi<Projekte, ProjekteDialogDefaults>;
  leistungskatalog: EntityCrudApi<Leistungskatalog, LeistungskatalogDialogDefaults>;
  kunden: EntityCrudApi<Kunden, KundenDialogDefaults>;
  beraterInnen: EntityCrudApi<BeraterInnen, BeraterInnenDialogDefaults>;
  angebote: EntityCrudApi<Angebote, AngeboteDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { zeiterfassung: EnrichedZeiterfassung[]; rechnungen: EnrichedRechnungen[]; projekte: EnrichedProjekte[]; leistungskatalog: EnrichedLeistungskatalog[]; kunden: EnrichedKunden[]; beraterInnen: EnrichedBeraterInnen[]; angebote: EnrichedAngebote[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [zeiterfassungDialog, setZeiterfassungDialog] = useState<{ defaults?: ZeiterfassungDialogDefaults; editing?: Zeiterfassung } | null>(null);
  const [rechnungenDialog, setRechnungenDialog] = useState<{ defaults?: RechnungenDialogDefaults; editing?: Rechnungen } | null>(null);
  const [projekteDialog, setProjekteDialog] = useState<{ defaults?: ProjekteDialogDefaults; editing?: Projekte } | null>(null);
  const [leistungskatalogDialog, setLeistungskatalogDialog] = useState<{ defaults?: LeistungskatalogDialogDefaults; editing?: Leistungskatalog } | null>(null);
  const [kundenDialog, setKundenDialog] = useState<{ defaults?: KundenDialogDefaults; editing?: Kunden } | null>(null);
  const [beraterInnenDialog, setBeraterInnenDialog] = useState<{ defaults?: BeraterInnenDialogDefaults; editing?: BeraterInnen } | null>(null);
  const [angeboteDialog, setAngeboteDialog] = useState<{ defaults?: AngeboteDialogDefaults; editing?: Angebote } | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug kunden.laufende_projekte → projekte: hält die Hub-record_id.
  const [pickProjekteKundenLaufendeProjekte, setPickProjekteKundenLaufendeProjekte] = useState<string | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug berater/innen.projekte → projekte: hält die Hub-record_id.
  const [pickProjekteBeraterInnenProjekte, setPickProjekteBeraterInnenProjekte] = useState<string | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug berater/innen.leistungen → leistungskatalog: hält die Hub-record_id.
  const [pickLeistungskatalogBeraterInnenLeistungen, setPickLeistungskatalogBeraterInnenLeistungen] = useState<string | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug rechnungen.berater → berater/innen: hält die Hub-record_id.
  const [pickBeraterInnenRechnungen, setPickBeraterInnenRechnungen] = useState<string | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug leistungskatalog.berater → berater/innen: hält die Hub-record_id.
  const [pickBeraterInnenLeistungskatalogBerater, setPickBeraterInnenLeistungskatalogBerater] = useState<string | null>(null);
  const enrichedZeiterfassung = useMemo(() => enrichZeiterfassung(data.zeiterfassung, { beraterInnenMap: data.beraterInnenMap, projekteMap: data.projekteMap, leistungskatalogMap: data.leistungskatalogMap }), [data.zeiterfassung, data.beraterInnenMap, data.projekteMap, data.leistungskatalogMap]);
  const enrichedRechnungen = useMemo(() => enrichRechnungen(data.rechnungen, { kundenMap: data.kundenMap, projekteMap: data.projekteMap, beraterInnenMap: data.beraterInnenMap }), [data.rechnungen, data.kundenMap, data.projekteMap, data.beraterInnenMap]);
  const enrichedProjekte = useMemo(() => enrichProjekte(data.projekte, { kundenMap: data.kundenMap, beraterInnenMap: data.beraterInnenMap }), [data.projekte, data.kundenMap, data.beraterInnenMap]);
  const enrichedLeistungskatalog = useMemo(() => enrichLeistungskatalog(data.leistungskatalog, { beraterInnenMap: data.beraterInnenMap }), [data.leistungskatalog, data.beraterInnenMap]);
  const enrichedKunden = useMemo(() => enrichKunden(data.kunden, { projekteMap: data.projekteMap }), [data.kunden, data.projekteMap]);
  const enrichedBeraterInnen = useMemo(() => enrichBeraterInnen(data.beraterInnen, { leistungskatalogMap: data.leistungskatalogMap, projekteMap: data.projekteMap }), [data.beraterInnen, data.leistungskatalogMap, data.projekteMap]);
  const enrichedAngebote = useMemo(() => enrichAngebote(data.angebote, { kundenMap: data.kundenMap, projekteMap: data.projekteMap }), [data.angebote, data.kundenMap, data.projekteMap]);

  function detailZeiterfassung(record: Zeiterfassung, push = false) {
    const rec = enrichedZeiterfassung.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'zeiterfassung', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitZeiterfassung(fields: Zeiterfassung['fields']) {
    const editing = zeiterfassungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setZeiterfassung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateZeiterfassungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('zeiterfassung')} — ${t('crud_updated')}`, async () => {
        data.setZeiterfassung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateZeiterfassungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createZeiterfassungEntry(fields);
      undoToast(`${appLabel('zeiterfassung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailRechnungen(record: Rechnungen, push = false) {
    const rec = enrichedRechnungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'rechnungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitRechnungen(fields: Rechnungen['fields']) {
    const editing = rechnungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setRechnungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateRechnungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('rechnungen')} — ${t('crud_updated')}`, async () => {
        data.setRechnungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateRechnungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createRechnungenEntry(fields);
      undoToast(`${appLabel('rechnungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailProjekte(record: Projekte, push = false) {
    const rec = enrichedProjekte.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'projekte', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitProjekte(fields: Projekte['fields']) {
    const editing = projekteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setProjekte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateProjekteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('projekte')} — ${t('crud_updated')}`, async () => {
        data.setProjekte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateProjekteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createProjekteEntry(fields);
      undoToast(`${appLabel('projekte')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  // Link an EXISTING Kunden to the Projekte hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkProjekteKundenLaufendeProjekte(sourceId: string) {
    const hub = pickProjekteKundenLaufendeProjekte;
    const src = data.kunden.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.laufende_projekte);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.PROJEKTE, id));
    data.setKunden(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, laufende_projekte: next } } : r)));
    try {
      await LivingAppsService.updateKundenEntry(sourceId, { laufende_projekte: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('kunden')} — ${t('pick_linked')}`, async () => {
      data.setKunden(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateKundenEntry(sourceId, { laufende_projekte: src.fields.laufende_projekte }); } catch { data.fetchAll(); }
    });
  }

  // Link an EXISTING BeraterInnen to the Projekte hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkProjekteBeraterInnenProjekte(sourceId: string) {
    const hub = pickProjekteBeraterInnenProjekte;
    const src = data.beraterInnen.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.projekte);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.PROJEKTE, id));
    data.setBeraterInnen(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, projekte: next } } : r)));
    try {
      await LivingAppsService.updateBeraterInnenEntry(sourceId, { projekte: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('berater/innen')} — ${t('pick_linked')}`, async () => {
      data.setBeraterInnen(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateBeraterInnenEntry(sourceId, { projekte: src.fields.projekte }); } catch { data.fetchAll(); }
    });
  }

  function detailLeistungskatalog(record: Leistungskatalog, push = false) {
    const rec = enrichedLeistungskatalog.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'leistungskatalog', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitLeistungskatalog(fields: Leistungskatalog['fields']) {
    const editing = leistungskatalogDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setLeistungskatalog(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateLeistungskatalogEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('leistungskatalog')} — ${t('crud_updated')}`, async () => {
        data.setLeistungskatalog(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateLeistungskatalogEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createLeistungskatalogEntry(fields);
      undoToast(`${appLabel('leistungskatalog')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  // Link an EXISTING BeraterInnen to the Leistungskatalog hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkLeistungskatalogBeraterInnenLeistungen(sourceId: string) {
    const hub = pickLeistungskatalogBeraterInnenLeistungen;
    const src = data.beraterInnen.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.leistungen);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.LEISTUNGSKATALOG, id));
    data.setBeraterInnen(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, leistungen: next } } : r)));
    try {
      await LivingAppsService.updateBeraterInnenEntry(sourceId, { leistungen: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('berater/innen')} — ${t('pick_linked')}`, async () => {
      data.setBeraterInnen(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateBeraterInnenEntry(sourceId, { leistungen: src.fields.leistungen }); } catch { data.fetchAll(); }
    });
  }

  function detailKunden(record: Kunden, push = false) {
    const rec = enrichedKunden.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'kunden', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKunden(fields: Kunden['fields']) {
    const editing = kundenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKunden(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKundenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kunden')} — ${t('crud_updated')}`, async () => {
        data.setKunden(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKundenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKundenEntry(fields);
      undoToast(`${appLabel('kunden')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailBeraterInnen(record: BeraterInnen, push = false) {
    const rec = enrichedBeraterInnen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'beraterInnen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBeraterInnen(fields: BeraterInnen['fields']) {
    const editing = beraterInnenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBeraterInnen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBeraterInnenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('berater/innen')} — ${t('crud_updated')}`, async () => {
        data.setBeraterInnen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBeraterInnenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBeraterInnenEntry(fields);
      undoToast(`${appLabel('berater/innen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  // Link an EXISTING Rechnungen to the BeraterInnen hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkBeraterInnenRechnungen(sourceId: string) {
    const hub = pickBeraterInnenRechnungen;
    const src = data.rechnungen.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.berater);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.BERATERINNEN, id));
    data.setRechnungen(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, berater: next } } : r)));
    try {
      await LivingAppsService.updateRechnungenEntry(sourceId, { berater: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('rechnungen')} — ${t('pick_linked')}`, async () => {
      data.setRechnungen(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateRechnungenEntry(sourceId, { berater: src.fields.berater }); } catch { data.fetchAll(); }
    });
  }

  // Link an EXISTING Leistungskatalog to the BeraterInnen hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkBeraterInnenLeistungskatalogBerater(sourceId: string) {
    const hub = pickBeraterInnenLeistungskatalogBerater;
    const src = data.leistungskatalog.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.berater);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.BERATERINNEN, id));
    data.setLeistungskatalog(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, berater: next } } : r)));
    try {
      await LivingAppsService.updateLeistungskatalogEntry(sourceId, { berater: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('leistungskatalog')} — ${t('pick_linked')}`, async () => {
      data.setLeistungskatalog(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateLeistungskatalogEntry(sourceId, { berater: src.fields.berater }); } catch { data.fetchAll(); }
    });
  }

  function detailAngebote(record: Angebote, push = false) {
    const rec = enrichedAngebote.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'angebote', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAngebote(fields: Angebote['fields']) {
    const editing = angeboteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAngebote(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAngeboteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('angebote')} — ${t('crud_updated')}`, async () => {
        data.setAngebote(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAngeboteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAngeboteEntry(fields);
      undoToast(`${appLabel('angebote')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <ZeiterfassungDialog
        open={zeiterfassungDialog !== null}
        onClose={() => setZeiterfassungDialog(null)}
        onSubmit={submitZeiterfassung}
        defaultValues={zeiterfassungDialog?.defaults}
        recordId={zeiterfassungDialog?.editing?.record_id}
        beraterInnenList={data.beraterInnen}
        projekteList={data.projekte}
        leistungskatalogList={data.leistungskatalog}
        enablePhotoScan={AI_PHOTO_SCAN['Zeiterfassung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Zeiterfassung']}
      />
      <RechnungenDialog
        open={rechnungenDialog !== null}
        onClose={() => setRechnungenDialog(null)}
        onSubmit={submitRechnungen}
        defaultValues={rechnungenDialog?.defaults}
        recordId={rechnungenDialog?.editing?.record_id}
        kundenList={data.kunden}
        projekteList={data.projekte}
        beraterInnenList={data.beraterInnen}
        enablePhotoScan={AI_PHOTO_SCAN['Rechnungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Rechnungen']}
      />
      <ProjekteDialog
        open={projekteDialog !== null}
        onClose={() => setProjekteDialog(null)}
        onSubmit={submitProjekte}
        defaultValues={projekteDialog?.defaults}
        recordId={projekteDialog?.editing?.record_id}
        kundenList={data.kunden}
        beraterInnenList={data.beraterInnen}
        enablePhotoScan={AI_PHOTO_SCAN['Projekte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Projekte']}
      />
      <LeistungskatalogDialog
        open={leistungskatalogDialog !== null}
        onClose={() => setLeistungskatalogDialog(null)}
        onSubmit={submitLeistungskatalog}
        defaultValues={leistungskatalogDialog?.defaults}
        recordId={leistungskatalogDialog?.editing?.record_id}
        beraterInnenList={data.beraterInnen}
        enablePhotoScan={AI_PHOTO_SCAN['Leistungskatalog']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Leistungskatalog']}
      />
      <KundenDialog
        open={kundenDialog !== null}
        onClose={() => setKundenDialog(null)}
        onSubmit={submitKunden}
        defaultValues={kundenDialog?.defaults}
        recordId={kundenDialog?.editing?.record_id}
        projekteList={data.projekte}
        enablePhotoScan={AI_PHOTO_SCAN['Kunden']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kunden']}
      />
      <BeraterInnenDialog
        open={beraterInnenDialog !== null}
        onClose={() => setBeraterInnenDialog(null)}
        onSubmit={submitBeraterInnen}
        defaultValues={beraterInnenDialog?.defaults}
        recordId={beraterInnenDialog?.editing?.record_id}
        leistungskatalogList={data.leistungskatalog}
        projekteList={data.projekte}
        enablePhotoScan={AI_PHOTO_SCAN['BeraterInnen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['BeraterInnen']}
      />
      <AngeboteDialog
        open={angeboteDialog !== null}
        onClose={() => setAngeboteDialog(null)}
        onSubmit={submitAngebote}
        defaultValues={angeboteDialog?.defaults}
        recordId={angeboteDialog?.editing?.record_id}
        kundenList={data.kunden}
        projekteList={data.projekte}
        enablePhotoScan={AI_PHOTO_SCAN['Angebote']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Angebote']}
      />
      <PickExistingDialog
        open={pickProjekteKundenLaufendeProjekte !== null}
        onClose={() => setPickProjekteKundenLaufendeProjekte(null)}
        title={t('pick_title', { title: appLabel('kunden') })}
        items={data.kunden
          .filter(r => !extractRecordIds(r.fields.laufende_projekte).includes(pickProjekteKundenLaufendeProjekte ?? ''))
          .map(r => ({ id: r.record_id, label: String(r.fields.kundenname ?? appLabel('kunden')), hint: r.fields.anlagedatum ? String(r.fields.anlagedatum) : undefined }))}
        onPick={linkProjekteKundenLaufendeProjekte}
      />
      <PickExistingDialog
        open={pickProjekteBeraterInnenProjekte !== null}
        onClose={() => setPickProjekteBeraterInnenProjekte(null)}
        title={t('pick_title', { title: appLabel('berater/innen') })}
        items={data.beraterInnen
          .filter(r => !extractRecordIds(r.fields.projekte).includes(pickProjekteBeraterInnenProjekte ?? ''))
          .map(r => ({ id: r.record_id, label: String(r.fields.nachname ?? appLabel('berater/innen')), hint: r.fields.einstiegsdatum ? String(r.fields.einstiegsdatum) : undefined }))}
        onPick={linkProjekteBeraterInnenProjekte}
      />
      <PickExistingDialog
        open={pickLeistungskatalogBeraterInnenLeistungen !== null}
        onClose={() => setPickLeistungskatalogBeraterInnenLeistungen(null)}
        title={t('pick_title', { title: appLabel('berater/innen') })}
        items={data.beraterInnen
          .filter(r => !extractRecordIds(r.fields.leistungen).includes(pickLeistungskatalogBeraterInnenLeistungen ?? ''))
          .map(r => ({ id: r.record_id, label: String(r.fields.nachname ?? appLabel('berater/innen')), hint: r.fields.einstiegsdatum ? String(r.fields.einstiegsdatum) : undefined }))}
        onPick={linkLeistungskatalogBeraterInnenLeistungen}
      />
      <PickExistingDialog
        open={pickBeraterInnenRechnungen !== null}
        onClose={() => setPickBeraterInnenRechnungen(null)}
        title={t('pick_title', { title: appLabel('rechnungen') })}
        items={data.rechnungen
          .filter(r => !extractRecordIds(r.fields.berater).includes(pickBeraterInnenRechnungen ?? ''))
          .map(r => ({ id: r.record_id, label: String(r.fields.rechnungsnummer ?? appLabel('rechnungen')), hint: r.fields.rechnungsdatum ? String(r.fields.rechnungsdatum) : undefined }))}
        onPick={linkBeraterInnenRechnungen}
      />
      <PickExistingDialog
        open={pickBeraterInnenLeistungskatalogBerater !== null}
        onClose={() => setPickBeraterInnenLeistungskatalogBerater(null)}
        title={t('pick_title', { title: appLabel('leistungskatalog') })}
        items={data.leistungskatalog
          .filter(r => !extractRecordIds(r.fields.berater).includes(pickBeraterInnenLeistungskatalogBerater ?? ''))
          .map(r => ({ id: r.record_id, label: String(r.fields.leistungsbezeichnung ?? appLabel('leistungskatalog')) }))}
        onPick={linkBeraterInnenLeistungskatalogBerater}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'zeiterfassung') {
            return (
              <>
                <RecordHeader title={top.record.fields.jahr ?? appLabel('zeiterfassung')} subtitle={top.record.fields.datum ? formatDate(top.record.fields.datum) : undefined} />
                <ZeiterfassungDetails
                  record={top.record}
                  beraterInnenList={data.beraterInnen}
                  onOpenBeraterInnen={(r) => detailBeraterInnen(r, true)}
                  projekteList={data.projekte}
                  onOpenProjekte={(r) => detailProjekte(r, true)}
                  leistungskatalogList={data.leistungskatalog}
                  onOpenLeistungskatalog={(r) => detailLeistungskatalog(r, true)}
                />
              </>
            );
          }
          if (top.type === 'rechnungen') {
            return (
              <>
                <RecordHeader title={top.record.fields.rechnungsnummer ?? appLabel('rechnungen')} subtitle={top.record.fields.rechnungsdatum ? formatDate(top.record.fields.rechnungsdatum) : undefined} />
                <RechnungenDetails
                  record={top.record}
                  kundenList={data.kunden}
                  onOpenKunden={(r) => detailKunden(r, true)}
                  projekteList={data.projekte}
                  onOpenProjekte={(r) => detailProjekte(r, true)}
                  beraterInnenList={data.beraterInnen}
                />
              </>
            );
          }
          if (top.type === 'projekte') {
            return (
              <>
                <RecordHeader title={top.record.fields.projektkennung ?? appLabel('projekte')} subtitle={top.record.fields.projektende ? formatDate(top.record.fields.projektende) : undefined} />
                <ProjekteDetails
                  record={top.record}
                  kundenList={data.kunden}
                  onOpenKunden={(r) => detailKunden(r, true)}
                  beraterInnenList={data.beraterInnen}
                  onOpenBeraterInnen={(r) => detailBeraterInnen(r, true)}
                  zeiterfassungList={data.zeiterfassung}
                  onOpenZeiterfassung={(r) => detailZeiterfassung(r, true)}
                  onAddZeiterfassung={() => setZeiterfassungDialog({ defaults: { projekt: createRecordUrl(APP_IDS.PROJEKTE, top.record.record_id) } })}
                  rechnungenList={data.rechnungen}
                  onOpenRechnungen={(r) => detailRechnungen(r, true)}
                  onAddRechnungen={() => setRechnungenDialog({ defaults: { projekt: createRecordUrl(APP_IDS.PROJEKTE, top.record.record_id) } })}
                  kundenLaufendeProjekteList={data.kunden}
                  onOpenKundenLaufendeProjekte={(r) => detailKunden(r, true)}
                  onAddKundenLaufendeProjekte={() => setKundenDialog({ defaults: { laufende_projekte: [createRecordUrl(APP_IDS.PROJEKTE, top.record.record_id)] } })}
                  onPickKundenLaufendeProjekte={() => setPickProjekteKundenLaufendeProjekte(top.record.record_id)}
                  beraterInnenProjekteList={data.beraterInnen}
                  onOpenBeraterInnenProjekte={(r) => detailBeraterInnen(r, true)}
                  onAddBeraterInnenProjekte={() => setBeraterInnenDialog({ defaults: { projekte: [createRecordUrl(APP_IDS.PROJEKTE, top.record.record_id)] } })}
                  onPickBeraterInnenProjekte={() => setPickProjekteBeraterInnenProjekte(top.record.record_id)}
                  angeboteList={data.angebote}
                  onOpenAngebote={(r) => detailAngebote(r, true)}
                  onAddAngebote={() => setAngeboteDialog({ defaults: { projekt: createRecordUrl(APP_IDS.PROJEKTE, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'leistungskatalog') {
            return (
              <>
                <RecordHeader title={top.record.fields.leistungsbezeichnung ?? appLabel('leistungskatalog')} subtitle={undefined} />
                <LeistungskatalogDetails
                  record={top.record}
                  beraterInnenList={data.beraterInnen}
                  zeiterfassungList={data.zeiterfassung}
                  onOpenZeiterfassung={(r) => detailZeiterfassung(r, true)}
                  onAddZeiterfassung={() => setZeiterfassungDialog({ defaults: { leistung: createRecordUrl(APP_IDS.LEISTUNGSKATALOG, top.record.record_id) } })}
                  beraterInnenLeistungenList={data.beraterInnen}
                  onOpenBeraterInnenLeistungen={(r) => detailBeraterInnen(r, true)}
                  onAddBeraterInnenLeistungen={() => setBeraterInnenDialog({ defaults: { leistungen: [createRecordUrl(APP_IDS.LEISTUNGSKATALOG, top.record.record_id)] } })}
                  onPickBeraterInnenLeistungen={() => setPickLeistungskatalogBeraterInnenLeistungen(top.record.record_id)}
                />
              </>
            );
          }
          if (top.type === 'kunden') {
            return (
              <>
                <RecordHeader title={top.record.fields.kundenname ?? appLabel('kunden')} subtitle={top.record.fields.anlagedatum ? formatDate(top.record.fields.anlagedatum) : undefined} />
                <KundenDetails
                  record={top.record}
                  projekteList={data.projekte}
                  rechnungenList={data.rechnungen}
                  onOpenRechnungen={(r) => detailRechnungen(r, true)}
                  onAddRechnungen={() => setRechnungenDialog({ defaults: { kunde: createRecordUrl(APP_IDS.KUNDEN, top.record.record_id) } })}
                  projekteKundeList={data.projekte}
                  onOpenProjekteKunde={(r) => detailProjekte(r, true)}
                  onAddProjekteKunde={() => setProjekteDialog({ defaults: { kunde: createRecordUrl(APP_IDS.KUNDEN, top.record.record_id) } })}
                  angeboteList={data.angebote}
                  onOpenAngebote={(r) => detailAngebote(r, true)}
                  onAddAngebote={() => setAngeboteDialog({ defaults: { kunde: createRecordUrl(APP_IDS.KUNDEN, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'beraterInnen') {
            return (
              <>
                <RecordHeader title={top.record.fields.nachname ?? appLabel('berater/innen')} subtitle={top.record.fields.einstiegsdatum ? formatDate(top.record.fields.einstiegsdatum) : undefined} />
                <BeraterInnenDetails
                  record={top.record}
                  leistungskatalogList={data.leistungskatalog}
                  projekteList={data.projekte}
                  zeiterfassungList={data.zeiterfassung}
                  onOpenZeiterfassung={(r) => detailZeiterfassung(r, true)}
                  onAddZeiterfassung={() => setZeiterfassungDialog({ defaults: { berater: createRecordUrl(APP_IDS.BERATERINNEN, top.record.record_id) } })}
                  rechnungenList={data.rechnungen}
                  onOpenRechnungen={(r) => detailRechnungen(r, true)}
                  onAddRechnungen={() => setRechnungenDialog({ defaults: { berater: [createRecordUrl(APP_IDS.BERATERINNEN, top.record.record_id)] } })}
                  onPickRechnungen={() => setPickBeraterInnenRechnungen(top.record.record_id)}
                  projekteProjektleitungList={data.projekte}
                  onOpenProjekteProjektleitung={(r) => detailProjekte(r, true)}
                  onAddProjekteProjektleitung={() => setProjekteDialog({ defaults: { projektleitung: createRecordUrl(APP_IDS.BERATERINNEN, top.record.record_id) } })}
                  leistungskatalogBeraterList={data.leistungskatalog}
                  onOpenLeistungskatalogBerater={(r) => detailLeistungskatalog(r, true)}
                  onAddLeistungskatalogBerater={() => setLeistungskatalogDialog({ defaults: { berater: [createRecordUrl(APP_IDS.BERATERINNEN, top.record.record_id)] } })}
                  onPickLeistungskatalogBerater={() => setPickBeraterInnenLeistungskatalogBerater(top.record.record_id)}
                />
              </>
            );
          }
          if (top.type === 'angebote') {
            return (
              <>
                <RecordHeader title={top.record.fields.angebotsnummer ?? appLabel('angebote')} subtitle={top.record.fields.angebotsdatum ? formatDate(top.record.fields.angebotsdatum) : undefined} />
                <AngeboteDetails
                  record={top.record}
                  kundenList={data.kunden}
                  onOpenKunden={(r) => detailKunden(r, true)}
                  projekteList={data.projekte}
                  onOpenProjekte={(r) => detailProjekte(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'zeiterfassung') setZeiterfassungDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'rechnungen') setRechnungenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'projekte') setProjekteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'leistungskatalog') setLeistungskatalogDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kunden') setKundenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'beraterInnen') setBeraterInnenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'angebote') setAngeboteDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    zeiterfassung: {
      openCreate: (defaults?: ZeiterfassungDialogDefaults) => setZeiterfassungDialog({ defaults }),
      openEdit: (record: Zeiterfassung) => setZeiterfassungDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Zeiterfassung) => detailZeiterfassung(record, false),
    },
    rechnungen: {
      openCreate: (defaults?: RechnungenDialogDefaults) => setRechnungenDialog({ defaults }),
      openEdit: (record: Rechnungen) => setRechnungenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Rechnungen) => detailRechnungen(record, false),
    },
    projekte: {
      openCreate: (defaults?: ProjekteDialogDefaults) => setProjekteDialog({ defaults }),
      openEdit: (record: Projekte) => setProjekteDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Projekte) => detailProjekte(record, false),
    },
    leistungskatalog: {
      openCreate: (defaults?: LeistungskatalogDialogDefaults) => setLeistungskatalogDialog({ defaults }),
      openEdit: (record: Leistungskatalog) => setLeistungskatalogDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Leistungskatalog) => detailLeistungskatalog(record, false),
    },
    kunden: {
      openCreate: (defaults?: KundenDialogDefaults) => setKundenDialog({ defaults }),
      openEdit: (record: Kunden) => setKundenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Kunden) => detailKunden(record, false),
    },
    beraterInnen: {
      openCreate: (defaults?: BeraterInnenDialogDefaults) => setBeraterInnenDialog({ defaults }),
      openEdit: (record: BeraterInnen) => setBeraterInnenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: BeraterInnen) => detailBeraterInnen(record, false),
    },
    angebote: {
      openCreate: (defaults?: AngeboteDialogDefaults) => setAngeboteDialog({ defaults }),
      openEdit: (record: Angebote) => setAngeboteDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Angebote) => detailAngebote(record, false),
    },
    enriched: { zeiterfassung: enrichedZeiterfassung, rechnungen: enrichedRechnungen, projekte: enrichedProjekte, leistungskatalog: enrichedLeistungskatalog, kunden: enrichedKunden, beraterInnen: enrichedBeraterInnen, angebote: enrichedAngebote },
  };
}
