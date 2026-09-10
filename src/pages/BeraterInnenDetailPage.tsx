import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { BeraterInnen, Leistungskatalog, Projekte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { BeraterInnenDialog } from '@/components/dialogs/BeraterInnenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/BeraterInnen';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function BeraterInnenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<BeraterInnen | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leistungskatalogList, setLeistungskatalogList] = useState<Leistungskatalog[]>([]);
  const [projekteList, setProjekteList] = useState<Projekte[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, leistungskatalogData, projekteData] = await Promise.all([
        LivingAppsService.getBeraterInnen(),
        LivingAppsService.getLeistungskatalog(),
        LivingAppsService.getProjekte(),
      ]);
      setLeistungskatalogList(leistungskatalogData);
      setProjekteList(projekteData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: BeraterInnen['fields']) {
    if (!record) return;
    await LivingAppsService.updateBeraterInnenEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteBeraterInnenEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/berater/innen');
  }

  function getLeistungskatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return leistungskatalogList.find(r => r.record_id === refId)?.fields.leistungsbezeichnung ?? '—';
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
          <Button variant="ghost" onClick={() => navigate('/berater/innen')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/berater/innen')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.nachname ?? appLabel('berater/innen')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          leistungen: leistungskatalogList,
          projekte: projekteList,
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
        <RecordField label={fieldLabel('berater/innen', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'email_beruflich')} value={record.fields.email_beruflich} format="email" />
        <RecordField label={fieldLabel('berater/innen', 'email_privat')} value={record.fields.email_privat} format="email" />
        <RecordField label={fieldLabel('berater/innen', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'einstiegsdatum')} value={record.fields.einstiegsdatum} format="date" />
        <RecordField label={fieldLabel('berater/innen', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('berater/innen', 'stundensatz')} value={record.fields.stundensatz} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'sonstiges_1')} value={record.fields.sonstiges_1} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('berater/innen', 'sonstiges_2')} value={record.fields.sonstiges_2} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('berater/innen', 'stunden_aktueller_monat')} value={record.fields.stunden_aktueller_monat} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'stunden_aktuelles_quartal')} value={record.fields.stunden_aktuelles_quartal} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'stunden_aktuelles_jahr')} value={record.fields.stunden_aktuelles_jahr} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'stunden_letzter_monat')} value={record.fields.stunden_letzter_monat} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'stunden_letztes_quartal')} value={record.fields.stunden_letztes_quartal} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'stunden_letztes_jahr')} value={record.fields.stunden_letztes_jahr} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'leistungen')} value={Array.isArray(record.fields.leistungen) ? record.fields.leistungen.map((u: unknown) => getLeistungskatalogDisplayName(u)).join(', ') : null} format="text" />
        <RecordField label={fieldLabel('berater/innen', 'projekte')} value={Array.isArray(record.fields.projekte) ? record.fields.projekte.map((u: unknown) => getProjekteDisplayName(u)).join(', ') : null} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS['BERATER/INNEN']} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <BeraterInnenDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        leistungskatalogList={leistungskatalogList}
        projekteList={projekteList}
        enablePhotoScan={AI_PHOTO_SCAN['BeraterInnen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['BeraterInnen']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('berater/innen') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
