import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Projekte, Kunden, BeraterInnen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { ProjekteDialog } from '@/components/dialogs/ProjekteDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Projekte';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function ProjekteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Projekte | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [kundenList, setKundenList] = useState<Kunden[]>([]);
  const [beraterInnenList, setBeraterInnenList] = useState<BeraterInnen[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, kundenData, beraterInnenData] = await Promise.all([
        LivingAppsService.getProjekte(),
        LivingAppsService.getKunden(),
        LivingAppsService.getBeraterInnen(),
      ]);
      setKundenList(kundenData);
      setBeraterInnenList(beraterInnenData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Projekte['fields']) {
    if (!record) return;
    await LivingAppsService.updateProjekteEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteProjekteEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/projekte');
  }

  function getKundenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return kundenList.find(r => r.record_id === refId)?.fields.kundenname ?? '—';
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
          <Button variant="ghost" onClick={() => navigate('/projekte')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/projekte')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.projektkennung ?? appLabel('projekte')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          kunde: kundenList,
          projektleitung: beraterInnenList,
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
        <RecordField label={fieldLabel('projekte', 'projektkennung')} value={record.fields.projektkennung} format="text" />
        <RecordField label={fieldLabel('projekte', 'projektnummer')} value={record.fields.projektnummer} format="text" />
        <RecordField label={fieldLabel('projekte', 'projektart')} value={record.fields.projektart} format="pill" />
        <RecordField label={fieldLabel('projekte', 'projektstart_jahr')} value={record.fields.projektstart_jahr} format="text" />
        <RecordField label={fieldLabel('projekte', 'projektstart_monat')} value={record.fields.projektstart_monat} format="pill" />
        <RecordField label={fieldLabel('projekte', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('projekte', 'ansprechpartner_kunde')} value={record.fields.ansprechpartner_kunde} format="text" />
        <RecordField label={fieldLabel('projekte', 'letzter_schritt')} value={record.fields.letzter_schritt} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('projekte', 'projektende')} value={record.fields.projektende} format="date" />
        <RecordField label={fieldLabel('projekte', 'notizen')} value={record.fields.notizen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('projekte', 'kunde')} value={getKundenDisplayName(record.fields.kunde)} format="text" />
        <RecordField label={fieldLabel('projekte', 'projektleitung')} value={getBeraterInnenDisplayName(record.fields.projektleitung)} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.PROJEKTE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <ProjekteDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        kundenList={kundenList}
        beraterInnenList={beraterInnenList}
        enablePhotoScan={AI_PHOTO_SCAN['Projekte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Projekte']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('projekte') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
