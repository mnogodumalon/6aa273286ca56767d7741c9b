import type { Leistungskatalog, BeraterInnen, Zeiterfassung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface LeistungskatalogDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Leistungskatalog;
  /** N:1-Ziel „BeraterInnen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beraterInnenList: BeraterInnen[];
  /** Reserviert — BeraterInnen ist hier nur über ein Mehrfach-Feld verknüpft (Text-Join, keine Einzel-Relation); Übergabe erlaubt, aber ohne Wirkung. */
  onOpenBeraterInnen?: (record: BeraterInnen) => void;
  /** 1:N „Zeiterfassung" (leistung): VOLLE Liste — der Block filtert auf diesen Record. */
  zeiterfassungList: Zeiterfassung[];
  /** Zeilen-Klick → overlay.push auf das Zeiterfassung-Detail (nie der Edit-Dialog). */
  onOpenZeiterfassung: (record: Zeiterfassung) => void;
  /** Kontextuelles „+": öffnet den Zeiterfassung-Dialog mit diesem Record vorgesetzt. */
  onAddZeiterfassung: () => void;
  /** 1:N „Berater/innen" (leistungen): VOLLE Liste — der Block filtert auf diesen Record. */
  beraterInnenLeistungenList: BeraterInnen[];
  /** Zeilen-Klick → overlay.push auf das BeraterInnen-Detail (nie der Edit-Dialog). */
  onOpenBeraterInnenLeistungen: (record: BeraterInnen) => void;
  /** Kontextuelles „+": öffnet den BeraterInnen-Dialog mit diesem Record vorgesetzt. */
  onAddBeraterInnenLeistungen: () => void;
}

export function LeistungskatalogDetails({
  record,
  beraterInnenList,
  zeiterfassungList,
  onOpenZeiterfassung,
  onAddZeiterfassung,
  beraterInnenLeistungenList,
  onOpenBeraterInnenLeistungen,
  onAddBeraterInnenLeistungen,
}: LeistungskatalogDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('leistungskatalog', 'berater')} value={Array.isArray(record.fields.berater) ? record.fields.berater.map((u: unknown) => beraterInnenList.find(t => t.record_id === extractRecordId(u))?.fields.nachname ?? '—').join(', ') : null} format="text" />
        <RecordField label={fieldLabel('leistungskatalog', 'leistungsbezeichnung')} value={record.fields.leistungsbezeichnung} format="text" />
        <RecordField label={fieldLabel('leistungskatalog', 'leistungstyp')} value={record.fields.leistungstyp} format="pill" />
        <RecordField label={fieldLabel('leistungskatalog', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('leistungskatalog', 'kostenvoranschlag')} value={record.fields.kostenvoranschlag} format="text" />
        <RecordField label={fieldLabel('leistungskatalog', 'stundensatz_leistung')} value={record.fields.stundensatz_leistung} format="text" />
        <RecordField label={fieldLabel('leistungskatalog', 'einheit')} value={record.fields.einheit} format="pill" />
        <RecordField label={fieldLabel('leistungskatalog', 'verfuegbarkeit')} value={record.fields.verfuegbarkeit} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('zeiterfassung')}
        items={zeiterfassungList.filter(r => extractRecordId(r.fields.leistung) === record.record_id)}
        map={r => ({ name: r.fields.jahr ?? appLabel('zeiterfassung'), meta: r.fields.datum })}
        onOpen={onOpenZeiterfassung}
        onAdd={onAddZeiterfassung}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={`${appLabel('berater/innen')} · ${fieldLabel('berater/innen', 'leistungen')}`}
        items={beraterInnenLeistungenList.filter(r => Array.isArray(r.fields.leistungen) && r.fields.leistungen.some((u: unknown) => extractRecordId(u) === record.record_id))}
        map={r => ({ name: r.fields.nachname ?? appLabel('berater/innen'), meta: r.fields.einstiegsdatum })}
        onOpen={onOpenBeraterInnenLeistungen}
        onAdd={onAddBeraterInnenLeistungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.LEISTUNGSKATALOG} recordId={record.record_id} />
    </>
  );
}
