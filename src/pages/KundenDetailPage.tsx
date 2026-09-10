import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Kunden, Projekte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { KundenDialog } from '@/components/dialogs/KundenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Kunden';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function KundenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Kunden | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projekteList, setProjekteList] = useState<Projekte[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, projekteData] = await Promise.all([
        LivingAppsService.getKunden(),
        LivingAppsService.getProjekte(),
      ]);
      setProjekteList(projekteData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Kunden['fields']) {
    if (!record) return;
    await LivingAppsService.updateKundenEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteKundenEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/kunden');
  }

  function getProjekteDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return projekteList.find(r => r.record_id === refId)?.fields.projektkennung ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title={t('not_found')}
        action={
          <Button variant="ghost" onClick={() => navigate('/kunden')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/kunden')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.kundenname ?? appLabel('kunden')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          laufende_projekte: projekteList,
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
        <RecordField label={fieldLabel('kunden', 'kundenname')} value={record.fields.kundenname} format="text" />
        <RecordField label={fieldLabel('kunden', 'kundentyp')} value={record.fields.kundentyp} format="pill" />
        <RecordField label={fieldLabel('kunden', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('kunden', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('kunden', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('kunden', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('kunden', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('kunden', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('kunden', 're_strasse')} value={record.fields.re_strasse} format="text" />
        <RecordField label={fieldLabel('kunden', 're_hausnummer')} value={record.fields.re_hausnummer} format="text" />
        <RecordField label={fieldLabel('kunden', 're_plz')} value={record.fields.re_plz} format="text" />
        <RecordField label={fieldLabel('kunden', 're_ort')} value={record.fields.re_ort} format="text" />
        <RecordField label={fieldLabel('kunden', 'anlagedatum')} value={record.fields.anlagedatum} format="date" />
        <RecordField label={fieldLabel('kunden', 'ap_titel')} value={record.fields.ap_titel} format="text" />
        <RecordField label={fieldLabel('kunden', 'ap_vorname')} value={record.fields.ap_vorname} format="text" />
        <RecordField label={fieldLabel('kunden', 'ap_nachname')} value={record.fields.ap_nachname} format="text" />
        <RecordField label={fieldLabel('kunden', 'ap_email')} value={record.fields.ap_email} format="email" />
        <RecordField label={fieldLabel('kunden', 'ap_telefon')} value={record.fields.ap_telefon} format="text" />
        <RecordField label={fieldLabel('kunden', 'bevorzugte_kontaktart')} value={record.fields.bevorzugte_kontaktart} format="pill" />
        <RecordField label={fieldLabel('kunden', 'letzter_kontakt_datum')} value={record.fields.letzter_kontakt_datum} format="date" />
        <RecordField label={fieldLabel('kunden', 'letzter_kontakt_ansprechpartner')} value={record.fields.letzter_kontakt_ansprechpartner} format="text" />
        <RecordField label={fieldLabel('kunden', 'notizen')} value={record.fields.notizen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('kunden', 'laufende_projekte')} value={Array.isArray(record.fields.laufende_projekte) ? record.fields.laufende_projekte.map((u: unknown) => getProjekteDisplayName(u)).join(', ') : null} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.KUNDEN} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <KundenDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        projekteList={projekteList}
        enablePhotoScan={AI_PHOTO_SCAN['Kunden']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kunden']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('kunden') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
