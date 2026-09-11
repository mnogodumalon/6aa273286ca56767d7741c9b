import type { DashboardData } from '@/hooks/useDashboardData';
import { useNavigate } from 'react-router-dom';
import { useEntityCrud } from '@/components/EntityCrud';
import { useMemo, useState, useEffect } from 'react';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { lookupOption, LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, LivingAppsService } from '@/services/livingAppsService';
import { format } from 'date-fns';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';
import {
  IconAlertCircle,
  IconClock,
  IconFolder,
  IconFileInvoice,
  IconUsers,
  IconBriefcase,
  IconPlus,
  IconUserPlus,
} from '@tabler/icons-react';

function toneForProjektStatus(status: string | undefined): KanbanTone {
  if (status === 'in_bearbeitung') return 'primary';
  if (status === 'akquise') return 'warning';
  if (status === 'abgeschlossen') return 'success';
  return 'default';
}

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    beraterInnen, kunden, projekte, angebote, zeiterfassung, rechnungen,
    setProjekte, setRechnungen,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const rec = rechnungen.find(r => r.record_id === top.record.record_id);
        const status = lookupKey(rec?.fields.rechnungsstatus);
        if (status === 'offen' || status === 'ueberfaellig') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: () => markRechnungBezahlt(top.record.record_id),
          };
        }
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;

  const navigate = useNavigate();
  const clock = useClock();
  const today = format(clock, 'yyyy-MM-dd');

  // KPIs
  const aktiveBearbeitung = projekte.filter(p => lookupKey(p.fields.status) === 'in_bearbeitung');
  const akquiseProj = projekte.filter(p => lookupKey(p.fields.status) === 'akquise');
  const offeneRechnungen = rechnungen.filter(r => {
    const st = lookupKey(r.fields.rechnungsstatus);
    return st === 'offen' || st === 'ueberfaellig';
  });
  const ueberfaelligeRechnungen = rechnungen.filter(r => {
    const st = lookupKey(r.fields.rechnungsstatus);
    if (st === 'ueberfaellig') return true;
    if (st === 'offen' && r.fields.faelligkeitsdatum && r.fields.faelligkeitsdatum < today) return true;
    return false;
  });
  const currentMonthStr = format(clock, 'yyyy-MM');
  const diesenMonatStunden = zeiterfassung
    .filter(z => z.fields.datum && z.fields.datum.startsWith(currentMonthStr.slice(0, 7)))
    .reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0);
  const aktiveBerater = beraterInnen.filter(b => lookupKey(b.fields.status) === 'aktiv');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showKunden, setShowKunden] = useState(false);

  // Nur für den Hauptnutzer "Klar" sichtbar
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const ALLOWED = ['klar', 'fruehwaldjakob@gmx.de', 'jakob'];
    const isAllowed = (s: string) => ALLOWED.includes(s.toLowerCase());
    try {
      const el = document.querySelector('la-header-bar-widget');
      const u: string = (el as any)?.username ?? (window as any).la_username ?? '';
      if (isAllowed(u)) { setIsAdmin(true); return; }
    } catch { /* ignore */ }
    fetch('/rest/user/')
      .then(r => r.json())
      .then(u => setIsAdmin(
        isAllowed(u?.username ?? '') || isAllowed(u?.login ?? '') || isAllowed(u?.email ?? '')
      ))
      .catch(() => {});
  }, []);

  // Kanban columns
  const COLUMNS = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['projekte']?.['status'] ?? []).map(o => ({ key: o.key, label: o.label, tone: toneForProjektStatus(o.key) })),
    [],
  );

  // Per-project stats for richer kanban cards
  const projektStats = useMemo(() => {
    const stats: Record<string, { stunden: number; offeneRechnungen: number }> = {};
    projekte.forEach(p => {
      const pid = p.record_id;
      const stunden = zeiterfassung
        .filter(z => extractRecordId(z.fields.projekt) === pid)
        .reduce((s, z) => s + (z.fields.stunden ?? 0), 0);
      const offeneRechnungen = rechnungen.filter(r => {
        if (extractRecordId(r.fields.projekt) !== pid) return false;
        const st = lookupKey(r.fields.rechnungsstatus);
        return st === 'offen' || st === 'ueberfaellig';
      }).length;
      stats[pid] = { stunden, offeneRechnungen };
    });
    return stats;
  }, [projekte, zeiterfassung, rechnungen]);

  // Kanban cards (filtered if needed)
  const cards = useMemo<KanbanCard[]>(() => {
    const filtered = statusFilter ? projekte.filter(p => lookupKey(p.fields.status) === statusFilter) : projekte;
    return filtered.map(p => {
      const status = lookupKey(p.fields.status) ?? '';
      const enriched = enrichedProjekte.find(ep => ep.record_id === p.record_id);
      const stats = projektStats[p.record_id];
      const isUeberfaellig = p.fields.projektende && p.fields.projektende < today && status !== 'abgeschlossen';
      const subtitleParts: string[] = [];
      if (enriched?.kundeName) subtitleParts.push(enriched.kundeName);
      else if (p.fields.projektart?.label) subtitleParts.push(p.fields.projektart.label);
      const meta: string[] = [];
      if (stats?.stunden) meta.push(`${stats.stunden} h`);
      if (stats?.offeneRechnungen) meta.push(`${stats.offeneRechnungen} offen`);
      if (p.fields.projektende && !isUeberfaellig) meta.push(formatDate(p.fields.projektende));
      if (isUeberfaellig) meta.push(`⚠ ${formatDate(p.fields.projektende)}`);
      const subtitle = [...subtitleParts, ...meta].join(' · ') || undefined;
      return {
        id: `projekt:${p.record_id}`,
        column: status,
        title: p.fields.projektkennung ?? tx('Ohne Kennung'),
        subtitle,
        tone: isUeberfaellig ? 'warning' : toneForProjektStatus(status),
      };
    });
  }, [projekte, enrichedProjekte, statusFilter, projektStats, today]);

  // Compute next sequential Projekt-ID candidate for current year
  const nextProjektKennung = useMemo(() => {
    const year = format(clock, 'yyyy');
    const thisYear = projekte.filter(p => p.fields.projektkennung?.startsWith(year + '-'));
    const nr = String(thisYear.length + 1).padStart(3, '0');
    return `${year}-${nr}`;
  }, [clock, projekte]);

  // Move project status (kanban drag)
  const moveProjekt = async (cardId: string, newColumn: string): Promise<string | void> => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    // Block moving to "Abgeschlossen" if open invoices exist
    if (newColumn === 'abgeschlossen') {
      const projektRechnungen = rechnungen.filter(r => extractRecordId(r.fields.projekt) === rid);
      const hasOffene = projektRechnungen.some(r => {
        const st = lookupKey(r.fields.rechnungsstatus);
        return st === 'offen' || st === 'ueberfaellig';
      });
      if (hasOffene) {
        return tx('Noch offene Rechnungen — bitte zuerst begleichen.');
      }
    }
    const prev = projekte.map(p => ({ ...p }));
    setProjekte(old => old.map(p =>
      p.record_id === rid
        ? { ...p, fields: { ...p.fields, status: lookupOption('projekte', 'status', newColumn) } }
        : p
    ));
    undoToast(tx`Projekt nach "${newColumn}" verschoben`, async () => {
      const original = prev.find(p => p.record_id === rid);
      if (original) {
        setProjekte(prev);
        await LivingAppsService.updateProjekteEntry(rid, { status: lookupKey(original.fields.status) });
      }
    });
    try {
      await LivingAppsService.updateProjekteEntry(rid, { status: newColumn });
    } catch {
      fetchAll();
    }
  };

  // Mark invoice as paid
  const markRechnungBezahlt = async (id: string) => {
    const prev = rechnungen.map(r => ({ ...r }));
    setRechnungen(old => old.map(r =>
      r.record_id === id
        ? { ...r, fields: { ...r.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt'), zahlungseingang: today } }
        : r
    ));
    undoToast(tx('Rechnung als bezahlt markiert'), async () => {
      setRechnungen(prev);
      await LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: 'offen', zahlungseingang: undefined });
    });
    try {
      await LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: 'bezahlt', zahlungseingang: today });
    } catch {
      fetchAll();
    }
  };

  // Hero: älteste überfällige Rechnung
  const heroBanner = ueberfaelligeRechnungen.length > 0 ? (() => {
    const oldest = [...ueberfaelligeRechnungen].sort((a, b) =>
      (a.fields.faelligkeitsdatum ?? '') < (b.fields.faelligkeitsdatum ?? '') ? -1 : 1
    )[0];
    const enriched = enrichedRechnungen.find(r => r.record_id === oldest.record_id);
    const kundeStr = enriched?.kundeName || '';
    const betrag = oldest.fields.gesamtbetrag;
    return (
      <HeroBanner
        icon={<IconAlertCircle size={18} />}
        action={{
          label: tx('Als bezahlt markieren'),
          onClick: () => markRechnungBezahlt(oldest.record_id),
        }}
      >
        {ueberfaelligeRechnungen.length === 1
          ? tx`${kundeStr ? kundeStr : tx('Ein Kunde')} — Rechnung ${oldest.fields.rechnungsnummer ?? ''} über ${formatCurrency(betrag)} überfällig seit ${formatDate(oldest.fields.faelligkeitsdatum)}.`
          : tx`${String(ueberfaelligeRechnungen.length)} überfällige Rechnungen — älteste: ${kundeStr} (${formatDate(oldest.fields.faelligkeitsdatum)}).`
        }
      </HeroBanner>
    );
  })() : undefined;

  // Aside 1: Offene / überfällige Rechnungen
  const offeneRechnungenSorted = [...offeneRechnungen].sort((a, b) =>
    (a.fields.faelligkeitsdatum ?? '') < (b.fields.faelligkeitsdatum ?? '') ? -1 : 1
  );

  // Aside 2: Letzte Zeiteinträge
  const letzteZeit = [...zeiterfassung].sort((a, b) =>
    (b.fields.datum ?? '') < (a.fields.datum ?? '') ? -1 : 1
  ).slice(0, 8);

  // Context line for greeting
  const kundenNamen = (() => {
    const aktiveKundenNamen = enrichedProjekte
      .filter(p => lookupKey(p.fields.status) === 'in_bearbeitung')
      .map(p => p.kundeName)
      .filter(Boolean)
      .slice(0, 3);
    return aktiveKundenNamen;
  })();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{gruss(clock)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {aktiveBearbeitung.length > 0
            ? kundenNamen.length > 0
              ? tx`${String(aktiveBearbeitung.length)} Projekte aktiv — Kunden: ${namen(kundenNamen)}.`
              : tx`${String(aktiveBearbeitung.length)} Projekte aktiv, ${String(akquiseProj.length)} in Akquise.`
            : tx('Noch keine aktiven Projekte — leg eines an.')}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => crud.projekte.openCreate({ projektkennung: nextProjektKennung })}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
        <button
          onClick={() => crud.zeiterfassung.openCreate({ datum: today })}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Zeit erfassen')}
        </button>
        <button
          onClick={() => crud.angebote.openCreate({ angebotsdatum: today, angebotsjahr: format(clock, 'yyyy') })}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Angebot')}
        </button>
        <button
          onClick={() => crud.rechnungen.openCreate({ rechnungsdatum: today })}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neue Rechnung')}
        </button>
        <button
          onClick={() => crud.kunden.openCreate({})}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neuer Kunde')}
        </button>
        {isAdmin && (
          <button
            onClick={() => crud.beraterInnen.openCreate({})}
            className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 px-4 py-2 text-sm text-primary hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <IconUserPlus size={16} className="shrink-0" />
            {tx('Neue Berater:in')}
          </button>
        )}
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroBanner}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={aktiveBearbeitung.length}
              icon={<IconFolder size={16} className="shrink-0" />}
              tone={aktiveBearbeitung.length > 0 ? 'primary' : 'default'}
              onClick={() => setStatusFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={statusFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={tx('Akquise')}
              value={akquiseProj.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone={akquiseProj.length > 0 ? 'warning' : 'default'}
              onClick={() => setStatusFilter(f => f === 'akquise' ? null : 'akquise')}
              active={statusFilter === 'akquise'}
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length}
              icon={<IconFileInvoice size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Stunden diesen Monat')}
              value={`${Math.round(diesenMonatStunden)} h`}
              icon={<IconClock size={16} className="shrink-0" />}
              tone="default"
            />
            <StatStripItem
              title={appLabel('berater/innen')}
              value={aktiveBerater.length}
              icon={<IconUsers size={16} className="shrink-0" />}
              tone="default"
            />
            <StatStripItem
              title={tx('Kunden')}
              value={kunden.length}
              icon={<IconUsers size={16} className="shrink-0" />}
              tone={kunden.length > 0 ? 'primary' : 'default'}
              onClick={() => setShowKunden(f => !f)}
              active={showKunden}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            cards={cards}
            columns={COLUMNS}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={card => {
              const rid = card.id.split(':')[1];
              if (rid) navigate(`/projekt/${rid}`);
            }}
            onCardMove={moveProjekt}
            onAddCard={column => crud.projekte.openCreate({ status: column, projektkennung: nextProjektKennung })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene Rechnungen')}
              items={offeneRechnungenSorted.map(r => {
                const enriched = enrichedRechnungen.find(er => er.record_id === r.record_id);
                const isUeberfallig = lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig' ||
                  (lookupKey(r.fields.rechnungsstatus) === 'offen' && r.fields.faelligkeitsdatum && r.fields.faelligkeitsdatum < today);
                return {
                  id: r.record_id,
                  title: enriched?.kundeName || r.fields.rechnungsnummer || tx('Rechnung'),
                  secondLine: (
                    <>
                      <span className={isUeberfallig ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                        {isUeberfallig ? tx('Überfällig') : tx('Offen')}
                      </span>
                      {r.fields.faelligkeitsdatum && (
                        <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
                      )}
                      {r.fields.gesamtbetrag != null && (
                        <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)}</span>
                      )}
                    </>
                  ),
                  action: {
                    label: tx('Bezahlt'),
                    onClick: () => markRechnungBezahlt(r.record_id),
                  },
                };
              })}
              onItemClick={id => {
                const r = rechnungen.find(r => r.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Alle Rechnungen beglichen — keine offenen Posten.'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />
            {showKunden && (
              <WorkList
                title={tx('Kunden')}
                items={kunden.map(k => ({
                  id: k.record_id,
                  title: k.fields.kundenname ?? tx('Unbekannt'),
                  secondLine: k.fields.email
                    ? <span className="text-muted-foreground">{k.fields.email}</span>
                    : undefined,
                  action: {
                    label: tx('Bearbeiten'),
                    onClick: () => crud.kunden.openEdit(k),
                  },
                }))}
                onItemClick={id => {
                  const k = kunden.find(k => k.record_id === id);
                  if (k) crud.kunden.openDetail(k);
                }}
                empty={{
                  text: tx('Noch keine Kunden — lege deinen ersten Kunden an.'),
                  action: { label: tx('Neuer Kunde'), onClick: () => crud.kunden.openCreate({}) },
                }}
              />
            )}
            <WorkList
              title={tx('Letzte Zeiterfassung')}
              items={letzteZeit.map(z => {
                const enriched = enrichedZeiterfassung.find(ez => ez.record_id === z.record_id);
                return {
                  id: z.record_id,
                  title: enriched?.beraterName || tx('Berater'),
                  secondLine: (
                    <>
                      <span className="text-muted-foreground">{enriched?.projektName || tx('Projekt')}</span>
                      {z.fields.stunden != null && (
                        <span className="text-muted-foreground"> · {z.fields.stunden} h</span>
                      )}
                      {z.fields.datum && (
                        <span className="text-muted-foreground"> · {formatDate(z.fields.datum)}</span>
                      )}
                    </>
                  ),
                };
              })}
              onItemClick={id => {
                const z = zeiterfassung.find(z => z.record_id === id);
                if (z) crud.zeiterfassung.openDetail(z);
              }}
              empty={{
                text: tx('Noch keine Zeiteinträge — erfasse deine ersten Stunden.'),
                action: { label: tx('Zeit erfassen'), onClick: () => crud.zeiterfassung.openCreate({ datum: today }) },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
