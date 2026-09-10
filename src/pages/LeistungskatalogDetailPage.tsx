import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Leistungskatalog, BeraterInnen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { LeistungskatalogDialog } from '@/components/dialogs/LeistungskatalogDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Leistungskatalog';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function LeistungskatalogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Leistungskatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [beraterInnenList, setBeraterInnenList] = useState<BeraterInnen[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, beraterInnenData] = await Promise.all([
        LivingAppsService.getLeistungskatalog(),
        LivingAppsService.getBeraterInnen(),
      ]);
      setBeraterInnenList(beraterInnenData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Leistungskatalog['fields']) {
    if (!record) return;
    await LivingAppsService.updateLeistungskatalogEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteLeistungskatalogEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/leistungskatalog');
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
          <Button variant="ghost" onClick={() => navigate('/leistungskatalog')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/leistungskatalog')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.leistungsbezeichnung ?? appLabel('leistungskatalog')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
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
        <RecordField label={fieldLabel('leistungskatalog', 'berater')} value={Array.isArray(record.fields.berater) ? record.fields.berater.map((u: unknown) => getBeraterInnenDisplayName(u)).join(', ') : null} format="text" />
        <RecordField label={fieldLabel('leistungskatalog', 'leistungsbezeichnung')} value={record.fields.leistungsbezeichnung} format="text" />
        <RecordField label={fieldLabel('leistungskatalog', 'leistungstyp')} value={record.fields.leistungstyp} format="pill" />
        <RecordField label={fieldLabel('leistungskatalog', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('leistungskatalog', 'kostenvoranschlag')} value={record.fields.kostenvoranschlag} format="text" />
        <RecordField label={fieldLabel('leistungskatalog', 'stundensatz_leistung')} value={record.fields.stundensatz_leistung} format="text" />
        <RecordField label={fieldLabel('leistungskatalog', 'einheit')} value={record.fields.einheit} format="pill" />
        <RecordField label={fieldLabel('leistungskatalog', 'verfuegbarkeit')} value={record.fields.verfuegbarkeit} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.LEISTUNGSKATALOG} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <LeistungskatalogDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        beraterInnenList={beraterInnenList}
        enablePhotoScan={AI_PHOTO_SCAN['Leistungskatalog']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Leistungskatalog']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('leistungskatalog') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
