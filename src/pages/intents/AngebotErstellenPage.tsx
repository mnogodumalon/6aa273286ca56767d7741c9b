/**
 * Angebot erstellen — 3-Schritt-Wizard.
 * Steps: 1) Kunde wählen (+ optional Projekt) → 2) Angebotsdetails eintragen →
 *        3) Kosten & Zeitrahmen festlegen → Angebot anlegen.
 * Reads: kunden, projekte. Writes: angebote (createAngeboteEntry).
 * Composes: IntentWizardShell, EntitySelectStep, StatusBadge.
 */

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { IconUser, IconBriefcase, IconFileText, IconCurrencyEuro, IconCircleCheck } from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Kunden, Projekte } from '@/types/app';
import { tx } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const ANGEBOTSTYP_OPTIONS = LOOKUP_OPTIONS['angebote']?.['angebotstyp'] ?? [];
const KOSTENTYP_OPTIONS = LOOKUP_OPTIONS['angebote']?.['kostentyp'] ?? [];
const KUNDENTYP_OPTIONS = LOOKUP_OPTIONS['kunden']?.['kundentyp'] ?? [];

export default function AngebotErstellenPage() {
  const { kunden, projekte, angebote, loading, error, fetchAll } = useDashboardData();

  // Step management
  const [step, setStep] = useState(1);

  // Step 1: Kunde + Projekt
  const [selectedKunde, setSelectedKunde] = useState<Kunden | null>(null);
  const [selectedProjektId, setSelectedProjektId] = useState<string>('');

  // New Kunde mini-form
  const [showCreateKunde, setShowCreateKunde] = useState(false);
  const [newKundenname, setNewKundenname] = useState('');
  const [newKundentypKey, setNewKundentypKey] = useState('');
  const [newKundeEmail, setNewKundeEmail] = useState('');
  const [createKundeLoading, setCreateKundeLoading] = useState(false);

  // Step 2: Angebotsdetails
  const [angebotsnummer, setAngebotsnummer] = useState('');
  const [angebotsjahr, setAngebotsjahr] = useState(() => format(new Date(), 'yyyy'));
  const [angebotstypKey, setAngebotstypKey] = useState('');
  const [angebotsdatum, setAngebotsdatum] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [gueltigBis, setGueltigBis] = useState('');
  const [angebotsbeschreibung, setAngebotsbeschreibung] = useState('');
  const [leistungspositionen, setLeistungspositionen] = useState('');
  const [anmerkungen, setAnmerkungen] = useState('');

  // Step 3: Kosten + Zeitrahmen
  const [kostentypKey, setKostentypKey] = useState('');
  const [kostenbetrag, setKostenbetrag] = useState('');
  const [kostenBeschreibung, setKostenBeschreibung] = useState('');
  const [zeitrahmenAnfang, setZeitrahmenAnfang] = useState('');
  const [zeitrahmenEnde, setZeitrahmenEnde] = useState('');
  const [dauer, setDauer] = useState('');

  // Submit state
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdAngebotId, setCreatedAngebotId] = useState<string | null>(null);

  // Projekte filtered to selected Kunde with status akquise or in_bearbeitung
  const filteredProjekte = useMemo<Projekte[]>(() => {
    if (!selectedKunde) return [];
    return projekte.filter(p => {
      if (!p.fields.kunde) return false;
      // Match by record URL containing the kunde record_id
      const matchesKunde = p.fields.kunde.includes(selectedKunde.record_id);
      const status = p.fields.status?.key;
      return matchesKunde && (status === 'akquise' || status === 'in_bearbeitung');
    });
  }, [projekte, selectedKunde]);

  // Auto-generate Angebotsnummer when type is selected and field is still empty
  useEffect(() => {
    if (!angebotstypKey || angebotsnummer) return;
    const TYPKUERZEL: Record<string, string> = {
      dienstleistung: 'DL',
      projekt: 'PROJ',
      wartung: 'WAR',
      schulung: 'SCH',
      sonstiges: 'SON',
    };
    const kuerzel = TYPKUERZEL[angebotstypKey] ?? angebotstypKey.slice(0, 3).toUpperCase();
    const existingThisYear = angebote.filter(a => a.fields.angebotsjahr === angebotsjahr);
    const nr = String(existingThisYear.length + 1).padStart(3, '0');
    setAngebotsnummer(`${angebotsjahr}-${kuerzel}-${nr}`);
  }, [angebotstypKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateKunde = async () => {
    if (!newKundenname.trim()) return;
    setCreateKundeLoading(true);
    try {
      const result = await LivingAppsService.createKundenEntry({
        kundenname: newKundenname,
        kundentyp: newKundentypKey || undefined,
        email: newKundeEmail || undefined,
      });
      await fetchAll();
      setShowCreateKunde(false);
      setNewKundenname('');
      setNewKundentypKey('');
      setNewKundeEmail('');
      // Auto-select newly created kunde
      const newKunde = kunden.find(k => k.record_id === result.record_id);
      if (newKunde) {
        setSelectedKunde(newKunde);
        setSelectedProjektId('');
        setStep(2);
      }
    } finally {
      setCreateKundeLoading(false);
    }
  };

  const handleKundeSelect = (id: string) => {
    const k = kunden.find(k => k.record_id === id) ?? null;
    setSelectedKunde(k);
    setSelectedProjektId('');
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!angebotsnummer.trim() || !angebotstypKey || !angebotsdatum) return;
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedKunde) return;
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      let aid = createdAngebotId;
      if (!aid) {
        const result = await LivingAppsService.createAngeboteEntry({
          angebotsnummer: angebotsnummer || undefined,
          angebotsjahr: angebotsjahr || undefined,
          angebotstyp: angebotstypKey || undefined,
          angebotsdatum: angebotsdatum || undefined,
          gueltig_bis: gueltigBis || undefined,
          angebotsbeschreibung: angebotsbeschreibung || undefined,
          leistungspositionen: leistungspositionen || undefined,
          anmerkungen: anmerkungen || undefined,
          kostentyp: kostentypKey || undefined,
          kostenbetrag: kostenbetrag ? Number(kostenbetrag) : undefined,
          kosten_beschreibung: kostenBeschreibung || undefined,
          zeitrahmen_anfang: zeitrahmenAnfang || undefined,
          zeitrahmen_ende: zeitrahmenEnde || undefined,
          dauer: dauer || undefined,
          kunde: createRecordUrl(APP_IDS.KUNDEN, selectedKunde.record_id),
          projekt: selectedProjektId
            ? createRecordUrl(APP_IDS.PROJEKTE, selectedProjektId)
            : undefined,
        });
        aid = result.record_id;
        setCreatedAngebotId(aid);
      }
      await fetchAll();
      setStep(4);
    } catch (e) {
      setSubmitError(tx('Das Angebot konnte nicht gespeichert werden. Bitte erneut versuchen.'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedKunde(null);
    setSelectedProjektId('');
    setAngebotsnummer('');
    setAngebotsjahr(format(new Date(), 'yyyy'));
    setAngebotstypKey('');
    setAngebotsdatum(format(new Date(), 'yyyy-MM-dd'));
    setGueltigBis('');
    setAngebotsbeschreibung('');
    setLeistungspositionen('');
    setAnmerkungen('');
    setKostentypKey('');
    setKostenbetrag('');
    setKostenBeschreibung('');
    setZeitrahmenAnfang('');
    setZeitrahmenEnde('');
    setDauer('');
    setSubmitError(null);
    setCreatedAngebotId(null);
  };

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      subtitle={tx('Schritt für Schritt zum fertigen Angebot')}
      steps={[
        { label: tx('Kunde') },
        { label: tx('Details') },
        { label: tx('Kosten') },
        { label: tx('Fertig') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Kunde wählen ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <EntitySelectStep
            items={kunden.map(k => ({
              id: k.record_id,
              title: k.fields.kundenname ?? k.record_id,
              subtitle: [k.fields.email, k.fields.telefon].filter(Boolean).join(' · ') || undefined,
              status: k.fields.kundentyp
                ? { key: k.fields.kundentyp.key, label: k.fields.kundentyp.label }
                : undefined,
              icon: <IconUser size={20} className="text-primary" />,
            }))}
            onSelect={handleKundeSelect}
            createLabel={tx('Neuen Kunden anlegen')}
            onCreateNew={() => setShowCreateKunde(true)}
            searchPlaceholder={tx('Kunden suchen …')}
            emptyText={tx('Kein Kunde gefunden')}
            createDialog={showCreateKunde && (
              <div className="rounded-2xl border p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">{tx('Neuen Kunden anlegen')}</p>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tx('Kundenname')} *</Label>
                  <Input
                    value={newKundenname}
                    onChange={e => setNewKundenname(e.target.value)}
                    placeholder={tx('Firmenname oder vollständiger Name')}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tx('Kundentyp')}</Label>
                  <Select value={newKundentypKey || 'none'} onValueChange={v => setNewKundentypKey(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={tx('Typ wählen …')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Kein Typ')}</SelectItem>
                      {KUNDENTYP_OPTIONS.map(o => (
                        <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tx('E-Mail')}</Label>
                  <Input
                    type="email"
                    value={newKundeEmail}
                    onChange={e => setNewKundeEmail(e.target.value)}
                    placeholder={tx('kunde@beispiel.de')}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    disabled={!newKundenname.trim() || createKundeLoading}
                    onClick={handleCreateKunde}
                  >
                    {createKundeLoading ? tx('Wird angelegt …') : tx('Anlegen & wählen')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateKunde(false)}>
                    {tx('Abbrechen')}
                  </Button>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* ── Step 2: Angebotsdetails ──────────────────────────────────────── */}
      {step === 2 && (
        selectedKunde ? (
          <div className="space-y-6">
            {/* Kunde-Info + optionale Projektauswahl */}
            <Card className="bg-secondary/40">
              <CardContent className="pt-4 pb-3 space-y-3">
                <div className="flex items-center gap-2">
                  <IconUser size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{selectedKunde.fields.kundenname}</span>
                  {selectedKunde.fields.kundentyp && (
                    <StatusBadge statusKey={selectedKunde.fields.kundentyp.key} label={selectedKunde.fields.kundentyp.label} />
                  )}
                </div>

                {filteredProjekte.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{tx('Projekt zuordnen')} ({tx('optional')})</Label>
                    <Select value={selectedProjektId || 'none'} onValueChange={v => setSelectedProjektId(v === 'none' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={tx('Kein Projekt')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{tx('Kein Projekt')}</SelectItem>
                        {filteredProjekte.map(p => (
                          <SelectItem key={p.record_id} value={p.record_id}>
                            {p.fields.projektkennung ?? p.record_id}
                            {p.fields.status ? ` · ${p.fields.status.label}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Angebotsdetails-Formular */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{tx('Angebotsnummer')} *</Label>
                <Input
                  value={angebotsnummer}
                  onChange={e => setAngebotsnummer(e.target.value)}
                  placeholder={tx('z. B. ANG-2026-001')}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{tx('Jahr')}</Label>
                <Input
                  value={angebotsjahr}
                  onChange={e => setAngebotsjahr(e.target.value)}
                  placeholder="2026"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{tx('Angebotstyp')} *</Label>
                <Select value={angebotstypKey || 'none'} onValueChange={v => setAngebotstypKey(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={tx('Typ wählen …')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tx('Kein Typ')}</SelectItem>
                    {ANGEBOTSTYP_OPTIONS.map(o => (
                      <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{tx('Angebotsdatum')} *</Label>
                <Input
                  type="date"
                  value={angebotsdatum}
                  onChange={e => setAngebotsdatum(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{tx('Gültig bis')}</Label>
                <Input
                  type="date"
                  value={gueltigBis}
                  onChange={e => setGueltigBis(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{tx('Angebotsbeschreibung')}</Label>
              <Textarea
                value={angebotsbeschreibung}
                onChange={e => setAngebotsbeschreibung(e.target.value)}
                placeholder={tx('Kurze Zusammenfassung des Angebots …')}
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{tx('Leistungspositionen')}</Label>
              <Textarea
                value={leistungspositionen}
                onChange={e => setLeistungspositionen(e.target.value)}
                placeholder={tx('Einzelne Positionen auflisten …')}
                rows={4}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{tx('Anmerkungen')}</Label>
              <Textarea
                value={anmerkungen}
                onChange={e => setAnmerkungen(e.target.value)}
                placeholder={tx('Optionale Hinweise …')}
                rows={2}
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleStep2Next}
                disabled={!angebotsnummer.trim() || !angebotstypKey || !angebotsdatum}
                className="flex items-center gap-2"
              >
                <IconBriefcase size={16} className="shrink-0" />
                {tx('Weiter zu Kosten & Zeitrahmen')}
              </Button>
              <Button variant="outline" onClick={() => setStep(1)}>
                {tx('Zurück')}
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

      {/* ── Step 3: Kosten & Zeitrahmen ─────────────────────────────────── */}
      {step === 3 && (
        selectedKunde ? (
          <div className="space-y-6">
            {/* Zusammenfassung bisheriger Schritte */}
            <Card className="bg-secondary/40">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <IconFileText size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{angebotsnummer}</p>
                    <p className="text-xs text-muted-foreground">
                      {ANGEBOTSTYP_OPTIONS.find(o => o.key === angebotstypKey)?.label ?? angebotstypKey}
                      {' · '}
                      {tx('Kunde')}: {selectedKunde.fields.kundenname}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kosten */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <IconCurrencyEuro size={16} className="shrink-0" />
                {tx('Kostenkalkulation')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tx('Kostentyp')}</Label>
                  <Select value={kostentypKey || 'none'} onValueChange={v => setKostentypKey(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={tx('Typ wählen …')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Kein Typ')}</SelectItem>
                      {KOSTENTYP_OPTIONS.map(o => (
                        <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tx('Kostenbetrag (€)')}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={kostenbetrag}
                    onChange={e => setKostenbetrag(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{tx('Kostenbeschreibung')}</Label>
                <Textarea
                  value={kostenBeschreibung}
                  onChange={e => setKostenBeschreibung(e.target.value)}
                  placeholder={tx('Details zur Kostenstruktur …')}
                  rows={2}
                />
              </div>
            </div>

            {/* Zeitrahmen */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">{tx('Zeitrahmen')}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tx('Projektstart')}</Label>
                  <Input
                    type="date"
                    value={zeitrahmenAnfang}
                    onChange={e => setZeitrahmenAnfang(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tx('Projektende')}</Label>
                  <Input
                    type="date"
                    value={zeitrahmenEnde}
                    onChange={e => setZeitrahmenEnde(e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">{tx('Dauer (Beschreibung)')}</Label>
                  <Input
                    value={dauer}
                    onChange={e => setDauer(e.target.value)}
                    placeholder={tx('z. B. 3 Monate, 6 Wochen …')}
                  />
                </div>
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleSubmit}
                disabled={submitLoading}
                className="flex items-center gap-2"
              >
                <IconFileText size={16} className="shrink-0" />
                {submitLoading ? tx('Angebot wird angelegt …') : tx('Angebot anlegen')}
              </Button>
              <Button variant="outline" onClick={() => setStep(2)}>
                {tx('Zurück')}
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

      {/* ── Step 4: Fertig ──────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="flex flex-col items-center text-center py-12 space-y-6">
          <div className="rounded-full bg-primary/10 p-4">
            <IconCircleCheck size={48} className="text-primary" stroke={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {tx('Angebot erfolgreich angelegt')}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {tx('Das Angebot')} <strong>{angebotsnummer}</strong> {tx('wurde für')} <strong>{selectedKunde?.fields.kundenname}</strong> {tx('erstellt.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={handleReset} variant="outline">
              {tx('Neues Angebot erstellen')}
            </Button>
            <a href="#/">
              <Button>
                {tx('Zurück zum Dashboard')}
              </Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
