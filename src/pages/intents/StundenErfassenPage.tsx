/**
 * Stunden erfassen — 3-Schritt-Wizard zum Anlegen eines Zeiterfassungseintrags.
 * Steps: 1) Berater/in wählen → 2) Projekt + Leistung wählen → 3) Stunden & Details eingeben.
 * Reads: beraterInnen (filter: aktiv), projekte (filter: in_bearbeitung|akquise), leistungskatalog.
 * Writes: zeiterfassung (createZeiterfassungEntry).
 * Composes: IntentWizardShell, EntitySelectStep, StatusBadge.
 */

import { useState, useCallback } from 'react';
import { format, getMonth } from 'date-fns';
import { tx } from '@/i18n';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { BeraterInnen, Projekte, Leistungskatalog } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconUser, IconBriefcase, IconClock, IconCheck, IconPlus } from '@tabler/icons-react';

// Map JS month index (0-based) to zeiterfassung monat lookup key
const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
];

const MONAT_OPTIONS = LOOKUP_OPTIONS['zeiterfassung']?.['monat'] ?? [];
// BERATER/INNEN app id — bracket notation for the slash key
const BERATER_APP_ID = APP_IDS['BERATER/INNEN' as keyof typeof APP_IDS] ?? '6aa2732961edefefe81f0158';

export default function StundenErfassenPage() {
  const { beraterInnen, projekte, leistungskatalog, loading, error, fetchAll } = useDashboardData();

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayMonthKey = MONTH_KEYS[getMonth(today)] ?? 'januar';
  const todayJahr = format(today, 'yyyy');

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: Berater selection
  const [selectedBerater, setSelectedBerater] = useState<BeraterInnen | null>(null);

  // Step 2: Projekt + Leistung selection
  const [selectedProjekt, setSelectedProjekt] = useState<Projekte | null>(null);
  const [selectedLeistungId, setSelectedLeistungId] = useState<string>('none');

  // Step 3: Details
  const [datum, setDatum] = useState(todayStr);
  const [stunden, setStunden] = useState('');
  const [monatKey, setMonatKey] = useState(todayMonthKey);
  const [jahr, setJahr] = useState(todayJahr);
  const [taetigkeitsbeschreibung, setTaetigkeitsbeschreibung] = useState('');
  const [verrechenbar, setVerrechenbar] = useState(false);
  const [notizen, setNotizen] = useState('');

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Filtered data
  const aktiveBerater = beraterInnen.filter(b => b.fields.status?.key === 'aktiv');
  const aktiveProjekte = projekte.filter(p =>
    ['in_bearbeitung', 'akquise'].includes(p.fields.status?.key ?? '')
  );

  // Derive monat key from datum change
  const handleDatumChange = useCallback((val: string) => {
    setDatum(val);
    if (val) {
      const parsed = new Date(val + 'T00:00:00');
      const mKey = MONTH_KEYS[getMonth(parsed)];
      if (mKey) setMonatKey(mKey);
      setJahr(format(parsed, 'yyyy'));
    }
  }, []);

  const handleSubmit = async () => {
    if (!selectedBerater || !selectedProjekt) return;
    const stundenNum = parseFloat(stunden);
    if (isNaN(stundenNum) || stundenNum <= 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createZeiterfassungEntry({
        datum,
        stunden: stundenNum,
        monat: monatKey,
        jahr,
        taetigkeitsbeschreibung: taetigkeitsbeschreibung || undefined,
        verrechenbar,
        notizen: notizen || undefined,
        berater: createRecordUrl(BERATER_APP_ID, selectedBerater.record_id),
        projekt: createRecordUrl(APP_IDS.PROJEKTE, selectedProjekt.record_id),
        leistung: selectedLeistungId && selectedLeistungId !== 'none'
          ? createRecordUrl(APP_IDS.LEISTUNGSKATALOG, selectedLeistungId)
          : undefined,
      });
      await fetchAll();
      setDone(true);
    } catch (e) {
      setSubmitError(tx('Fehler beim Speichern. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedBerater(null);
    setSelectedProjekt(null);
    setSelectedLeistungId('none');
    setDatum(format(new Date(), 'yyyy-MM-dd'));
    setMonatKey(MONTH_KEYS[getMonth(new Date())] ?? 'januar');
    setJahr(format(new Date(), 'yyyy'));
    setStunden('');
    setTaetigkeitsbeschreibung('');
    setVerrechenbar(false);
    setNotizen('');
    setSubmitError(null);
    setDone(false);
  };

  if (done) {
    return (
      <IntentWizardShell
        title={tx('Stunden erfassen')}
        subtitle={tx('Zeiterfassungseintrag wurde gespeichert')}
        steps={[
          { label: tx('Berater/in') },
          { label: tx('Projekt') },
          { label: tx('Stunden') },
        ]}
        currentStep={3}
        onStepChange={setStep}
        loading={loading}
        error={error}
        onRetry={fetchAll}
      >
        <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <IconCheck size={32} className="text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {tx('Stunden erfolgreich erfasst')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedBerater
                ? tx(tx`${selectedBerater.fields.vorname ?? ''} ${selectedBerater.fields.nachname ?? ''} · ${stunden} Std. · ${selectedProjekt?.fields.projektkennung ?? ''}`)
                : ''}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleReset}>
              <IconPlus size={16} className="shrink-0 mr-2" />
              {tx('Neue Stunden erfassen')}
            </Button>
            <a href="#/">
              <Button variant="outline">{tx('Zurück zum Dashboard')}</Button>
            </a>
          </div>
        </div>
      </IntentWizardShell>
    );
  }

  return (
    <IntentWizardShell
      title={tx('Stunden erfassen')}
      subtitle={tx('Zeiterfassungseintrag in 3 Schritten anlegen')}
      steps={[
        { label: tx('Berater/in') },
        { label: tx('Projekt') },
        { label: tx('Stunden') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Berater wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={aktiveBerater.map(b => ({
            id: b.record_id,
            title: `${b.fields.vorname ?? ''} ${b.fields.nachname ?? ''}`.trim() || b.record_id,
            subtitle: b.fields.email_beruflich ?? b.fields.telefon ?? undefined,
            status: b.fields.status
              ? { key: b.fields.status.key, label: b.fields.status.label }
              : undefined,
            stats: b.fields.stunden_aktueller_monat != null
              ? [{ label: tx('Std. diesen Monat'), value: String(b.fields.stunden_aktueller_monat) }]
              : undefined,
            icon: <IconUser size={20} className="text-primary" />,
          }))}
          onSelect={(id) => {
            const found = aktiveBerater.find(b => b.record_id === id) ?? null;
            setSelectedBerater(found);
            setStep(2);
          }}
          searchPlaceholder={tx('Berater/in suchen …')}
          emptyText={tx('Keine aktiven Berater/innen gefunden')}
          emptyIcon={<IconUser size={32} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2: Projekt + Leistung wählen */}
      {step === 2 && (
        selectedBerater ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconUser size={14} className="shrink-0" />
              <span>{tx('Berater/in:')} <span className="font-medium text-foreground">{selectedBerater.fields.vorname} {selectedBerater.fields.nachname}</span></span>
            </div>

            <EntitySelectStep
              items={aktiveProjekte.map(p => ({
                id: p.record_id,
                title: p.fields.projektkennung ?? p.record_id,
                subtitle: p.fields.projektart?.label ?? undefined,
                status: p.fields.status
                  ? { key: p.fields.status.key, label: p.fields.status.label }
                  : undefined,
                icon: <IconBriefcase size={20} className="text-primary" />,
              }))}
              onSelect={(id) => {
                const found = aktiveProjekte.find(p => p.record_id === id) ?? null;
                setSelectedProjekt(found);
              }}
              searchPlaceholder={tx('Projekt suchen …')}
              emptyText={tx('Keine aktiven Projekte gefunden')}
              emptyIcon={<IconBriefcase size={32} className="text-muted-foreground" />}
            />

            {/* Leistung optional */}
            {selectedProjekt && (
              <div className="rounded-2xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{tx('Projekt gewählt:')}</span>
                  <StatusBadge
                    statusKey={selectedProjekt.fields.status?.key}
                    label={selectedProjekt.fields.status?.label}
                  />
                </div>
                <p className="text-sm text-muted-foreground font-medium">{selectedProjekt.fields.projektkennung}</p>

                <div className="space-y-1.5">
                  <Label className="text-sm">{tx('Leistung (optional)')}</Label>
                  <Select
                    value={selectedLeistungId}
                    onValueChange={setSelectedLeistungId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tx('Leistung wählen …')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Keine Leistung')}</SelectItem>
                      {leistungskatalog.map(l => (
                        <SelectItem key={l.record_id} value={l.record_id}>
                          {l.fields.leistungsbezeichnung ?? l.record_id}
                          {l.fields.leistungstyp ? ` · ${l.fields.leistungstyp.label}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  onClick={() => setStep(3)}
                >
                  {tx('Weiter zu Schritt 3')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}

      {/* Step 3: Stunden + Details */}
      {step === 3 && (
        selectedBerater && selectedProjekt ? (
          <div className="space-y-6">
            {/* Context summary */}
            <div className="rounded-2xl border bg-secondary/40 p-4 space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <IconUser size={14} className="shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{tx('Berater/in:')}</span>
                <span className="font-medium">{selectedBerater.fields.vorname} {selectedBerater.fields.nachname}</span>
              </div>
              <div className="flex items-center gap-2">
                <IconBriefcase size={14} className="shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{tx('Projekt:')}</span>
                <span className="font-medium">{selectedProjekt.fields.projektkennung}</span>
              </div>
              {selectedLeistungId && selectedLeistungId !== 'none' && (() => {
                const l = leistungskatalog.find(x => x.record_id === selectedLeistungId);
                return l ? (
                  <div className="flex items-center gap-2">
                    <IconClock size={14} className="shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{tx('Leistung:')}</span>
                    <span className="font-medium">{l.fields.leistungsbezeichnung}</span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="datum">{tx('Datum')}</Label>
                  <Input
                    id="datum"
                    type="date"
                    value={datum}
                    onChange={e => handleDatumChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stunden">{tx('Stunden')}</Label>
                  <Input
                    id="stunden"
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={stunden}
                    onChange={e => setStunden(e.target.value)}
                    placeholder="z.B. 7.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="monat">{tx('Monat')}</Label>
                  <Select value={monatKey} onValueChange={setMonatKey}>
                    <SelectTrigger id="monat" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONAT_OPTIONS.map(m => (
                        <SelectItem key={m.key} value={m.key}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jahr">{tx('Jahr')}</Label>
                  <Input
                    id="jahr"
                    type="text"
                    value={jahr}
                    onChange={e => setJahr(e.target.value)}
                    placeholder="z.B. 2026"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="taetigkeit">{tx('Tätigkeitsbeschreibung')}</Label>
                <Textarea
                  id="taetigkeit"
                  value={taetigkeitsbeschreibung}
                  onChange={e => setTaetigkeitsbeschreibung(e.target.value)}
                  placeholder={tx('Was wurde heute gemacht?')}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3 py-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={verrechenbar}
                  onClick={() => setVerrechenbar(v => !v)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    verrechenbar ? 'bg-primary border-primary' : 'border-input bg-background'
                  }`}
                >
                  {verrechenbar && <IconCheck size={12} className="text-primary-foreground" />}
                </button>
                <Label
                  htmlFor="verrechenbar"
                  className="cursor-pointer"
                  onClick={() => setVerrechenbar(v => !v)}
                >
                  {tx('Verrechenbar')}
                </Label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notizen">{tx('Notizen')}</Label>
                <Textarea
                  id="notizen"
                  value={notizen}
                  onChange={e => setNotizen(e.target.value)}
                  placeholder={tx('Optionale interne Notizen')}
                  rows={2}
                />
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="w-full sm:w-auto"
                disabled={submitting || !datum || !stunden || parseFloat(stunden) <= 0}
                onClick={handleSubmit}
              >
                <IconClock size={16} className="shrink-0 mr-2" />
                {submitting ? tx('Wird gespeichert …') : tx('Stunden speichern')}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setStep(2)}
                disabled={submitting}
              >
                {tx('Zurück')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Auswahl aus Schritt 1 und 2.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
