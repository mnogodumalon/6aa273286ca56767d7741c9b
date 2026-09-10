import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Zeiterfassung, BeraterInnen, Projekte, Leistungskatalog } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { ZeiterfassungDialog } from '@/components/dialogs/ZeiterfassungDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Zeiterfassung';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function ZeiterfassungDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Zeiterfassung | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [beraterInnenList, setBeraterInnenList] = useState<BeraterInnen[]>([]);
  const [projekteList, setProjekteList] = useState<Projekte[]>([]);
  const [leistungskatalogList, setLeistungskatalogList] = useState<Leistungskatalog[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, beraterInnenData, projekteData, leistungskatalogData] = await Promise.all([
        LivingAppsService.getZeiterfassung(),
        LivingAppsService.getBeraterInnen(),
        LivingAppsService.getProjekte(),
        LivingAppsService.getLeistungskatalog(),
      ]);
      setBeraterInnenList(beraterInnenData);
      setProjekteList(projekteData);
      setLeistungskatalogList(leistungskatalogData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Zeiterfassung['fields']) {
    if (!record) return;
    await LivingAppsService.updateZeiterfassungEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteZeiterfassungEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/zeiterfassung');
  }

  function getBeraterInnenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return beraterInnenList.find(r => r.record_id === refId)?.fields.nachname ?? '—';
  }

  function getProjekteDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return projekteList.find(r => r.record_id === refId)?.fields.projektkennung ?? '—';
  }

  function getLeistungskatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return leistungskatalogList.find(r => r.record_id === refId)?.fields.leistungsbezeichnung ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title={t('not_found')}
        action={
          <Button variant="ghost" onClick={() => navigate('/zeiterfassung')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/zeiterfassung')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.jahr ?? appLabel('zeiterfassung')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          berater: beraterInnenList,
          projekt: projekteList,
          leistung: leistungskatalogList,
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
        <RecordField label={fieldLabel('zeiterfassung', 'datum')} value={record.fields.datum} format="date" />
        <RecordField label={fieldLabel('zeiterfassung', 'stunden')} value={record.fields.stunden} format="text" />
        <RecordField label={fieldLabel('zeiterfassung', 'monat')} value={record.fields.monat} format="pill" />
        <RecordField label={fieldLabel('zeiterfassung', 'jahr')} value={record.fields.jahr} format="text" />
        <RecordField label={fieldLabel('zeiterfassung', 'taetigkeitsbeschreibung')} value={record.fields.taetigkeitsbeschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('zeiterfassung', 'verrechenbar')} value={record.fields.verrechenbar} format="bool" />
        <RecordField label={fieldLabel('zeiterfassung', 'notizen')} value={record.fields.notizen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('zeiterfassung', 'berater')} value={getBeraterInnenDisplayName(record.fields.berater)} format="text" />
        <RecordField label={fieldLabel('zeiterfassung', 'projekt')} value={getProjekteDisplayName(record.fields.projekt)} format="text" />
        <RecordField label={fieldLabel('zeiterfassung', 'leistung')} value={getLeistungskatalogDisplayName(record.fields.leistung)} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ZEITERFASSUNG} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <ZeiterfassungDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        beraterInnenList={beraterInnenList}
        projekteList={projekteList}
        leistungskatalogList={leistungskatalogList}
        enablePhotoScan={AI_PHOTO_SCAN['Zeiterfassung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Zeiterfassung']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('zeiterfassung') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
