/**
 * Stunden erfassen — 3-Schritt-Wizard zum Anlegen eines Zeiterfassungseintrags.
 * Steps: 1) Berater/in wählen → 2) Projekt + Leistung wählen → 3) Stunden & Details eingeben.
 * Reads: berater/innen (filter: aktiv), projekte (filter: in_bearbeitung|akquise), leistungskatalog.
 * Writes: zeiterfassung (createZeiterfassungEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, StepNav, SummaryStep, SuccessStep, StatusBadge.
 */

import { useState } from 'react';
import { format, getMonth } from 'date-fns';
import { tx } from '@/i18n';
import { LOOKUP_OPTIONS } from '@/types/app';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Field } from '@/components/blocks/Field';
import { DatePicker } from '@/components/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  useRecordSearch,
  useStepForm,
  useJourneySubmit,
  todayIso,
  fieldText,
  fieldLookup,
  fieldNumber,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { IconUser, IconBriefcase, IconClock } from '@tabler/icons-react';

// Map JS month index (0-based) to zeiterfassung monat lookup key
const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
];

const MONAT_OPTIONS = LOOKUP_OPTIONS['zeiterfassung']?.['monat'] ?? [];

export default function StundenErfassenPage() {
  const [step, setStep] = useState(1);

  // ---- Step 1: Berater/in ----
  const beraterSearch = useRecordSearch(servicePort, 'berater/innen', {
    searchFields: ['vorname', 'nachname', 'email_beruflich'],
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim() || b.id,
      subtitle: fieldText(b, 'email_beruflich') || undefined,
      status: fieldLookup(b, 'status') ?? undefined,
      stats: fieldNumber(b, 'stunden_aktueller_monat') != null
        ? [{ label: tx('Std. diesen Monat'), value: String(fieldNumber(b, 'stunden_aktueller_monat')) }]
        : undefined,
      icon: <IconUser size={20} className="text-primary" />,
    }),
  });

  // ---- Step 2: Projekt ----
  const projektSearch = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    filter: "r.v_status in ['in_bearbeitung', 'akquise']",
    where: r => ['in_bearbeitung', 'akquise'].includes(fieldLookup(r, 'status')?.key ?? ''),
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung') || p.id,
      subtitle: fieldLookup(p, 'projektart')?.label ?? undefined,
      status: fieldLookup(p, 'status') ?? undefined,
      icon: <IconBriefcase size={20} className="text-primary" />,
    }),
  });

  // ---- Step 2: Leistung (optional) ----
  const leistungSearch = useRecordSearch(servicePort, 'leistungskatalog', {
    searchFields: ['leistungsbezeichnung'],
    toItem: l => ({
      id: l.id,
      title: fieldText(l, 'leistungsbezeichnung') || l.id,
      subtitle: fieldLookup(l, 'leistungstyp')?.label ?? undefined,
    }),
  });

  // Local state for leistung selection (optional, 'none' = not selected)
  const [selectedLeistungId, setSelectedLeistungId] = useState<string>('none');

  // ---- Step 3: Zeiterfassung form ----
  const todayStr = todayIso();
  const todayDate = new Date(todayStr + 'T00:00:00');
  const todayMonthKey = MONTH_KEYS[getMonth(todayDate)] ?? 'januar';
  const todayJahr = format(todayDate, 'yyyy');

  const f = useStepForm('zeiterfassung', {
    fields: ['datum', 'stunden', 'monat', 'jahr', 'taetigkeitsbeschreibung', 'verrechenbar', 'notizen', 'berater', 'projekt', 'leistung'],
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 2,
      datum: 3,
      stunden: 3,
      monat: 3,
      jahr: 3,
      taetigkeitsbeschreibung: 3,
      verrechenbar: 3,
      notizen: 3,
    },
    initial: {
      datum: todayStr,
      monat: todayMonthKey,
      jahr: todayJahr,
    },
  });

  // ---- Submit plan ----
  const submit = useJourneySubmit(servicePort, [
    {
      key: 'zeiterfassung',
      entity: 'zeiterfassung',
      form: f,
      primary: true,
      values: (ctx) => {
        void ctx;
        const leistungId = selectedLeistungId !== 'none' ? selectedLeistungId : undefined;
        return {
          stunden: parseFloat(String(f.get('stunden') ?? '0')),
          taetigkeitsbeschreibung: (f.get('taetigkeitsbeschreibung') as string) || undefined,
          notizen: (f.get('notizen') as string) || undefined,
          leistung: leistungId ?? undefined,
        };
      },
    },
  ], { draftKey: 'stunden-erfassen' });

  // Derive monat + jahr when datum changes
  const handleDatumChange = (val: string | null) => {
    f.set('datum', val ?? '');
    if (val) {
      const parsed = new Date(val + 'T00:00:00');
      const mKey = MONTH_KEYS[getMonth(parsed)];
      if (mKey) f.set('monat', mKey);
      f.set('jahr', format(parsed, 'yyyy'));
    }
  };

  const beraterLabel = (f.get('berater') ? f.labels['berater'] : undefined) ?? '';
  const projektLabel = (f.get('projekt') ? f.labels['projekt'] : undefined) ?? '';

  return (
    <IntentWizardShell
      title={tx('Stunden erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="stunden-erfassen"
      intro={{ description: tx('Zeiterfassungseintrag in 3 Schritten anlegen.'), needs: [tx('Berater/in'), tx('Projekt')] }}
    >
      {/* ---- Step 1: Berater/in wählen ---- */}
      <WizardStep label={tx('Berater/in')} description={tx('Aktive Berater/in für diesen Eintrag wählen.')}>
        <EntitySelectStep
          {...beraterSearch.select}
          selectedId={f.get('berater') as string | null}
          onSelect={id => {
            f.set('berater', id, beraterSearch.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Berater/in suchen …')}
          emptyText={tx('Keine aktiven Berater/innen gefunden')}
          emptyIcon={<IconUser size={32} className="text-muted-foreground" />}
          create={false}
        />
      </WizardStep>

      {/* ---- Step 2: Projekt + Leistung wählen ---- */}
      <WizardStep label={tx('Projekt')} description={tx('Aktives Projekt wählen und optional eine Leistung zuordnen.')} needs={['berater']}>
        <div className="space-y-6">
          {Boolean(f.get('berater')) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconUser size={14} className="shrink-0" />
              <span>{tx('Berater/in:')} <span className="font-medium text-foreground">{beraterLabel}</span></span>
            </div>
          )}

          <EntitySelectStep
            {...projektSearch.select}
            selectedId={f.get('projekt') as string | null}
            onSelect={id => {
              f.set('projekt', id, projektSearch.labelOf(id));
            }}
            searchPlaceholder={tx('Projekt suchen …')}
            emptyText={tx('Keine aktiven Projekte gefunden')}
            emptyIcon={<IconBriefcase size={32} className="text-muted-foreground" />}
            create={false}
          />

          {/* Leistung optional — shown once a projekt is selected */}
          {Boolean(f.get('projekt')) && (() => {
            const projektId = f.get('projekt') as string;
            const projektRec = projektSearch.recordOf(projektId);
            const leistungPanel = (
              <div className="rounded-2xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{tx('Projekt gewählt:')}</span>
                  {projektRec && (
                    <StatusBadge
                      statusKey={fieldLookup(projektRec, 'status')?.key}
                      label={fieldLookup(projektRec, 'status')?.label}
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-medium">{projektLabel}</p>

                <div className="space-y-1.5">
                  <Label className="text-sm">{tx('Leistung (optional)')}</Label>
                  <Select
                    value={selectedLeistungId}
                    onValueChange={val => {
                      setSelectedLeistungId(val);
                      if (val !== 'none') {
                        f.set('leistung', val, leistungSearch.labelOf(val));
                      } else {
                        f.set('leistung', '', '');
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tx('Leistung wählen …')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Keine Leistung')}</SelectItem>
                      {leistungSearch.records.map(l => (
                        <SelectItem key={l.id} value={l.id}>
                          {fieldText(l, 'leistungsbezeichnung') || l.id}
                          {fieldLookup(l, 'leistungstyp') ? ` · ${fieldLookup(l, 'leistungstyp')!.label}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <StepNav
                  onBack={() => setStep(1)}
                  onNext={() => f.validate(['berater', 'projekt'])}
                  nextStepLabel={tx('Stunden')}
                />
              </div>
            );
            return leistungPanel;
          })()}

          {!f.get('projekt') && (
            <StepNav onBack={() => setStep(1)} nextDisabled />
          )}
        </div>
      </WizardStep>

      {/* ---- Step 3: Stunden & Details ---- */}
      <WizardStep label={tx('Stunden')} description={tx('Datum, Stunden und weitere Details eingeben.')} needs={['berater', 'projekt']}>
        <div className="space-y-6">
          {/* Context summary */}
          <div className="rounded-2xl border bg-secondary/40 p-4 space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <IconUser size={14} className="shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{tx('Berater/in:')}</span>
              <span className="font-medium">{beraterLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <IconBriefcase size={14} className="shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{tx('Projekt:')}</span>
              <span className="font-medium">{projektLabel}</span>
            </div>
            {selectedLeistungId && selectedLeistungId !== 'none' && (() => {
              const leistungRec = leistungSearch.recordOf(selectedLeistungId);
              return leistungRec ? (
                <div className="flex items-center gap-2">
                  <IconClock size={14} className="shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{tx('Leistung:')}</span>
                  <span className="font-medium">{fieldText(leistungRec, 'leistungsbezeichnung')}</span>
                </div>
              ) : null;
            })()}
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field form={f} name="datum">
                <DatePicker
                  {...f.date('datum')}
                  onChange={handleDatumChange}
                />
              </Field>
              <Field form={f} name="stunden">
                <Input {...f.number('stunden')} placeholder="z.B. 7.5" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor={f.fieldId('monat')}>{tx('Abrechnungsmonat')}</Label>
                <Select value={(f.get('monat') as string) || ''} onValueChange={v => f.set('monat', v)}>
                  <SelectTrigger id={f.fieldId('monat')} className="w-full">
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
              <Field form={f} name="jahr">
                <Input {...f.field('jahr')} placeholder="z.B. 2026" />
              </Field>
            </div>

            <Field form={f} name="taetigkeitsbeschreibung">
              <Textarea {...f.field('taetigkeitsbeschreibung')} placeholder={tx('Was wurde heute gemacht?')} rows={3} />
            </Field>

            <Field form={f} name="verrechenbar" hideLabel>
              <Checkbox {...f.checkbox('verrechenbar')} />
            </Field>

            <Field form={f} name="notizen">
              <Textarea {...f.field('notizen')} placeholder={tx('Optionale interne Notizen')} rows={2} />
            </Field>
          </div>

          <StepNav
            onBack={() => setStep(2)}
            onNext={() => f.validate(['datum', 'stunden', 'monat', 'jahr'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* ---- Step 4: Zusammenfassung ---- */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            whatHappensNext={tx('Der Zeiterfassungseintrag wird sofort angelegt und erscheint in der Übersicht.')}
          />
        )}
      </WizardStep>

      {/* ---- Success ---- */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          title={tx('Stunden erfolgreich erfasst')}
          forms={[f]}
          facts={[
            { label: tx('Berater/in'), value: beraterLabel },
            { label: tx('Stunden'), value: String(f.get('stunden') ?? '') },
            { label: tx('Projekt'), value: projektLabel },
          ]}
          submit={submit}
          restartLabel={tx('Neue Stunden erfassen')}
          next={[
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
