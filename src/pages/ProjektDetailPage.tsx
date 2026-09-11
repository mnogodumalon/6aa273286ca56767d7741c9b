import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx } from '@/i18n';
import { useClock, undoToast } from '@/lib/polish';
import { format } from 'date-fns';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { lookupOption } from '@/types/app';
import type { Zeiterfassung, BeraterInnen } from '@/types/app';
import { extractRecordId, LivingAppsService } from '@/services/livingAppsService';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import {
  IconArrowLeft,
  IconClock,
  IconFileInvoice,
  IconUser,
  IconUsers,
  IconCheck,
  IconLock,
  IconAlertTriangle,
  IconPlus,
  IconExternalLink,
  IconChevronRight,
} from '@tabler/icons-react';

function beraterInitials(b: BeraterInnen | undefined): string {
  if (!b) return '?';
  return `${(b.fields.vorname ?? '').charAt(0)}${(b.fields.nachname ?? '').charAt(0)}`.toUpperCase();
}

function filterAngebotsdatensatz(text: string | undefined): string {
  if (!text) return '';
  return text
    .split('\n')
    .filter(l => !l.trim().startsWith('Angebotsdatensatz:'))
    .join('\n')
    .trim();
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
  const {
    projekte, zeiterfassung, rechnungen, angebote,
    beraterInnen, leistungskatalog,
    setProjekte, setRechnungen, fetchAll, loading, error,
  } = data;
  const today = format(clock, 'yyyy-MM-dd');

  const enrichedProjekte = crud.enriched.projekte;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;

  // ── All hooks before early returns ──

  const [showAbschliessenDialog, setShowAbschliessenDialog] = useState(false);
  const [backDialog, setBackDialog] = useState<{ targetStatus: string; label: string } | null>(null);
  const [lastWriteAt, setLastWriteAt] = useState<number | null>(null);

  useEffect(() => {
    if (!lastWriteAt) return;
    const timer = setTimeout(() => { fetchAll(); }, 15000);
    return () => clearTimeout(timer);
  }, [lastWriteAt, fetchAll]);

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

  const getStundensatz = useCallback((z: Zeiterfassung): { rate: number; missing: boolean } => {
    const leistungId = extractRecordId(z.fields.leistung);
    if (leistungId) {
      const leistung = leistungskatalog.find(l => l.record_id === leistungId);
      if (leistung?.fields.stundensatz_leistung != null) {
        return { rate: leistung.fields.stundensatz_leistung, missing: false };
      }
    }
    const beraterId = extractRecordId(z.fields.berater);
    if (beraterId) {
      const berater = beraterInnen.find(b => b.record_id === beraterId);
      if (berater?.fields.stundensatz != null) {
        return { rate: berater.fields.stundensatz, missing: false };
      }
    }
    return { rate: 0, missing: true };
  }, [leistungskatalog, beraterInnen]);

  const unabgerechnetZeit = useMemo(() =>
    projektZeit.filter(z =>
      z.fields.verrechenbar === true &&
      !projektRechnungen.some(r =>
        lookupKey(r.fields.abrechnungsmonat) === lookupKey(z.fields.monat) &&
        r.fields.abrechnungsjahr === z.fields.jahr &&
        lookupKey(r.fields.rechnungsstatus) !== 'storniert'
      )
    ),
    [projektZeit, projektRechnungen]
  );

  const unabgerechneterBetrag = useMemo(() =>
    unabgerechnetZeit.reduce((sum, z) => sum + (z.fields.stunden ?? 0) * getStundensatz(z).rate, 0),
    [unabgerechnetZeit, getStundensatz]
  );

  const verbrauchtBetrag = useMemo(() =>
    projektZeit.reduce((sum, z) => sum + (z.fields.stunden ?? 0) * getStundensatz(z).rate, 0),
    [projektZeit, getStundensatz]
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

  const closeBlockReasons = useMemo((): string[] => {
    const reasons: string[] = [];
    if (unabgerechnetZeit.length > 0) {
      const h = unabgerechnetZeit.reduce((s, z) => s + (z.fields.stunden ?? 0), 0);
      reasons.push(`${h.toFixed(1)} h unabgerechnet (${formatCurrency(unabgerechneterBetrag)})`);
    }
    if (offeneRechnungenCount > 0) {
      reasons.push(`${offeneRechnungenCount} ${offeneRechnungenCount === 1 ? 'Rechnung offen' : 'Rechnungen offen'}`);
    }
    return reasons;
  }, [unabgerechnetZeit, unabgerechneterBetrag, offeneRechnungenCount]);

  const canClose = closeBlockReasons.length === 0;

  const oldestUnbilledEntry = useMemo(() =>
    [...unabgerechnetZeit]
      .sort((a, b) => (a.fields.datum ?? '') < (b.fields.datum ?? '') ? -1 : 1)[0] ?? null,
    [unabgerechnetZeit]
  );

  const teamData = useMemo(() => {
    const projektleitungId = projekt ? extractRecordId(projekt.fields.projektleitung) : null;
    const seen = new Map<string, {
      berater: BeraterInnen | undefined;
      isLeitung: boolean;
      stunden: number;
      betrag: number;
      leistungName: string | null;
    }>();

    if (projektleitungId) {
      seen.set(projektleitungId, {
        berater: beraterInnen.find(b => b.record_id === projektleitungId),
        isLeitung: true,
        stunden: 0,
        betrag: 0,
        leistungName: null,
      });
    }

    for (const z of projektZeit) {
      const bid = extractRecordId(z.fields.berater);
      if (!bid) continue;
      const ez = enrichedZeiterfassung.find(e => e.record_id === z.record_id);
      const existing = seen.get(bid) ?? {
        berater: beraterInnen.find(b => b.record_id === bid),
        isLeitung: bid === projektleitungId,
        stunden: 0,
        betrag: 0,
        leistungName: null,
      };
      const { rate } = getStundensatz(z);
      existing.stunden += z.fields.stunden ?? 0;
      existing.betrag += (z.fields.stunden ?? 0) * rate;
      if (!existing.leistungName && ez?.leistungName) existing.leistungName = ez.leistungName;
      seen.set(bid, existing);
    }
    return [...seen.values()];
  }, [projekt, beraterInnen, projektZeit, getStundensatz, enrichedZeiterfassung]);

  const erstesAngebot = useMemo(() =>
    projektAngebote.length > 0
      ? [...projektAngebote].sort((a, b) =>
          (b.fields.angebotsdatum ?? '') > (a.fields.angebotsdatum ?? '') ? 1 : -1
        )[0]
      : null,
    [projektAngebote]
  );

  type VerlaufItem =
    | { kind: 'zeit'; date: string; z: (typeof projektZeit)[0]; beraterName: string }
    | { kind: 'angebot'; date: string; a: (typeof projektAngebote)[0] }
    | { kind: 'rechnung'; date: string; r: (typeof projektRechnungen)[0] };

  const verlauf = useMemo((): VerlaufItem[] => {
    const items: VerlaufItem[] = [
      ...projektZeit.map(z => ({
        kind: 'zeit' as const,
        date: z.fields.datum ?? '',
        z,
        beraterName: enrichedZeiterfassung.find(e => e.record_id === z.record_id)?.beraterName ?? '',
      })),
      ...projektAngebote.map(a => ({ kind: 'angebot' as const, date: a.fields.angebotsdatum ?? '', a })),
      ...projektRechnungen.map(r => ({ kind: 'rechnung' as const, date: r.fields.rechnungsdatum ?? '', r })),
    ];
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [projektZeit, projektAngebote, projektRechnungen, enrichedZeiterfassung]);

  // ── Handlers ──

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
      setLastWriteAt(Date.now());
    } catch {
      fetchAll();
    }
  };

  const abschliessen = async () => {
    if (!id || !projekt) return;
    const prevStatus = lookupKey(projekt.fields.status) ?? 'akquise';
    const prev = projekte.map(p => ({ ...p }));
    setProjekte(old => old.map(p =>
      p.record_id === id
        ? { ...p, fields: { ...p.fields, status: lookupOption('projekte', 'status', 'abgeschlossen') } }
        : p
    ));
    undoToast(tx('Projekt abgeschlossen'), async () => {
      setProjekte(prev);
      await LivingAppsService.updateProjekteEntry(id, { status: prevStatus });
    });
    try {
      await LivingAppsService.updateProjekteEntry(id, { status: 'abgeschlossen' });
      setLastWriteAt(Date.now());
    } catch {
      fetchAll();
    }
  };

  const advanceStatus = async (targetStatus: string) => {
    if (!id || !projekt) return;
    const prevStatus = lookupKey(projekt.fields.status) ?? 'akquise';
    const prev = projekte.map(p => ({ ...p }));
    setProjekte(old => old.map(p =>
      p.record_id === id
        ? { ...p, fields: { ...p.fields, status: lookupOption('projekte', 'status', targetStatus) } }
        : p
    ));
    undoToast(tx('Projektstatus geändert'), async () => {
      setProjekte(prev);
      await LivingAppsService.updateProjekteEntry(id, { status: prevStatus });
    });
    try {
      await LivingAppsService.updateProjekteEntry(id, { status: targetStatus });
      setLastWriteAt(Date.now());
    } catch {
      fetchAll();
    }
  };

  const navigateToStundenErfassen = () => {
    navigate('/intents/stunden-erfassen', { state: { projektId: id } });
  };

  const navigateToRechnungErstellen = () => {
    navigate('/intents/rechnung-erstellen', {
      state: {
        projektId: id,
        monatKey: oldestUnbilledEntry ? lookupKey(oldestUnbilledEntry.fields.monat) : undefined,
        jahr: oldestUnbilledEntry?.fields.jahr,
        initialStep: 2,
      },
    });
  };

  // ── Early returns ──
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

  const status = lookupKey(projekt.fields.status) ?? '';
  const budget = projekt.fields.budget;
  const rest = budget != null ? budget - verbrauchtBetrag : null;
  const budgetPct = budget != null && budget > 0 ? Math.min(1, verbrauchtBetrag / budget) : null;

  // Stepper: Angebot=0, Akquise=1, In Bearbeitung=2, Abgeschlossen=3
  const stageIdxMap: Record<string, number> = { akquise: 1, in_bearbeitung: 2, abgeschlossen: 3 };
  const currentStageIdx = stageIdxMap[status] ?? 0;
  const stageKeys = ['', 'akquise', 'in_bearbeitung', 'abgeschlossen'];

  const handleStageClick = (idx: number) => {
    const targetKey = stageKeys[idx];
    if (!targetKey || targetKey === status) return;
    if (idx < currentStageIdx) {
      setBackDialog({ targetStatus: targetKey, label: stageLabels[idx] });
    } else if (idx === 3) {
      if (canClose) abschliessen();
      else setShowAbschliessenDialog(true);
    } else {
      advanceStatus(targetKey);
    }
  };

  const stageBox = (idx: number) => {
    const isClickable = stageKeys[idx] && stageKeys[idx] !== status;
    if (idx < currentStageIdx) return `border-emerald-300 bg-emerald-50 text-emerald-700${isClickable ? ' cursor-pointer hover:bg-emerald-100' : ''}`;
    if (idx === currentStageIdx) return 'border-primary bg-primary/5 text-primary font-semibold cursor-default';
    if (idx === 3 && !canClose) return `border-zinc-200 bg-zinc-50 text-zinc-400${isClickable ? ' cursor-pointer hover:bg-zinc-100' : ''}`;
    return `border-border bg-card text-muted-foreground${isClickable ? ' cursor-pointer hover:bg-muted' : ''}`;
  };
  const stageDot = (idx: number) =>
    idx < currentStageIdx ? 'bg-emerald-500' : idx === currentStageIdx ? 'bg-primary' : 'bg-zinc-200';
  const stageLine = (idx: number) => idx < currentStageIdx ? 'bg-emerald-300' : 'bg-border';

  const stageLabels = [tx('Angebot'), tx('Akquise'), tx('In Bearbeitung'), tx('Abgeschlossen')];
  const stageDetails: (string | null)[] = [
    erstesAngebot
      ? [
          erstesAngebot.fields.angebotsnummer,
          erstesAngebot.fields.angebotsstatus?.label,
          erstesAngebot.fields.kostenbetrag != null ? formatCurrency(erstesAngebot.fields.kostenbetrag) : null,
          erstesAngebot.fields.angebotsdatum ? formatDate(erstesAngebot.fields.angebotsdatum) : null,
        ].filter(Boolean).join(' · ')
      : tx('kein Angebot'),
    null,
    [projekt.fields.projektstart_monat?.label, projekt.fields.projektstart_jahr].filter(Boolean).join(' ') || null,
    status === 'abgeschlossen'
      ? (projekt.fields.projektende ? formatDate(projekt.fields.projektende) : null)
      : projekt.fields.projektende ? formatDate(projekt.fields.projektende) : null,
  ];

  const letzterStandFiltered = filterAngebotsdatensatz(projekt.fields.letzter_schritt);
  const notizenFiltered = filterAngebotsdatensatz(projekt.fields.notizen);

  return (
    <div className="space-y-6 pb-10">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <IconArrowLeft size={16} className="shrink-0" />
        {tx('Dashboard')}
      </button>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{projekt.fields.projektkennung}</h1>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {projekt.fields.projektart && (
              <span className="font-medium text-foreground">{projekt.fields.projektart.label}</span>
            )}
            {enrichedProjekt?.kundeName && (
              <span className="flex items-center gap-1">
                <IconUser size={13} className="shrink-0" />
                {enrichedProjekt.kundeName}
              </span>
            )}
            {projekt.fields.ansprechpartner_kunde && (
              <span>{tx('Ansp.')}: {projekt.fields.ansprechpartner_kunde}</span>
            )}
            {enrichedProjekt?.projektleitungName && (
              <span>{tx('Leitung')}: {enrichedProjekt.projektleitungName}</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={navigateToStundenErfassen}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <IconClock size={15} className="shrink-0" />
            {tx('Zeit buchen')}
          </button>

          {unabgerechneterBetrag > 0 && (
            <button
              onClick={navigateToRechnungErstellen}
              className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <IconFileInvoice size={15} className="shrink-0" />
              {tx('Rechnung erstellen')} · {formatCurrency(unabgerechneterBetrag)}
            </button>
          )}

          {status !== 'abgeschlossen' && (
            canClose ? (
              <button
                onClick={abschliessen}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <IconCheck size={15} className="shrink-0" />
                {tx('Abschließen')}
              </button>
            ) : (
              <button
                onClick={() => setShowAbschliessenDialog(true)}
                title={closeBlockReasons.join(' · ')}
                className="flex items-center gap-2 rounded-lg bg-zinc-100 text-zinc-400 px-3 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                <IconLock size={15} className="shrink-0" />
                {tx('Abschließen')}
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Statusleiste (clickable) ── */}
      <div className="rounded-[27px] bg-card p-4 shadow-lg overflow-x-auto">
        <div className="flex items-stretch min-w-max">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="flex items-center">
              <div
                role={stageKeys[idx] && stageKeys[idx] !== status ? 'button' : undefined}
                tabIndex={stageKeys[idx] && stageKeys[idx] !== status ? 0 : undefined}
                onClick={() => handleStageClick(idx)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStageClick(idx); } }}
                className={`flex flex-col justify-center px-4 py-3 rounded-2xl border text-xs min-w-[110px] max-w-[180px] transition-colors ${stageBox(idx)}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${stageDot(idx)}`} />
                  <span className="font-medium">{stageLabels[idx]}</span>
                  {idx === currentStageIdx && <IconCheck size={12} className="shrink-0 ml-auto opacity-60" />}
                  {idx === 3 && idx !== currentStageIdx && !canClose && (
                    <IconLock size={11} className="shrink-0 ml-auto opacity-40" />
                  )}
                </div>
                {stageDetails[idx] && (
                  <p className="text-[11px] leading-tight mt-0.5 opacity-80" style={{ wordBreak: 'break-word' }}>
                    {stageDetails[idx]}
                  </p>
                )}
              </div>
              {idx < 3 && (
                <div className="flex items-center px-1 shrink-0">
                  <div className={`h-0.5 w-4 ${stageLine(idx)}`} />
                  <IconChevronRight size={12} className={idx < currentStageIdx ? 'text-emerald-400' : 'text-border'} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Budget + Team ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Budget */}
        <section className="rounded-[27px] bg-card p-5 shadow-lg space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tx('Budget')}</h2>

          {budget == null ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{tx('kein Budget hinterlegt')}</p>
              {totalStunden > 0 && (
                <p className="text-xs text-muted-foreground">
                  {totalStunden.toFixed(1)} h {tx('gebucht')}
                  {unabgerechneterBetrag > 0 && (
                    <span className="ml-2 text-amber-600 font-medium">· {formatCurrency(unabgerechneterBetrag)} {tx('unabgerechnet')}</span>
                  )}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{tx('Budget')}</p>
                  <p className="text-lg font-bold">{formatCurrency(budget)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{tx('Verbraucht')}</p>
                  <p className={`text-lg font-bold ${budgetPct != null && budgetPct >= 0.9 ? 'text-destructive' : ''}`}>
                    {formatCurrency(verbrauchtBetrag)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{tx('Rest')}</p>
                  <p className={`text-base font-semibold ${(rest ?? 0) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                    {formatCurrency(rest ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{tx('Unabgerechnet')}</p>
                  <p className={`text-base font-semibold ${unabgerechneterBetrag > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {formatCurrency(unabgerechneterBetrag)}
                  </p>
                </div>
              </div>

              {budgetPct != null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{tx('Verbraucht')}</span>
                    <span className={budgetPct >= 0.9 ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                      {Math.round(budgetPct * 100)} %
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${budgetPct >= 0.9 ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${budgetPct * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">{totalStunden.toFixed(1)} h {tx('gesamt')}</p>
            </>
          )}
        </section>

        {/* Team */}
        <section className="rounded-[27px] bg-card p-5 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tx('Team')}</h2>
            <IconUsers size={15} className="text-muted-foreground shrink-0" />
          </div>

          {teamData.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tx('Noch keine Zeiteinträge — Team wird nach der ersten Buchung angezeigt.')}</p>
          ) : (
            <ul className="divide-y divide-border -mx-2">
              {teamData.map(({ berater, isLeitung, stunden, betrag, leistungName }, i) => {
                const name = berater
                  ? `${berater.fields.vorname ?? ''} ${berater.fields.nachname ?? ''}`.trim()
                  : tx('Unbekannt');
                return (
                  <li key={i} className="flex items-center gap-3 px-2 py-2.5">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {beraterInitials(berater)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isLeitung
                          ? tx('Projektleitung')
                          : (leistungName || tx('Berater'))}
                        {!isLeitung && berater?.fields.stundensatz != null && (
                          <span className="opacity-60"> · {berater.fields.stundensatz} €/h</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{stunden.toFixed(1)} h</p>
                      {betrag > 0 ? (
                        <p className="text-xs text-muted-foreground">{formatCurrency(betrag)}</p>
                      ) : stunden > 0 ? (
                        <p className="text-xs text-amber-500">{tx('kein Satz')}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── Notizen (filtered) ── */}
      {(letzterStandFiltered || notizenFiltered) && (
        <section className="rounded-[27px] bg-card p-5 shadow-lg space-y-3">
          {letzterStandFiltered && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{tx('Aktueller Stand')}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{letzterStandFiltered}</p>
            </div>
          )}
          {notizenFiltered && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{tx('Notizen')}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notizenFiltered}</p>
            </div>
          )}
        </section>
      )}

      {/* ── Zeiten ── */}
      <section className="rounded-[27px] bg-card p-5 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tx('Zeiten')}</h2>
            {projektZeit.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalStunden.toFixed(1)} h {tx('gesamt')}
                {unabgerechneterBetrag > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">· {formatCurrency(unabgerechneterBetrag)} {tx('offen')}</span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={() => crud.zeiterfassung.openCreate({ datum: today, projekt: id })}
            className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
          >
            <IconPlus size={12} className="shrink-0" />
            {tx('Hinzufügen')}
          </button>
        </div>

        {projektZeit.length === 0 ? (
          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground">{tx('Noch keine Zeiteinträge für dieses Projekt.')}</p>
            <button
              onClick={() => crud.zeiterfassung.openCreate({ datum: today, projekt: id })}
              className="inline-flex items-center gap-1.5 min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              {tx('Zeit erfassen')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full min-w-[580px] text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left px-2 py-1.5 font-normal">{tx('Datum')}</th>
                  <th className="text-left px-2 py-1.5 font-normal">{tx('Tätigkeit')}</th>
                  <th className="text-left px-2 py-1.5 font-normal">{tx('Person')}</th>
                  <th className="text-left px-2 py-1.5 font-normal">{tx('Leistung')}</th>
                  <th className="text-right px-2 py-1.5 font-normal">{tx('Std.')}</th>
                  <th className="text-right px-2 py-1.5 font-normal">{tx('Betrag')}</th>
                  <th className="text-right px-2 py-1.5 font-normal">{tx('Stand')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projektZeit.map(z => {
                  const ez = enrichedZeiterfassung.find(e => e.record_id === z.record_id);
                  const { rate, missing } = getStundensatz(z);
                  const betrag = (z.fields.stunden ?? 0) * rate;

                  let standLabel = '';
                  let standCls = '';
                  if (!z.fields.verrechenbar) {
                    standLabel = tx('nicht verrechenbar');
                    standCls = 'bg-zinc-100 text-zinc-500';
                  } else {
                    const match = projektRechnungen.find(r =>
                      lookupKey(r.fields.abrechnungsmonat) === lookupKey(z.fields.monat) &&
                      r.fields.abrechnungsjahr === z.fields.jahr &&
                      lookupKey(r.fields.rechnungsstatus) !== 'storniert'
                    );
                    if (match) {
                      standLabel = `${tx('abgerechnet')} ${match.fields.rechnungsnummer ?? ''}`.trim();
                      standCls = 'bg-emerald-100 text-emerald-700';
                    } else {
                      standLabel = tx('offen');
                      standCls = 'bg-amber-100 text-amber-700';
                    }
                  }

                  return (
                    <tr
                      key={z.record_id}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => crud.zeiterfassung.openDetail(z)}
                    >
                      <td className="px-2 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                        {z.fields.datum ? formatDate(z.fields.datum) : '–'}
                      </td>
                      <td className="px-2 py-2.5 max-w-[160px]">
                        <span className="line-clamp-2 text-xs">
                          {z.fields.taetigkeitsbeschreibung || <span className="text-muted-foreground">–</span>}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-xs">{ez?.beraterName || '–'}</td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-xs text-muted-foreground">{ez?.leistungName || '–'}</td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap font-medium">{(z.fields.stunden ?? 0).toFixed(1)}</td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap text-xs">
                        {missing
                          ? <span className="text-amber-500">{tx('kein Satz')}</span>
                          : <span className="text-muted-foreground">{formatCurrency(betrag)}</span>
                        }
                      </td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${standCls}`}>
                          {standLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Dokumente ── */}
      <section className="rounded-[27px] bg-card p-5 shadow-lg space-y-5 overflow-hidden">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tx('Dokumente')}</h2>

        {/* Angebote */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">{tx('Angebote')}</h3>
            <button
              onClick={() => crud.angebote.openCreate({ angebotsdatum: today, angebotsjahr: format(clock, 'yyyy'), projekt: id })}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <IconPlus size={12} className="shrink-0" />
              {tx('Neu')}
            </button>
          </div>
          {projektAngebote.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">{tx('Keine Angebote')}</p>
          ) : (
            <ul className="divide-y divide-border -mx-2">
              {projektAngebote.map(a => (
                <li key={a.record_id}>
                  <button
                    type="button"
                    onClick={() => crud.angebote.openDetail(a)}
                    className="flex w-full items-center gap-2 px-2 py-2.5 hover:bg-muted/40 rounded-xl transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1 text-xs">
                      <span className="font-medium text-sm">{a.fields.angebotsnummer || tx('Angebot')}</span>
                      <span className="ml-2 text-muted-foreground">
                        {[
                          a.fields.angebotstyp?.label,
                          a.fields.kostenbetrag != null ? formatCurrency(a.fields.kostenbetrag) : null,
                          a.fields.angebotsdatum ? formatDate(a.fields.angebotsdatum) : null,
                        ].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 shrink-0">
                      {a.fields.angebotsstatus?.label}
                    </span>
                    {a.fields.vorlage_datei && (
                      <a
                        href={a.fields.vorlage_datei as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 text-muted-foreground hover:text-primary"
                        title={tx('PDF öffnen')}
                      >
                        <IconExternalLink size={14} />
                      </a>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rechnungen */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">{tx('Rechnungen')}</h3>
            <button
              onClick={() => crud.rechnungen.openCreate({ rechnungsdatum: today, projekt: id })}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <IconPlus size={12} className="shrink-0" />
              {tx('Neu')}
            </button>
          </div>
          {projektRechnungen.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">{tx('Keine Rechnungen')}</p>
          ) : (
            <ul className="divide-y divide-border -mx-2">
              {projektRechnungen.map(r => {
                const st = lookupKey(r.fields.rechnungsstatus);
                const isOffen = st === 'offen' || st === 'ueberfaellig';
                return (
                  <li key={r.record_id}>
                    <button
                      type="button"
                      onClick={() => crud.rechnungen.openDetail(r)}
                      className="flex w-full items-center gap-2 px-2 py-2.5 hover:bg-muted/40 rounded-xl transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1 text-xs">
                        <span className="font-medium text-sm">{r.fields.rechnungsnummer || tx('Rechnung')}</span>
                        <span className="ml-2 text-muted-foreground">
                          {[
                            r.fields.gesamtbetrag != null ? formatCurrency(r.fields.gesamtbetrag) : null,
                            r.fields.zahlungseingang ? `${tx('Eingang')}: ${formatDate(r.fields.zahlungseingang)}` : null,
                          ].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isOffen ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {r.fields.rechnungsstatus?.label}
                      </span>
                      {r.fields.rechnungsdatei && (
                        <a
                          href={r.fields.rechnungsdatei as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="shrink-0 text-muted-foreground hover:text-primary"
                          title={tx('PDF öffnen')}
                        >
                          <IconExternalLink size={14} />
                        </a>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Verlauf */}
        {verlauf.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">{tx('Verlauf')}</h3>
            <ul className="divide-y divide-border/50 -mx-2">
              {verlauf.map((item, i) => {
                if (item.kind === 'zeit') {
                  return (
                    <li key={`z${i}`} className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                      <IconClock size={11} className="shrink-0 text-zinc-400" />
                      <span className="shrink-0 w-20">{item.date ? formatDate(item.date) : '–'}</span>
                      <span className="truncate">{item.beraterName || tx('Berater')}</span>
                      <span className="ml-auto shrink-0 font-medium text-foreground">{(item.z.fields.stunden ?? 0).toFixed(1)} h</span>
                    </li>
                  );
                }
                if (item.kind === 'angebot') {
                  return (
                    <li key={`a${i}`} className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                      <IconFileInvoice size={11} className="shrink-0 text-blue-400" />
                      <span className="shrink-0 w-20">{item.date ? formatDate(item.date) : '–'}</span>
                      <span className="truncate">{item.a.fields.angebotsnummer ?? tx('Angebot')}</span>
                      <span className="ml-auto shrink-0">{item.a.fields.angebotsstatus?.label}</span>
                    </li>
                  );
                }
                return (
                  <li key={`r${i}`} className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                    <IconFileInvoice size={11} className="shrink-0 text-emerald-500" />
                    <span className="shrink-0 w-20">{item.date ? formatDate(item.date) : '–'}</span>
                    <span className="truncate">{item.r.fields.rechnungsnummer ?? tx('Rechnung')}</span>
                    <span className="ml-auto shrink-0">{item.r.fields.rechnungsstatus?.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* ── Rückfrage-Dialog (backwards) ── */}
      {backDialog && createPortal(
        <div
          className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-black/50"
          onClick={() => setBackDialog(null)}
        >
          <div
            className="bg-card rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-foreground">{tx('Status zurücksetzen?')}</h2>
            <p className="text-sm text-muted-foreground">
              {tx('Projekt zurück auf')} <strong>{backDialog.label}</strong> {tx('setzen?')}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={async () => { await advanceStatus(backDialog.targetStatus); setBackDialog(null); }}
                className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {tx('Ja, zurücksetzen')}
              </button>
              <button
                onClick={() => setBackDialog(null)}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                {tx('Abbrechen')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Abschließen-Dialog (Sperre) ── */}
      {showAbschliessenDialog && createPortal(
        <div
          className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-black/50"
          onClick={() => setShowAbschliessenDialog(false)}
        >
          <div
            className="bg-card rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <IconAlertTriangle size={20} className="shrink-0 text-amber-500 mt-0.5" />
              <div>
                <h2 className="text-base font-bold text-foreground">{tx('Projekt abschließen?')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{tx('Folgende Punkte müssen zuerst erledigt werden:')}</p>
              </div>
            </div>

            <ul className="space-y-2">
              {closeBlockReasons.map((reason, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 pt-1">
              {unabgerechneterBetrag > 0 && (
                <button
                  onClick={() => { setShowAbschliessenDialog(false); navigateToRechnungErstellen(); }}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <IconFileInvoice size={15} className="shrink-0" />
                  {tx('Rechnung erstellen')} · {formatCurrency(unabgerechneterBetrag)}
                </button>
              )}
              <button
                onClick={() => setShowAbschliessenDialog(false)}
                className="flex items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                {tx('Schließen')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {crud.surfaces}
    </div>
  );
}
