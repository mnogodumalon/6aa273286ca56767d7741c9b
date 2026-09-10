import { useState, useEffect, useMemo, useCallback } from 'react';
import type { BeraterInnen, Kunden, Leistungskatalog, Projekte, Angebote, Zeiterfassung, Rechnungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { t } from '@/i18n';

/** Dashboard data + the OPTIMISTIC-WRITE API.
 *
 *  The per-entity setters (`set<Entity>`) are exported for exactly one job:
 *  optimistic updates on drag writes (onEventDrop / onEventResize /
 *  onCardMove). Call the setter FIRST — the bar/card lands instantly — then
 *  fire the PATCH in the background and call `fetchAll()` ONLY in the catch.
 *  Never await the PATCH before updating state (the UI freezes for the full
 *  round-trip on every drag) and never refetch after a successful write.
 *  There is no other mechanism (no `__optimistic`, no `mutate`).
 */
export function useDashboardData() {
  const [beraterInnen, setBeraterInnen] = useState<BeraterInnen[]>([]);
  const [kunden, setKunden] = useState<Kunden[]>([]);
  const [leistungskatalog, setLeistungskatalog] = useState<Leistungskatalog[]>([]);
  const [projekte, setProjekte] = useState<Projekte[]>([]);
  const [angebote, setAngebote] = useState<Angebote[]>([]);
  const [zeiterfassung, setZeiterfassung] = useState<Zeiterfassung[]>([]);
  const [rechnungen, setRechnungen] = useState<Rechnungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [beraterInnenData, kundenData, leistungskatalogData, projekteData, angeboteData, zeiterfassungData, rechnungenData] = await Promise.all([
        LivingAppsService.getBeraterInnen(),
        LivingAppsService.getKunden(),
        LivingAppsService.getLeistungskatalog(),
        LivingAppsService.getProjekte(),
        LivingAppsService.getAngebote(),
        LivingAppsService.getZeiterfassung(),
        LivingAppsService.getRechnungen(),
      ]);
      setBeraterInnen(beraterInnenData);
      setKunden(kundenData);
      setLeistungskatalog(leistungskatalogData);
      setProjekte(projekteData);
      setAngebote(angeboteData);
      setZeiterfassung(zeiterfassungData);
      setRechnungen(rechnungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(t('data_load_failed')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [beraterInnenData, kundenData, leistungskatalogData, projekteData, angeboteData, zeiterfassungData, rechnungenData] = await Promise.all([
          LivingAppsService.getBeraterInnen(),
          LivingAppsService.getKunden(),
          LivingAppsService.getLeistungskatalog(),
          LivingAppsService.getProjekte(),
          LivingAppsService.getAngebote(),
          LivingAppsService.getZeiterfassung(),
          LivingAppsService.getRechnungen(),
        ]);
        setBeraterInnen(beraterInnenData);
        setKunden(kundenData);
        setLeistungskatalog(leistungskatalogData);
        setProjekte(projekteData);
        setAngebote(angeboteData);
        setZeiterfassung(zeiterfassungData);
        setRechnungen(rechnungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    // assistant:data-changed comes from the assistant (<la-klar-assistant>)
    // after every mutation. The element additionally fires the legacy
    // dashboard-refresh event for OLD deployed bundles — do NOT subscribe to
    // both here, or every mutation fetches twice.
    window.addEventListener('assistant:data-changed', handleRefresh);
    return () => window.removeEventListener('assistant:data-changed', handleRefresh);
  }, []);

  const beraterInnenMap = useMemo(() => {
    const m = new Map<string, BeraterInnen>();
    beraterInnen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [beraterInnen]);

  const kundenMap = useMemo(() => {
    const m = new Map<string, Kunden>();
    kunden.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kunden]);

  const leistungskatalogMap = useMemo(() => {
    const m = new Map<string, Leistungskatalog>();
    leistungskatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [leistungskatalog]);

  const projekteMap = useMemo(() => {
    const m = new Map<string, Projekte>();
    projekte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [projekte]);

  return { beraterInnen, setBeraterInnen, kunden, setKunden, leistungskatalog, setLeistungskatalog, projekte, setProjekte, angebote, setAngebote, zeiterfassung, setZeiterfassung, rechnungen, setRechnungen, loading, error, fetchAll, beraterInnenMap, kundenMap, leistungskatalogMap, projekteMap };
}

/** The hook's return — the `data` prop of DashboardOverview in the Ready-Wrapper form. */
export type DashboardData = ReturnType<typeof useDashboardData>;