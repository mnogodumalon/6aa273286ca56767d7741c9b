import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Rechnungen, Kunden, Projekte, BeraterInnen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { RechnungenDialog } from '@/components/dialogs/RechnungenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Rechnungen';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function RechnungenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Rechnungen | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [kundenList, setKundenList] = useState<Kunden[]>([]);
  const [projekteList, setProjekteList] = useState<Projekte[]>([]);
  const [beraterInnenList, setBeraterInnenList] = useState<BeraterInnen[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, kundenData, projekteData, beraterInnenData] = await Promise.all([
        LivingAppsService.getRechnungen(),
        LivingAppsService.getKunden(),
        LivingAppsService.getProjekte(),
        LivingAppsService.getBeraterInnen(),
      ]);
      setKundenList(kundenData);
      setProjekteList(projekteData);
      setBeraterInnenList(beraterInnenData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Rechnungen['fields']) {
    if (!record) return;
    await LivingAppsService.updateRechnungenEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteRechnungenEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/rechnungen');
  }

  function getKundenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return kundenList.find(r => r.record_id === refId)?.fields.kundenname ?? '—';
  }

  function getProjekteDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return projekteList.find(r => r.record_id === refId)?.fields.projektkennung ?? '—';
  }

  function getBeraterInnenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return beraterInnenList.find(r => r.record_id === refId)?.fields.nachname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title={t('not_found')}
        action={
          <Button variant="ghost" onClick={() => navigate('/rechnungen')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/rechnungen')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.rechnungsnummer ?? appLabel('rechnungen')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          kunde: kundenList,
          projekt: projekteList,
          berater: beraterInnenList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('rechnungen', 'rechnungsnummer')} value={record.fields.rechnungsnummer} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'rechnungsdatum')} value={record.fields.rechnungsdatum} format="date" />
        <RecordField label={fieldLabel('rechnungen', 'faelligkeitsdatum')} value={record.fields.faelligkeitsdatum} format="date" />
        <RecordField label={fieldLabel('rechnungen', 'rechnungsstatus')} value={record.fields.rechnungsstatus} format="pill" />
        <RecordField label={fieldLabel('rechnungen', 'abrechnungsmonat')} value={record.fields.abrechnungsmonat} format="pill" />
        <RecordField label={fieldLabel('rechnungen', 'abrechnungsjahr')} value={record.fields.abrechnungsjahr} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'nettobetrag')} value={record.fields.nettobetrag} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'mehrwertsteuer')} value={record.fields.mehrwertsteuer} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'gesamtbetrag')} value={record.fields.gesamtbetrag} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'zahlungseingang')} value={record.fields.zahlungseingang} format="date" />
        <RecordField label={fieldLabel('rechnungen', 'leistungspositionen')} value={record.fields.leistungspositionen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('rechnungen', 'notizen')} value={record.fields.notizen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('rechnungen', 'kunde')} value={getKundenDisplayName(record.fields.kunde)} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'projekt')} value={getProjekteDisplayName(record.fields.projekt)} format="text" />
        <RecordField label={fieldLabel('rechnungen', 'berater')} value={Array.isArray(record.fields.berater) ? record.fields.berater.map((u: unknown) => getBeraterInnenDisplayName(u)).join(', ') : null} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.RECHNUNGEN} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <RechnungenDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        kundenList={kundenList}
        projekteList={projekteList}
        beraterInnenList={beraterInnenList}
        enablePhotoScan={AI_PHOTO_SCAN['Rechnungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Rechnungen']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('rechnungen') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
