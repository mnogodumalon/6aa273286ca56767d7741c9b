/**
 * Rechnung erstellen — 3-Schritt-Wizard.
 * Steps: 1) Projekt + Kunde wählen → 2) Zeiterfassung prüfen + Abrechnungszeitraum wählen → 3) Rechnungsdetails eintragen & anlegen.
 * Reads: projekte, kunden, zeiterfassung, beraterInnen. Writes: rechnungen (createRechnungenEntry).
 * Composes: IntentWizardShell, EntitySelectStep, StatusBadge.
 */
import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { IconFileInvoice, IconClock, IconUser, IconCalendar, IconCheck } from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Projekte, Zeiterfassung } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { tx } from '@/i18n';

const RECHNUNGSSTATUS_OPTIONS = LOOKUP_OPTIONS['rechnungen']?.['rechnungsstatus'] ?? [];
const ABRECHNUNGSMONAT_OPTIONS = LOOKUP_OPTIONS['rechnungen']?.['abrechnungsmonat'] ?? [];

export default function RechnungErstellenPage() {
  const { projekte, kunden, zeiterfassung, rechnungen, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);

  // Step 1 state
  const [selectedProjekt, setSelectedProjekt] = useState<Projekte | null>(null);
  const [selectedKundeId, setSelectedKundeId] = useState<string | null>(null);

  // Step 2 state
  const [abrechnungsmonat, setAbrechnungsmonat] = useState<string>(ABRECHNUNGSMONAT_OPTIONS[0]?.key ?? 'januar');
  const [abrechnungsjahr, setAbrechnungsjahr] = useState<string>(format(new Date(), 'yyyy'));

  // Step 3 state
  const [rechnungsnummer, setRechnungsnummer] = useState('');
  const [rechnungsdatum, setRechnungsdatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [faelligkeitsdatum, setFaelligkeitsdatum] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [rechnungsstatusKey, setRechnungsstatusKey] = useState<string>(RECHNUNGSSTATUS_OPTIONS[0]?.key ?? 'offen');
  const [nettobetrag, setNettobetrag] = useState('');
  const [mehrwertsteuer, setMehrwertsteuer] = useState('');
  const [gesamtbetrag, setGesamtbetrag] = useState('');
  const [leistungspositionen, setLeistungspositionen] = useState('');
  const [notizen, setNotizen] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdRechnungId, setCreatedRechnungId] = useState<string | null>(null);

  // Auto-generate Rechnungsnummer when reaching step 3 and field is still empty
  useEffect(() => {
    if (step !== 3 || rechnungsnummer) return;
    const year = rechnungsdatum.slice(0, 4);
    const nr = String(rechnungen.length + 1).padStart(3, '0');
    setRechnungsnummer(`RE-${year}-${nr}`);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived: active projects only
  const aktiveProjekte = projekte.filter(p => p.fields.status?.key === 'in_bearbeitung');

  // Derived: billable time entries for selected project
  const projektZeiterfassung: Zeiterfassung[] = selectedProjekt
    ? zeiterfassung.filter(
        ze => extractRecordId(ze.fields.projekt) === selectedProjekt.record_id && ze.fields.verrechenbar === true
      )
    : [];

  const gesamtStunden = projektZeiterfassung.reduce((sum, ze) => sum + (ze.fields.stunden ?? 0), 0);

  // Derive unique berater IDs from filtered time entries
  const uniqueBeraterIds = Array.from(
    new Set(
      projektZeiterfassung
        .map(ze => extractRecordId(ze.fields.berater))
        .filter((id): id is string => id !== null)
    )
  );

  // Step 1 handlers
  function handleProjektSelect(id: string) {
    const projekt = projekte.find(p => p.record_id === id) ?? null;
    setSelectedProjekt(projekt);
    if (projekt) {
      const kundeId = extractRecordId(projekt.fields.kunde);
      setSelectedKundeId(kundeId);
    } else {
      setSelectedKundeId(null);
    }
    setStep(2);
  }

  // Step 3 submit
  async function handleSubmit() {
    if (!selectedProjekt || !selectedKundeId) return;
    if (!rechnungsnummer || !gesamtbetrag) return;

    let rid = createdRechnungId;
    if (rid) {
      // already created — navigate to success
      setStep(4);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const uniqueBeraterUrls = uniqueBeraterIds.map(id =>
        createRecordUrl(APP_IDS['BERATER/INNEN'], id)
      );

      const result = await LivingAppsService.createRechnungenEntry({
        rechnungsnummer,
        rechnungsdatum,
        faelligkeitsdatum: faelligkeitsdatum || undefined,
        rechnungsstatus: rechnungsstatusKey,
        abrechnungsmonat,
        abrechnungsjahr,
        nettobetrag: nettobetrag ? parseFloat(nettobetrag) : undefined,
        mehrwertsteuer: mehrwertsteuer ? parseFloat(mehrwertsteuer) : undefined,
        gesamtbetrag: parseFloat(gesamtbetrag),
        leistungspositionen: leistungspositionen || undefined,
        notizen: notizen || undefined,
        kunde: createRecordUrl(APP_IDS.KUNDEN, selectedKundeId),
        projekt: createRecordUrl(APP_IDS.PROJEKTE, selectedProjekt.record_id),
        berater: uniqueBeraterUrls.length > 0 ? uniqueBeraterUrls : undefined,
      });

      rid = result.record_id;
      setCreatedRechnungId(rid);
      await fetchAll();
      setStep(4);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : tx('Fehler beim Anlegen der Rechnung'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setStep(1);
    setSelectedProjekt(null);
    setSelectedKundeId(null);
    setAbrechnungsmonat(ABRECHNUNGSMONAT_OPTIONS[0]?.key ?? 'januar');
    setAbrechnungsjahr(format(new Date(), 'yyyy'));
    setRechnungsnummer('');
    setRechnungsdatum(format(new Date(), 'yyyy-MM-dd'));
    setFaelligkeitsdatum(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
    setRechnungsstatusKey(RECHNUNGSSTATUS_OPTIONS[0]?.key ?? 'offen');
    setNettobetrag('');
    setMehrwertsteuer('');
    setGesamtbetrag('');
    setLeistungspositionen('');
    setNotizen('');
    setCreatedRechnungId(null);
    setSubmitError(null);
  }

  const kunde = selectedKundeId ? kunden.find(k => k.record_id === selectedKundeId) : null;

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      subtitle={tx('Projekt wählen, Zeiterfassung prüfen und Rechnung anlegen')}
      steps={[
        { label: tx('Projekt') },
        { label: tx('Zeiterfassung') },
        { label: tx('Rechnungsdetails') },
        { label: tx('Fertig') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Projekt wählen */}
      {step === 1 && (
        <div className="space-y-4">
          <EntitySelectStep
            items={aktiveProjekte.map(p => {
              const kundeRec = (() => {
                const kid = extractRecordId(p.fields.kunde);
                return kid ? kunden.find(k => k.record_id === kid) : undefined;
              })();
              return {
                id: p.record_id,
                title: p.fields.projektkennung ?? p.record_id,
                subtitle: [
                  p.fields.projektart?.label,
                  kundeRec?.fields.kundenname,
                ].filter(Boolean).join(' · '),
                status: p.fields.status
                  ? { key: p.fields.status.key, label: p.fields.status.label }
                  : undefined,
                icon: <IconFileInvoice size={20} className="text-primary" />,
              };
            })}
            onSelect={handleProjektSelect}
            searchPlaceholder={tx('Projekt suchen …')}
            emptyText={tx('Keine aktiven Projekte gefunden')}
          />
        </div>
      )}

      {/* Step 2: Zeiterfassung prüfen */}
      {step === 2 && (
        selectedProjekt ? (
          <div className="space-y-6">
            {/* Context */}
            <div className="rounded-2xl border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2">
                <IconFileInvoice size={16} className="shrink-0 text-primary" />
                <span className="font-semibold text-sm">{selectedProjekt.fields.projektkennung}</span>
                {selectedProjekt.fields.status && (
                  <StatusBadge statusKey={selectedProjekt.fields.status.key} label={selectedProjekt.fields.status.label} />
                )}
              </div>
              {kunde && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconUser size={14} className="shrink-0" />
                  <span>{kunde.fields.kundenname}</span>
                </div>
              )}
            </div>

            {/* Abrechnungszeitraum */}
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm">{tx('Abrechnungszeitraum')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tx('Monat')}</label>
                  <Select value={abrechnungsmonat} onValueChange={setAbrechnungsmonat}>
                    <SelectTrigger>
                      <SelectValue placeholder={tx('Monat wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {ABRECHNUNGSMONAT_OPTIONS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tx('Jahr')}</label>
                  <Input
                    value={abrechnungsjahr}
                    onChange={e => setAbrechnungsjahr(e.target.value)}
                    placeholder="2024"
                  />
                </div>
              </div>
            </div>

            {/* Verrechenbare Zeiteinträge */}
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{tx('Verrechenbare Zeiterfassung')}</h3>
                <span className="text-sm font-semibold text-primary">
                  {gesamtStunden.toFixed(2)} {tx('Std.')}
                </span>
              </div>

              {projektZeiterfassung.length === 0 ? (
                <div className="text-center py-6 space-y-1">
                  <IconClock size={32} className="mx-auto text-muted-foreground" stroke={1.5} />
                  <p className="text-sm text-muted-foreground">{tx('Keine verrechenbaren Zeiteinträge für dieses Projekt')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projektZeiterfassung.map(ze => (
                    <div key={ze.record_id} className="flex items-start gap-3 py-2 border-b last:border-0">
                      <IconClock size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">
                            {ze.fields.datum ? formatDate(ze.fields.datum) : '–'}
                          </span>
                          <span className="text-sm font-semibold shrink-0">{ze.fields.stunden ?? 0} {tx('Std.')}</span>
                        </div>
                        {ze.fields.taetigkeitsbeschreibung && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {ze.fields.taetigkeitsbeschreibung}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {uniqueBeraterIds.length > 0 && (
                <div className="pt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <IconUser size={12} className="shrink-0" />
                  <span>
                    {uniqueBeraterIds.length} {tx('Berater/in einbezogen')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                {tx('Zurück')}
              </Button>
              <Button onClick={() => setStep(3)}>
                {tx('Weiter zu Rechnungsdetails')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}

      {/* Step 3: Rechnungsdetails */}
      {step === 3 && (
        selectedProjekt && selectedKundeId ? (
          <div className="space-y-6">
            {/* Context summary */}
            <div className="rounded-2xl border bg-secondary/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <IconFileInvoice size={16} className="shrink-0 text-primary" />
                <span className="font-semibold">{selectedProjekt.fields.projektkennung}</span>
                {kunde && <span className="text-muted-foreground">· {kunde.fields.kundenname}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <IconCalendar size={14} className="shrink-0" />
                <span>
                  {ABRECHNUNGSMONAT_OPTIONS.find(o => o.key === abrechnungsmonat)?.label} {abrechnungsjahr}
                  {' · '}
                  {gesamtStunden.toFixed(2)} {tx('verrechenbare Std.')}
                </span>
              </div>
            </div>

            {/* Form */}
            <div className="rounded-2xl border bg-card p-4 space-y-4">
              <h3 className="font-semibold text-sm">{tx('Rechnungsinformationen')}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tx('Rechnungsnummer')} *</label>
                  <Input
                    value={rechnungsnummer}
                    onChange={e => setRechnungsnummer(e.target.value)}
                    placeholder={tx('z. B. RE-2024-001')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tx('Rechnungsstatus')} *</label>
                  <Select value={rechnungsstatusKey} onValueChange={setRechnungsstatusKey}>
                    <SelectTrigger>
                      <SelectValue placeholder={tx('Status wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {RECHNUNGSSTATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tx('Rechnungsdatum')} *</label>
                  <Input
                    type="date"
                    value={rechnungsdatum}
                    onChange={e => setRechnungsdatum(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tx('Fälligkeitsdatum')}</label>
                  <Input
                    type="date"
                    value={faelligkeitsdatum}
                    onChange={e => setFaelligkeitsdatum(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 space-y-4">
              <h3 className="font-semibold text-sm">{tx('Beträge')}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tx('Nettobetrag (€)')}</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={nettobetrag}
                    onChange={e => setNettobetrag(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tx('MwSt. (%)')}</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={mehrwertsteuer}
                    onChange={e => setMehrwertsteuer(e.target.value)}
                    placeholder="19"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{tx('Gesamtbetrag (€)')} *</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={gesamtbetrag}
                    onChange={e => setGesamtbetrag(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 space-y-4">
              <h3 className="font-semibold text-sm">{tx('Details')}</h3>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{tx('Leistungspositionen')}</label>
                <Textarea
                  value={leistungspositionen}
                  onChange={e => setLeistungspositionen(e.target.value)}
                  placeholder={tx('Beschreibung der abgerechneten Leistungen …')}
                  rows={4}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{tx('Notizen')}</label>
                <Textarea
                  value={notizen}
                  onChange={e => setNotizen(e.target.value)}
                  placeholder={tx('Interne Notizen zur Rechnung …')}
                  rows={2}
                />
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>
                {tx('Zurück')}
              </Button>
              <Button
                disabled={!rechnungsnummer || !gesamtbetrag || submitting}
                onClick={handleSubmit}
              >
                {submitting ? tx('Wird angelegt …') : tx('Rechnung anlegen')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}

      {/* Step 4: Fertig */}
      {step === 4 && (
        <div className="flex flex-col items-center text-center py-12 space-y-6">
          <div className="rounded-full bg-primary/10 p-5">
            <IconCheck size={40} className="text-primary" stroke={2} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{tx('Rechnung wurde angelegt')}</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {tx('Die Rechnung')} <strong>{rechnungsnummer}</strong> {tx('wurde erfolgreich erstellt.')}
              {kunde && (
                <> {tx('Kunde')}: {kunde.fields.kundenname}.</>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleReset}>
              {tx('Neue Rechnung anlegen')}
            </Button>
            <a href="#/">
              <Button>{tx('Zurück zum Dashboard')}</Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
