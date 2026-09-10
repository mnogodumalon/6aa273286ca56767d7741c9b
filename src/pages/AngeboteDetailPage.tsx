import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Angebote, Projekte, Kunden } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { AngeboteDialog } from '@/components/dialogs/AngeboteDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Angebote';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function AngeboteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Angebote | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projekteList, setProjekteList] = useState<Projekte[]>([]);
  const [kundenList, setKundenList] = useState<Kunden[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, projekteData, kundenData] = await Promise.all([
        LivingAppsService.getAngebote(),
        LivingAppsService.getProjekte(),
        LivingAppsService.getKunden(),
      ]);
      setProjekteList(projekteData);
      setKundenList(kundenData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Angebote['fields']) {
    if (!record) return;
    await LivingAppsService.updateAngeboteEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteAngeboteEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/angebote');
  }

  function getProjekteDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return projekteList.find(r => r.record_id === refId)?.fields.projektkennung ?? '—';
  }

  function getKundenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return kundenList.find(r => r.record_id === refId)?.fields.kundenname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title={t('not_found')}
        action={
          <Button variant="ghost" onClick={() => navigate('/angebote')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/angebote')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.angebotsnummer ?? appLabel('angebote')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          projekt: projekteList,
          kunde: kundenList,
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
        <RecordField label={fieldLabel('angebote', 'angebotsnummer')} value={record.fields.angebotsnummer} format="text" />
        <RecordField label={fieldLabel('angebote', 'angebotsjahr')} value={record.fields.angebotsjahr} format="text" />
        <RecordField label={fieldLabel('angebote', 'angebotstyp')} value={record.fields.angebotstyp} format="pill" />
        <RecordField label={fieldLabel('angebote', 'angebotsdatum')} value={record.fields.angebotsdatum} format="date" />
        <RecordField label={fieldLabel('angebote', 'gueltig_bis')} value={record.fields.gueltig_bis} format="date" />
        <RecordField label={fieldLabel('angebote', 'zeitrahmen_anfang')} value={record.fields.zeitrahmen_anfang} format="date" />
        <RecordField label={fieldLabel('angebote', 'zeitrahmen_ende')} value={record.fields.zeitrahmen_ende} format="date" />
        <RecordField label={fieldLabel('angebote', 'dauer')} value={record.fields.dauer} format="text" />
        <RecordField label={fieldLabel('angebote', 'kostentyp')} value={record.fields.kostentyp} format="pill" />
        <RecordField label={fieldLabel('angebote', 'kostenbetrag')} value={record.fields.kostenbetrag} format="text" />
        <RecordField label={fieldLabel('angebote', 'kosten_beschreibung')} value={record.fields.kosten_beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('angebote', 'angebotsbeschreibung')} value={record.fields.angebotsbeschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('angebote', 'leistungspositionen')} value={record.fields.leistungspositionen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('angebote', 'anmerkungen')} value={record.fields.anmerkungen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('angebote', 'projekt')} value={getProjekteDisplayName(record.fields.projekt)} format="text" />
        <RecordField label={fieldLabel('angebote', 'kunde')} value={getKundenDisplayName(record.fields.kunde)} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANGEBOTE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <AngeboteDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        projekteList={projekteList}
        kundenList={kundenList}
        enablePhotoScan={AI_PHOTO_SCAN['Angebote']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Angebote']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('angebote') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
