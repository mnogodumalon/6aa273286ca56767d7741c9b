/**
 * Angebot annehmen — 4-Schritt-Wizard.
 * Steps: 1) Angebot wählen (Karten mit Grau-Zustand) → 2) Projekt anlegen (Formular mit Vorausfüllung)
 *        → 3) Team zuweisen (Projektleitung + Team) → 4) Zusammenfassung & anlegen.
 * Reads: angebote, projekte, kunden, berater/innen.
 * Writes: projekte (createProjekteEntry), berater/innen (updateBeraterInnenEntry × n), angebote (updateAngeboteEntry).
 * Composes: IntentWizardShell, WizardStep, StepNav, SummaryStep, SuccessStep, StatusBadge, ChoiceGroup, Field, Bound, DatePicker.
 */
import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { Field } from '@/components/blocks/Field';
import { Bound } from '@/components/blocks/Bound';
import { ChoiceGroup } from '@/components/blocks/ChoiceGroup';
import { DatePicker } from '@/components/DatePicker';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
  fieldNumber,
  fieldRef,
} from '@/lib/journey';
import type { JourneyRecord } from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { LivingAppsService, createRecordUrl, extractRecordIds } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { tx } from '@/i18n';
import { useEntityCrud } from '@/components/EntityCrud';
import { useDashboardData } from '@/hooks/useDashboardData';

const MONAT_KEYS = ['januar','februar','maerz','april','mai','juni','juli','august','september','oktober','november','dezember'] as const;

export default function AngebotAnnehmenPage() {
  const [step, setStep] = useState(1);
  const [selectedAngebot, setSelectedAngebot] = useState<JourneyRecord | null>(null);
  const [projektleitungId, setProjektleitungId] = useState<string | null>(null);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const prefillDoneRef = useRef(false);

  const data = useDashboardData({ omit: ['angebote', 'berater/innen'] });
  const crud = useEntityCrud(data);

  // Angebote via useRecordSearch — Karten-Auswahl in Schritt 1
  const angeboteSearch = useRecordSearch(servicePort, 'angebote', {
    searchFields: ['angebotsnummer', 'angebotsbeschreibung'],
    toItem: (r) => ({
      id: r.id,
      title: fieldText(r, 'angebotsbeschreibung') || fieldText(r, 'angebotsnummer'),
      subtitle: fieldText(r, 'angebotsnummer'),
      status: fieldLookup(r, 'angebotsstatus') ?? undefined,
    }),
  });

  // Berater/innen via useRecordSearch (nur aktive in Step 3)
  const beraterSearch = useRecordSearch(servicePort, 'berater/innen', {
    searchFields: ['nachname', 'vorname', 'email_beruflich'],
    filter: "r.v_status == 'aktiv'",
    where: (r) => fieldLookup(r, 'status')?.key === 'aktiv',
    toItem: (r) => ({
      id: r.id,
      title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
      subtitle: fieldText(r, 'email_beruflich'),
    }),
  });

  // Projekt-Formular
  const projektForm = useStepForm('projekte', {
    fields: ['projektkennung', 'projektnummer', 'projektart', 'projektstart_jahr', 'projektstart_monat',
             'status', 'ansprechpartner_kunde', 'budget', 'projektende', 'notizen', 'kunde'],
    steps: {
      projektkennung: 2, projektnummer: 2, projektart: 2, projektstart_jahr: 2,
      projektstart_monat: 2, ansprechpartner_kunde: 2, budget: 2, projektende: 2, notizen: 2,
      kunde: 2,
    },
    required: { status: false, projektleitung: false },
    messages: {
      projektkennung: tx('Bitte eine Projektkennung eingeben.'),
      projektnummer: tx('Bitte eine Projektnummer eingeben.'),
      projektart: tx('Bitte eine Projektart wählen.'),
      kunde: tx('Bitte einen Kunden aus dem Angebot übernehmen.'),
    },
  });

  // Vorausfüllung beim Öffnen von Schritt 2 — nur einmal
  useEffect(() => {
    if (step !== 2 || !selectedAngebot || prefillDoneRef.current) return;
    prefillDoneRef.current = true;

    const angebot = selectedAngebot;
    const kundeId = fieldRef(angebot, 'kunde');
    const kostenbetrag = fieldNumber(angebot, 'kostenbetrag');
    const angebotsnummer = fieldText(angebot, 'angebotsnummer');
    const now = new Date();
    const startJahr = format(now, 'yyyy');
    const startMonatKey = MONAT_KEYS[now.getMonth()];

    // Kunde als ID setzen — Plan baut URL via values
    if (kundeId) {
      const kundenRec0 = data.kundenMap?.get(kundeId);
      const kundeName0 = (kundenRec0?.fields?.kundenname as string | undefined) ?? kundeId;
      projektForm.set('kunde', kundeId, kundeName0);
    }
    if (kostenbetrag !== null) projektForm.set('budget', String(kostenbetrag));
    projektForm.set('projektstart_jahr', startJahr);
    projektForm.set('projektstart_monat', startMonatKey);
    projektForm.set('notizen', tx(tx`Angebot: ${angebotsnummer}`));

    // Ansprechpartner aus kundenMap
    if (kundeId) {
      const kundenRec = data.kundenMap?.get(kundeId);
      if (kundenRec) {
        const apVorname = (kundenRec.fields?.ap_vorname as string | undefined) ?? '';
        const apNachname = (kundenRec.fields?.ap_nachname as string | undefined) ?? '';
        const ap = `${apVorname} ${apNachname}`.trim();
        if (ap) projektForm.set('ansprechpartner_kunde', ap);
      }
    }

    // Projektnummer: Maximum aller vorhandenen + 1
    LivingAppsService.queryProjekte({ fields: ['projektnummer'] }).then((all) => {
      const max = all.reduce((m, p) => {
        const nr = typeof p.fields?.projektnummer === 'number' ? p.fields.projektnummer : 0;
        return Math.max(m, nr);
      }, 0);
      const nextNr = max + 1;
      projektForm.set('projektnummer', String(nextNr));

      // Projektkennung: YYYY-KKK-NNN
      const kundeId2 = fieldRef(angebot, 'kunde');
      const kundenRec = kundeId2 ? data.kundenMap?.get(kundeId2) : null;
      const kundenname = (kundenRec?.fields?.kundenname as string | undefined) ?? '';
      const kkkRaw = kundenname.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || kundenname.toUpperCase().slice(0, 3);
      const kkk = kkkRaw.padEnd(3, 'X').slice(0, 3);
      const nnn = String(nextNr).padStart(3, '0');
      projektForm.set('projektkennung', `${startJahr}-${kkk}-${nnn}`);
    }).catch(() => {
      projektForm.set('projektnummer', '1');
      projektForm.set('projektkennung', `${startJahr}-XXX-001`);
    });
  }, [step, selectedAngebot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Plan: Reihenfolge ist exakt wie in der Spezifikation — niemals ändern
  const submit = useJourneySubmit(servicePort, [
    {
      key: 'projekt',
      entity: 'projekte',
      form: projektForm,
      primary: true,
      values: () => {
        const angebot = selectedAngebot;
        if (!angebot) return {};
        const kundeId = fieldRef(angebot, 'kunde');
        return {
          status: 'in_bearbeitung',
          kunde: kundeId ? createRecordUrl(APP_IDS.KUNDEN, kundeId) : undefined,
          projektleitung: projektleitungId
            ? createRecordUrl(APP_IDS.BERATERINNEN, projektleitungId)
            : undefined,
        };
      },
    },
    {
      key: 'berater_aktualisieren',
      needs: ['projekt'],
      run: async ({ done }) => {
        const newProjektId = done['projekt'].id;
        const newProjektUrl = createRecordUrl(APP_IDS.PROJEKTE, newProjektId);
        const allBeraterIds = projektleitungId
          ? [projektleitungId, ...teamIds.filter(id => id !== projektleitungId)]
          : [...teamIds];
        for (const beraterId of allBeraterIds) {
          const rec = await LivingAppsService.getBeraterInnenEntry(beraterId);
          if (!rec) continue;
          const vorhandeneUrls = extractRecordIds(rec.fields?.projekte).map(id =>
            createRecordUrl(APP_IDS.PROJEKTE, id)
          );
          const merged = Array.from(new Set([...vorhandeneUrls, newProjektUrl]));
          await LivingAppsService.updateBeraterInnenEntry(beraterId, { projekte: merged });
        }
      },
    },
    {
      key: 'angebot_annehmen',
      needs: ['projekt'],
      run: async ({ done }) => {
        if (!selectedAngebot) return;
        const newProjektId = done['projekt'].id;
        return await LivingAppsService.updateAngeboteEntry(selectedAngebot.id, {
          angebotsstatus: 'angenommen',
          projekt: createRecordUrl(APP_IDS.PROJEKTE, newProjektId),
        });
      },
    },
  ], { draftKey: 'angebot-annehmen' });

  // Abgeleitete Werte für Karten in Schritt 1
  const projekteMap = data.projekteMap;
  const kundenMap = data.kundenMap;

  // Alle Angebote aus dem Search-Hook — filtern für Schritt-1-Anzeige
  const alleAngebote = angeboteSearch.records;

  const angeboteKarten = alleAngebote.filter(a => {
    const status = fieldLookup(a, 'angebotsstatus')?.key;
    const hatProjekt = Boolean(fieldRef(a, 'projekt'));
    // Ausblenden: Status angenommen/abgelehnt UND kein Projekt
    if ((status === 'angenommen' || status === 'abgelehnt') && !hatProjekt) return false;
    return true;
  });

  // Kundename ermitteln
  function kundeNameFuer(angebot: JourneyRecord): string {
    const kundeId = fieldRef(angebot, 'kunde');
    if (!kundeId) return '—';
    const kundeRec = kundenMap?.get(kundeId);
    return (kundeRec?.fields?.kundenname as string | undefined) ?? kundeId;
  }

  // Projektkennung ermitteln
  function projektKennungFuer(angebot: JourneyRecord): string {
    const projektId = fieldRef(angebot, 'projekt');
    if (!projektId) return '';
    const projektRec = projekteMap?.get(projektId);
    return (projektRec?.fields?.projektkennung as string | undefined) ?? projektId;
  }

  // Aktive Berater für Step 3
  const aktiveBerater = beraterSearch.records;
  const projektleitungBerater = aktiveBerater.find(b => b.id === projektleitungId);

  // Ausgewählte Werte für Zusammenfassung
  const projektleitungName = projektleitungId
    ? beraterSearch.labelOf(projektleitungId) ?? '—'
    : '—';
  const teamNamen = teamIds
    .map(id => beraterSearch.labelOf(id) ?? id)
    .join(', ') || '—';

  // Kundename aus Angebot für Erfolgsseite
  const selectedKundeName = selectedAngebot ? kundeNameFuer(selectedAngebot) : '—';
  const selectedAngebotsnummer = selectedAngebot ? fieldText(selectedAngebot, 'angebotsnummer') : '—';

  return (
    <IntentWizardShell
      title={tx('Angebot annehmen')}
      currentStep={step}
      onStepChange={setStep}
      loading={data.loading || angeboteSearch.select.loading}
      error={data.error ?? (angeboteSearch.select.error ? new Error(angeboteSearch.select.error) : null)}
      onRetry={data.fetchAll}
      forms={[projektForm]}
      draftKey="angebot-annehmen"
      intro={{
        description: tx('Ein offenes Angebot auswählen, daraus ein Projekt anlegen und das Team zuweisen.'),
        needs: [tx('Offenes Angebot'), tx('Projektkennung'), tx('Projektleitung')],
      }}
    >
      {/* SCHRITT 1 — Angebot wählen */}
      <WizardStep
        label={tx('Angebot')}
        description={tx('Wähle ein offenes Angebot aus — bereits zugewiesene Angebote sind ausgegraut.')}
      >
        <div className="space-y-3">
          {angeboteKarten.length === 0 && !angeboteSearch.select.loading && (
            <p className="text-muted-foreground text-sm py-8 text-center">
              {tx('Keine wählbaren Angebote vorhanden.')}
            </p>
          )}
          {angeboteKarten.map(angebot => {
            const status = fieldLookup(angebot, 'angebotsstatus');
            const hatProjekt = Boolean(fieldRef(angebot, 'projekt'));
            const istWaehlbar = !hatProjekt && status?.key !== 'angenommen' && status?.key !== 'abgelehnt';
            const istAusgewaehlt = selectedAngebot?.id === angebot.id;
            const projektkennung = hatProjekt ? projektKennungFuer(angebot) : '';
            const kostenbetrag = fieldNumber(angebot, 'kostenbetrag');

            return (
              <button
                key={angebot.id}
                type="button"
                disabled={!istWaehlbar}
                onClick={() => {
                  if (!istWaehlbar) return;
                  setSelectedAngebot(angebot);
                  prefillDoneRef.current = false;
                  setStep(2);
                }}
                className={[
                  'w-full text-left rounded-2xl border p-4 transition-all',
                  istWaehlbar
                    ? 'bg-card hover:border-primary cursor-pointer'
                    : 'bg-secondary opacity-60 cursor-not-allowed',
                  istAusgewaehlt ? 'border-primary ring-2 ring-primary' : 'border-border',
                ].join(' ')}
                title={!istWaehlbar && hatProjekt ? tx(tx`Bereits Projekt: ${projektkennung}`) : undefined}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-sm">
                      {fieldText(angebot, 'angebotsnummer')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {kundeNameFuer(angebot)}
                    </div>
                    {fieldText(angebot, 'angebotsbeschreibung') && (
                      <div className="text-sm mt-1">{fieldText(angebot, 'angebotsbeschreibung')}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {status && (
                      <StatusBadge statusKey={status.key} label={status.label} />
                    )}
                    {kostenbetrag !== null && (
                      <span className="text-sm font-medium">
                        {kostenbetrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </span>
                    )}
                    {hatProjekt && projektkennung && (
                      <Badge variant="secondary" className="text-xs">
                        {tx(tx`bereits Projekt: ${projektkennung}`)}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          <StepNav
            hideBack
            nextDisabled={!selectedAngebot}
            onNext={() => {
              if (!selectedAngebot) return tx('Bitte ein Angebot auswählen.');
              setStep(2);
            }}
            nextStepLabel={tx('Projekt')}
          />
        </div>
      </WizardStep>

      {/* SCHRITT 2 — Projekt anlegen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Projektdetails prüfen und anpassen — Felder sind bereits aus dem Angebot vorausgefüllt.')}
      >
        {!selectedAngebot ? (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht zuerst ein gewähltes Angebot.')}
          </StepNav>
        ) : (
          <div className="space-y-4">
            {/* Kunde: read-only */}
            <div className="rounded-lg bg-secondary p-3 text-sm">
              <span className="text-muted-foreground text-xs font-medium block mb-0.5">
                {tx('Kunde')}
              </span>
              <span className="font-medium">{selectedKundeName}</span>
            </div>

            <Field form={projektForm} name="projektkennung">
              <Input {...projektForm.field('projektkennung')} />
            </Field>

            <Field form={projektForm} name="projektnummer">
              <Input {...projektForm.number('projektnummer')} />
            </Field>

            <Field form={projektForm} name="projektart">
              <ChoiceGroup {...projektForm.choice('projektart')} />
            </Field>

            <Field form={projektForm} name="projektstart_jahr">
              <Input {...projektForm.field('projektstart_jahr')} />
            </Field>

            <Field form={projektForm} name="projektstart_monat">
              <ChoiceGroup {...projektForm.choice('projektstart_monat')} />
            </Field>

            <Field form={projektForm} name="ansprechpartner_kunde">
              <Input {...projektForm.field('ansprechpartner_kunde')} />
            </Field>

            <Field form={projektForm} name="budget">
              <Input {...projektForm.number('budget')} />
            </Field>

            <Field form={projektForm} name="projektende">
              <DatePicker {...projektForm.date('projektende')} />
            </Field>

            <Field form={projektForm} name="notizen">
              <Textarea {...projektForm.field('notizen')} rows={3} />
            </Field>

            <StepNav
              onBack={() => setStep(1)}
              onNext={() => projektForm.validate(['projektkennung', 'projektnummer', 'projektart', 'kunde'])}
              nextStepLabel={tx('Team')}
            />
          </div>
        )}
      </WizardStep>

      {/* SCHRITT 3 — Team zuweisen */}
      <WizardStep
        label={tx('Team')}
        description={tx('Projektleitung auswählen (Pflicht) und Team zusammenstellen.')}
      >
        {!selectedAngebot ? (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht zuerst ein gewähltes Angebot.')}
          </StepNav>
        ) : (
          <div className="space-y-6">
            {/* Projektleitung */}
            <div>
              <h3 className="font-semibold text-sm mb-2">{tx('Projektleitung (Pflicht)')}</h3>
              <div className="space-y-2">
                {aktiveBerater.length === 0 && !beraterSearch.select.loading && (
                  <p className="text-muted-foreground text-sm">{tx('Keine aktiven Berater/innen gefunden.')}</p>
                )}
                {aktiveBerater.map(b => {
                  const isSelected = projektleitungId === b.id;
                  const stunden = fieldNumber(b, 'stunden_aktueller_monat');
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setProjektleitungId(b.id)}
                      className={[
                        'w-full text-left rounded-2xl border p-3 transition-all cursor-pointer',
                        isSelected
                          ? 'border-primary ring-2 ring-primary bg-card'
                          : 'bg-card hover:border-primary',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">
                            {fieldText(b, 'vorname')} {fieldText(b, 'nachname')}
                          </div>
                          {stunden !== null && (
                            <div className="text-xs text-muted-foreground">
                              {tx(tx`${stunden} Std. diesen Monat`)}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Badge variant="default" className="text-xs shrink-0">{tx('Projektleitung')}</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {!projektleitungId && (
                <p className="text-xs text-destructive mt-1">{tx('Bitte eine Projektleitung auswählen.')}</p>
              )}
            </div>

            {/* Team-Mitglieder (ohne Projektleitung) */}
            {projektleitungBerater && (
              <div>
                <h3 className="font-semibold text-sm mb-2">{tx('Team (optional)')}</h3>
                <div className="space-y-2">
                  {aktiveBerater
                    .filter(b => b.id !== projektleitungId)
                    .map(b => {
                      const isInTeam = teamIds.includes(b.id);
                      const stunden = fieldNumber(b, 'stunden_aktueller_monat');
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() =>
                            setTeamIds(prev =>
                              isInTeam ? prev.filter(id => id !== b.id) : [...prev, b.id]
                            )
                          }
                          className={[
                            'w-full text-left rounded-2xl border p-3 transition-all cursor-pointer',
                            isInTeam
                              ? 'border-primary ring-2 ring-primary bg-card'
                              : 'bg-card hover:border-primary',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-medium text-sm">
                                {fieldText(b, 'vorname')} {fieldText(b, 'nachname')}
                              </div>
                              {stunden !== null && (
                                <div className="text-xs text-muted-foreground">
                                  {tx(tx`${stunden} Std. diesen Monat`)}
                                </div>
                              )}
                            </div>
                            {isInTeam && (
                              <Badge variant="outline" className="text-xs shrink-0">{tx('Im Team')}</Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <StepNav
              onBack={() => setStep(2)}
              onNext={() => {
                if (!projektleitungId) return tx('Bitte eine Projektleitung auswählen.');
              }}
              nextStepLabel={tx('Zusammenfassung')}
            />
          </div>
        )}
      </WizardStep>

      {/* SCHRITT 4 — Zusammenfassung */}
      <WizardStep label={tx('Zusammenfassung')}>
        {!submit.result && (
          <SummaryStep
            forms={[projektForm]}
            submit={submit}
            confirmLabel={tx('Angebot annehmen und Projekt anlegen')}
            whatHappensNext={tx('Das Projekt wird angelegt, das Team zugewiesen und das Angebot als angenommen markiert.')}
            items={[
              {
                key: 'angebot_nr',
                label: tx('Angebotsnummer'),
                value: selectedAngebotsnummer,
              },
              {
                key: 'angebot_kunde',
                label: tx('Kunde (Angebot)'),
                value: selectedKundeName,
              },
              {
                key: 'angebot_summe',
                label: tx('Angebotssumme'),
                value: (() => {
                  const n = selectedAngebot ? fieldNumber(selectedAngebot, 'kostenbetrag') : null;
                  return n !== null
                    ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
                    : '—';
                })(),
              },
              {
                key: 'projektleitung_name',
                label: tx('Projektleitung'),
                value: projektleitungName,
                step: 3,
              },
              {
                key: 'team_namen',
                label: tx('Team'),
                value: teamNamen,
                step: 3,
              },
            ]}
          />
        )}
      </WizardStep>

      {/* Erfolgsseite */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[projektForm]}
          title={tx(tx`Projekt ${projektForm.get('projektkennung') as string ?? ''} angelegt`)}
          facts={[
            { label: tx('Angebotsnummer'), value: selectedAngebotsnummer },
            { label: tx('Kunde'), value: selectedKundeName },
            { label: tx('Projektkennung'), value: (projektForm.get('projektkennung') as string) ?? '—' },
            { label: tx('Projektleitung'), value: projektleitungName },
          ]}
          whatHappensNext={tx('Das Projekt ist jetzt aktiv — das Team wurde zugewiesen und das Angebot als angenommen markiert.')}
          next={[
            {
              label: tx('Projekt öffnen'),
              onClick: () => {
                const newProjekt = submit.result?.records?.['projekt'];
                if (newProjekt) {
                  // openDetail erwartet ein Projekte-Record-Objekt mit record_id
                  crud.projekte.openDetail({ record_id: newProjekt.id, fields: newProjekt.fields } as any);
                }
              },
            },
            {
              label: tx('Weiteres Angebot annehmen'),
              href: '#/intents/angebot-annehmen',
            },
            {
              label: tx('Zurück zum Dashboard'),
              href: '#/',
            },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
