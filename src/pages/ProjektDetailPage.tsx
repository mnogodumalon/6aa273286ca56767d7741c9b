import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx } from '@/i18n';
import { useClock, undoToast } from '@/lib/polish';
import { format } from 'date-fns';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { lookupOption, LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, LivingAppsService } from '@/services/livingAppsService';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import {
  IconArrowLeft,
  IconPencil,
  IconPlus,
  IconClock,
  IconFileInvoice,
  IconBriefcase,
  IconUser,
  IconCheck,
  IconReceipt,
} from '@tabler/icons-react';

const STATUS_STEP_KEYS = ['akquise', 'in_bearbeitung', 'abgeschlossen'] as const;

function statusStyle(status: string | undefined) {
  if (status === 'in_bearbeitung') return 'bg-blue-100 text-blue-700';
  if (status === 'akquise') return 'bg-amber-100 text-amber-700';
  if (status === 'abgeschlossen') return 'bg-emerald-100 text-emerald-700';
  return 'bg-zinc-100 text-zinc-600';
}

export default function ProjektDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const data = useDashboardData();
  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const rec = rechnungen.find(r => r.record_id === top.record.record_id);
        const st = lookupKey(rec?.fields.rechnungsstatus);
        if (st === 'offen' || st === 'ueberfaellig') {
          return { label: tx('Als bezahlt markieren'), onClick: () => markRechnungBezahlt(top.record.record_id) };
        }
      }
      return undefined;
    },
  });
  const clock = useClock();
  const { projekte, zeiterfassung, rechnungen, angebote, beraterInnen, setRechnungen, setProjekte, fetchAll, loading, error } = data;
  const today = format(clock, 'yyyy-MM-dd');

  const enrichedProjekte = crud.enriched.projekte;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;
  const enrichedRechnungen = crud.enriched.rechnungen;

  const projekt = useMemo(() => projekte.find(p => p.record_id === id), [projekte, id]);
  const enrichedProjekt = useMemo(() => enrichedProjekte.find(p => p.record_id === id), [enrichedProjekte, id]);

  const projektZeit = useMemo(() =>
    [...zeiterfassung.filter(z => extractRecordId(z.fields.projekt) === id)]
      .sort((a, b) => (b.fields.datum ?? '') > (a.fields.datum ?? '') ? 1 : -1),
    [zeiterfassung, id]
  );
  const projektRechnungen = useMemo(() =>
    rechnungen.filter(r => extractRecordId(r.fields.projekt) === id),
    [rechnungen, id]
  );
  const projektAngebote = useMemo(() =>
    angebote.filter(a => extractRecordId(a.fields.projekt) === id),
    [angebote, id]
  );

  const totalStunden = useMemo(() =>
    projektZeit.reduce((s, z) => s + (z.fields.stunden ?? 0), 0),
    [projektZeit]
  );
  const offeneRechnungenCount = useMemo(() =>
    projektRechnungen.filter(r => {
      const st = lookupKey(r.fields.rechnungsstatus);
      return st === 'offen' || st === 'ueberfaellig';
    }).length,
    [projektRechnungen]
  );
  const gesamtFakturiert = useMemo(() =>
    projektRechnungen
      .filter(r => lookupKey(r.fields.rechnungsstatus) !== 'storniert')
      .reduce((s, r) => s + (r.fields.gesamtbetrag ?? 0), 0),
    [projektRechnungen]
  );

  // Team: unique Berater from time entries, using enriched names
  const teamBerater = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ id: string; name: string }> = [];
    projektZeit.forEach(z => {
      const bid = extractRecordId(z.fields.berater);
      const ez = enrichedZeiterfassung.find(e => e.record_id === z.record_id);
      const name = ez?.beraterName || '';
      if (bid && !seen.has(bid) && name) {
        seen.add(bid);
        result.push({ id: bid, name });
      }
    });
    // Also add projektleitung if they didn't log time
    const leitungId = extractRecordId(projekt?.fields.projektleitung);
    if (leitungId && !seen.has(leitungId) && enrichedProjekt?.projektleitungName) {
      result.unshift({ id: leitungId, name: enrichedProjekt.projektleitungName });
    }
    return result;
  }, [projektZeit, enrichedZeiterfassung, projekt, enrichedProjekt]);

  // Verlauf: combined timeline of all project activities, newest first
  const verlauf = useMemo(() => {
    type Entry = { date: string; type: 'zeit' | 'rechnung' | 'angebot'; label: string; id: string };
    const entries: Entry[] = [];
    projektZeit.forEach(z => {
      const ez = enrichedZeiterfassung.find(e => e.record_id === z.record_id);
      const desc = z.fields.taetigkeitsbeschreibung?.slice(0, 45) || '';
      entries.push({
        date: z.fields.datum ?? '',
        type: 'zeit',
        label: `${ez?.beraterName || tx('Berater')} · ${z.fields.stunden ?? 0} h${desc ? ' · ' + desc : ''}`,
        id: z.record_id,
      });
    });
    projektRechnungen.forEach(r => {
      entries.push({
        date: r.fields.rechnungsdatum ?? r.fields.faelligkeitsdatum ?? '',
        type: 'rechnung',
        label: `${r.fields.rechnungsnummer || tx('Rechnung')} · ${r.fields.rechnungsstatus?.label ?? ''} · ${formatCurrency(r.fields.gesamtbetrag)}`,
        id: r.record_id,
      });
    });
    projektAngebote.forEach(a => {
      entries.push({
        date: a.fields.angebotsdatum ?? '',
        type: 'angebot',
        label: `${a.fields.angebotsnummer || tx('Angebot')} · ${a.fields.angebotsstatus?.label ?? ''} · ${formatCurrency(a.fields.kostenbetrag)}`,
        id: a.record_id,
      });
    });
    return entries.filter(e => e.date).sort((a, b) => b.date > a.date ? 1 : -1);
  }, [projektZeit, projektRechnungen, projektAngebote, enrichedZeiterfassung]);

  // Status steps (labels derived inside component for locale-awareness)
  const statusSteps = useMemo(() => {
    const opts = LOOKUP_OPTIONS['projekte']?.['status'] ?? [];
    return STATUS_STEP_KEYS.map(key => ({
      key,
      label: opts.find(o => o.key === key)?.label ?? key,
    }));
  }, []);

  const markRechnungBezahlt = async (rid: string) => {
    const prev = rechnungen.map(r => ({ ...r }));
    setRechnungen(old => old.map(r =>
      r.record_id === rid
        ? { ...r, fields: { ...r.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt'), zahlungseingang: today } }
        : r
    ));
    undoToast(tx('Rechnung als bezahlt markiert'), async () => {
      setRechnungen(prev);
      await LivingAppsService.updateRechnungenEntry(rid, { rechnungsstatus: 'offen', zahlungseingang: undefined });
    });
    try {
      await LivingAppsService.updateRechnungenEntry(rid, { rechnungsstatus: 'bezahlt', zahlungseingang: today });
    } catch {
      fetchAll();
    }
  };

  const advanceStatus = async (newStatus: string) => {
    if (!id || !projekt) return;
    const prev = projekte.map(p => ({ ...p }));
    setProjekte(old => old.map(p =>
      p.record_id === id
        ? { ...p, fields: { ...p.fields, status: lookupOption('projekte', 'status', newStatus) } }
        : p
    ));
    undoToast(tx('Projektstatus geändert'), async () => {
      setProjekte(prev);
      await LivingAppsService.updateProjekteEntry(id, { status: lookupKey(projekt.fields.status) });
    });
    try {
      await LivingAppsService.updateProjekteEntry(id, { status: newStatus });
    } catch {
      fetchAll();
    }
  };

  // Early returns after all hooks
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  if (!id || !projekt) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">{tx('Projekt nicht gefunden.')}</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <IconArrowLeft size={16} className="shrink-0" />
          {tx('Zurück zum Dashboard')}
        </button>
      </div>
    );
  }

  const status = lookupKey(projekt.fields.status);
  const currentStepIdx = STATUS_STEP_KEYS.indexOf(status as typeof STATUS_STEP_KEYS[number]);
  const budgetPct = projekt.fields.budget && projekt.fields.budget > 0
    ? Math.min(100, Math.round((gesamtFakturiert / projekt.fields.budget) * 100))
    : null;

  return (
    <div className="space-y-6 pb-10">
      {/* Back breadcrumb */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <IconArrowLeft size={16} className="shrink-0" />
        {tx('Dashboard')}
      </button>

      {/* Page header — title + three action buttons */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-foreground">{projekt.fields.projektkennung}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${statusStyle(status)}`}>
              {projekt.fields.status?.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3">
            {enrichedProjekt?.kundeName && (
              <span className="flex items-center gap-1">
                <IconUser size={13} className="shrink-0" />
                {enrichedProjekt.kundeName}
              </span>
            )}
            {enrichedProjekt?.projektleitungName && (
              <span>{tx('Leitung')}: {enrichedProjekt.projektleitungName}</span>
            )}
            {projekt.fields.ansprechpartner_kunde && (
              <span>{tx('Ansp.')}: {projekt.fields.ansprechpartner_kunde}</span>
            )}
          </p>
        </div>
        {/* Three action buttons */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => crud.zeiterfassung.openCreate({ datum: today, projekt: id })}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <IconClock size={16} className="shrink-0" />
            {tx('Zeit erfassen')}
          </button>
          <button
            onClick={() => crud.rechnungen.openCreate({ rechnungsdatum: today, projekt: id })}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <IconReceipt size={16} className="shrink-0" />
            {tx('Rechnung')}
          </button>
          <button
            onClick={() => crud.projekte.openEdit(projekt)}
            className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-primary hover:bg-primary/20 transition-colors"
          >
            <IconPencil size={16} className="shrink-0" />
            {tx('Bearbeiten')}
          </button>
        </div>
      </div>

      {/* Statusleiste — visual step progress, clickable */}
      <div className="rounded-[27px] border border-border bg-card px-5 py-4">
        <div className="flex items-center">
          {statusSteps.map((step, idx) => {
            const isActive = step.key === status;
            const isDone = currentStepIdx > idx;
            const isLast = idx === statusSteps.length - 1;
            return (
              <div key={step.key} className="flex items-center flex-1 min-w-0">
                <button
                  onClick={() => !isActive && advanceStatus(step.key)}
                  disabled={isActive}
                  className="flex flex-col items-center gap-1.5 flex-1 min-w-0 group"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors text-sm font-semibold shrink-0
                    ${isActive
                      ? 'bg-primary text-white ring-2 ring-primary/30'
                      : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/20 group-disabled:cursor-default'
                    }`}>
                    {isDone ? <IconCheck size={15} /> : <span>{idx + 1}</span>}
                  </div>
                  <span className={`text-xs font-medium text-center leading-tight
                    ${isActive ? 'text-primary' : isDone ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </button>
                {!isLast && (
                  <div className={`h-0.5 flex-1 mx-2 rounded transition-colors mb-5 ${isDone ? 'bg-emerald-400' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Budget card */}
      {projekt.fields.budget != null && (
        <div className="rounded-[27px] bg-card p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tx('Budget')}</h2>
            {budgetPct !== null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                budgetPct >= 100 ? 'bg-destructive/10 text-destructive' :
                budgetPct >= 80 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {budgetPct}%
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{tx('Geplant')}</p>
              <p className="text-lg font-semibold">{formatCurrency(projekt.fields.budget)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{tx('Fakturiert')}</p>
              <p className={`text-lg font-semibold ${gesamtFakturiert > (projekt.fields.budget ?? 0) ? 'text-destructive' : ''}`}>
                {formatCurrency(gesamtFakturiert)}
              </p>
            </div>
          </div>
          {budgetPct !== null && (
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetPct >= 100 ? 'bg-destructive' : budgetPct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budgetPct)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* KPI strip */}
      <StatStrip>
        <StatStripItem
          title={tx('Stunden gesamt')}
          value={`${totalStunden} h`}
          icon={<IconClock size={16} className="shrink-0" />}
          tone={totalStunden > 0 ? 'primary' : 'default'}
        />
        <StatStripItem
          title={tx('Fakturiert')}
          value={formatCurrency(gesamtFakturiert)}
          icon={<IconFileInvoice size={16} className="shrink-0" />}
          tone="default"
        />
        <StatStripItem
          title={tx('Offene Rechnungen')}
          value={offeneRechnungenCount}
          icon={<IconFileInvoice size={16} className="shrink-0" />}
          tone={offeneRechnungenCount > 0 ? 'warning' : 'default'}
        />
        <StatStripItem
          title={tx('Angebote')}
          value={projektAngebote.length}
          icon={<IconBriefcase size={16} className="shrink-0" />}
          tone="default"
        />
      </StatStrip>

      {/* Team section */}
      {teamBerater.length > 0 && (
        <div className="rounded-[27px] bg-card p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tx('Team')}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamBerater.map((b, idx) => {
              const isPL = idx === 0 && !!enrichedProjekt?.projektleitungName &&
                b.name === enrichedProjekt.projektleitungName;
              return (
                <div
                  key={b.id}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 border ${
                    isPL
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-muted/40 border-border'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    isPL ? 'bg-primary text-white' : 'bg-muted-foreground/20 text-muted-foreground'
                  }`}>
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-sm font-medium ${isPL ? 'text-primary' : ''}`}>{b.name}</span>
                  {isPL && (
                    <span className="text-xs text-primary/60">{tx('Leitung')}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aktueller Stand / Notizen */}
      {(projekt.fields.letzter_schritt || projekt.fields.notizen) && (
        <div className="rounded-[27px] bg-card p-5 shadow-lg space-y-3">
          {projekt.fields.letzter_schritt && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{tx('Aktueller Stand')}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{projekt.fields.letzter_schritt}</p>
            </div>
          )}
          {projekt.fields.notizen && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{tx('Notizen')}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{projekt.fields.notizen}</p>
            </div>
          )}
        </div>
      )}

      {/* Sections: Zeiten | Dokumente (Angebote + Rechnungen) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Zeiten */}
        <section className="rounded-[27px] bg-card p-5 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tx('Zeiten')}</h2>
            <button
              onClick={() => crud.zeiterfassung.openCreate({ datum: today, projekt: id })}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <IconPlus size={12} className="shrink-0" />
              {tx('Hinzufügen')}
            </button>
          </div>
          {projektZeit.length === 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-muted-foreground">{tx('Noch keine Zeiteinträge für dieses Projekt.')}</p>
              <button
                onClick={() => crud.zeiterfassung.openCreate({ datum: today, projekt: id })}
                className="inline-flex items-center gap-1.5 min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                {tx('Zeit erfassen')}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border -mx-2">
              {projektZeit.slice(0, 8).map(z => {
                const ez = enrichedZeiterfassung.find(e => e.record_id === z.record_id);
                return (
                  <li key={z.record_id}>
                    <button
                      type="button"
                      onClick={() => crud.zeiterfassung.openDetail(z)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-3 text-left hover:bg-muted/40 transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{ez?.beraterName || tx('Berater')}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {z.fields.datum && formatDate(z.fields.datum)}
                          {z.fields.stunden != null && ` · ${z.fields.stunden} h`}
                          {z.fields.taetigkeitsbeschreibung && ` · ${z.fields.taetigkeitsbeschreibung.slice(0, 35)}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {projektZeit.length > 8 && (
                <li className="px-2 py-2 text-xs text-muted-foreground">
                  +{projektZeit.length - 8} {tx('weitere')}
                </li>
              )}
            </ul>
          )}
        </section>

        {/* Dokumente: Angebote + Rechnungen combined */}
        <section className="rounded-[27px] bg-card p-5 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tx('Dokumente')}</h2>
            <div className="flex gap-3">
              <button
                onClick={() => crud.angebote.openCreate({ angebotsdatum: today, angebotsjahr: format(clock, 'yyyy'), projekt: id })}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                <IconPlus size={12} className="shrink-0" />
                {tx('Angebot')}
              </button>
              <button
                onClick={() => crud.rechnungen.openCreate({ rechnungsdatum: today, projekt: id })}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <IconPlus size={12} className="shrink-0" />
                {tx('Rechnung')}
              </button>
            </div>
          </div>
          {projektAngebote.length === 0 && projektRechnungen.length === 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-muted-foreground">{tx('Noch keine Angebote oder Rechnungen.')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border -mx-2">
              {projektAngebote.map(a => (
                <li key={a.record_id}>
                  <button
                    type="button"
                    onClick={() => crud.angebote.openDetail(a)}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    <IconBriefcase size={14} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.fields.angebotsnummer || tx('Angebot')}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {a.fields.angebotsstatus?.label}
                        {a.fields.kostenbetrag != null && ` · ${formatCurrency(a.fields.kostenbetrag)}`}
                        {a.fields.angebotsdatum && ` · ${formatDate(a.fields.angebotsdatum)}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {projektRechnungen.map(r => {
                const isOffen = lookupKey(r.fields.rechnungsstatus) === 'offen' || lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig';
                return (
                  <li key={r.record_id}>
                    <button
                      type="button"
                      onClick={() => crud.rechnungen.openDetail(r)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-3 text-left hover:bg-muted/40 transition-colors"
                    >
                      <IconFileInvoice size={14} className={`shrink-0 ${isOffen ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.fields.rechnungsnummer || tx('Rechnung')}</span>
                        <span className="mt-0.5 block truncate text-xs">
                          <span className={isOffen ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                            {r.fields.rechnungsstatus?.label}
                          </span>
                          {r.fields.gesamtbetrag != null && (
                            <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)}</span>
                          )}
                          {r.fields.faelligkeitsdatum && (
                            <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
                          )}
                        </span>
                      </span>
                      {isOffen && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => { e.stopPropagation(); markRechnungBezahlt(r.record_id); }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); markRechnungBezahlt(r.record_id); }
                          }}
                          className="shrink-0 inline-flex items-center justify-center min-h-8 rounded-lg border border-border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
                        >
                          {tx('Bezahlt')}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Verlauf — chronological activity timeline */}
      {verlauf.length > 0 && (
        <section className="rounded-[27px] bg-card p-5 shadow-lg overflow-hidden">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{tx('Verlauf')}</h2>
          <ol className="relative border-l border-border ml-2 space-y-0">
            {verlauf.slice(0, 12).map((entry, i) => (
              <li key={entry.id + i} className="mb-4 ml-5">
                <div className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-card shrink-0
                  ${entry.type === 'rechnung' ? 'bg-amber-400' : entry.type === 'angebot' ? 'bg-blue-400' : 'bg-emerald-400'}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (entry.type === 'zeit') {
                      const z = zeiterfassung.find(z => z.record_id === entry.id);
                      if (z) crud.zeiterfassung.openDetail(z);
                    } else if (entry.type === 'rechnung') {
                      const r = rechnungen.find(r => r.record_id === entry.id);
                      if (r) crud.rechnungen.openDetail(r);
                    } else {
                      const a = angebote.find(a => a.record_id === entry.id);
                      if (a) crud.angebote.openDetail(a);
                    }
                  }}
                  className="text-left group"
                >
                  <p className="text-xs text-muted-foreground mb-0.5">{formatDate(entry.date)}</p>
                  <p className="text-sm text-foreground truncate max-w-sm group-hover:underline">{entry.label}</p>
                </button>
              </li>
            ))}
          </ol>
          {verlauf.length > 12 && (
            <p className="text-xs text-muted-foreground ml-7">+{verlauf.length - 12} {tx('weitere Einträge')}</p>
          )}
        </section>
      )}

      {crud.surfaces}
    </div>
  );
}
