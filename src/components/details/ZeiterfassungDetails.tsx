import type { Zeiterfassung, BeraterInnen, Projekte, Leistungskatalog } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface ZeiterfassungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Zeiterfassung;
  /** N:1-Ziel „BeraterInnen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beraterInnenList: BeraterInnen[];
  /** Klick auf die BeraterInnen-Relation → overlay.push auf dessen Detail. */
  onOpenBeraterInnen?: (record: BeraterInnen) => void;
  /** N:1-Ziel „Projekte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  projekteList: Projekte[];
  /** Klick auf die Projekte-Relation → overlay.push auf dessen Detail. */
  onOpenProjekte?: (record: Projekte) => void;
  /** N:1-Ziel „Leistungskatalog": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  leistungskatalogList: Leistungskatalog[];
  /** Klick auf die Leistungskatalog-Relation → overlay.push auf dessen Detail. */
  onOpenLeistungskatalog?: (record: Leistungskatalog) => void;
}

export function ZeiterfassungDetails({
  record,
  beraterInnenList,
  onOpenBeraterInnen,
  projekteList,
  onOpenProjekte,
  leistungskatalogList,
  onOpenLeistungskatalog,
}: ZeiterfassungDetailsProps) {
  const beraterTarget = beraterInnenList.find(r => r.record_id === extractRecordId(record.fields.berater));
  const projektTarget = projekteList.find(r => r.record_id === extractRecordId(record.fields.projekt));
  const leistungTarget = leistungskatalogList.find(r => r.record_id === extractRecordId(record.fields.leistung));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('zeiterfassung', 'datum')} value={record.fields.datum} format="date" />
        <RecordField label={fieldLabel('zeiterfassung', 'stunden')} value={record.fields.stunden} format="text" />
        <RecordField label={fieldLabel('zeiterfassung', 'monat')} value={record.fields.monat} format="pill" />
        <RecordField label={fieldLabel('zeiterfassung', 'jahr')} value={record.fields.jahr} format="text" />
        <RecordField label={fieldLabel('zeiterfassung', 'taetigkeitsbeschreibung')} value={record.fields.taetigkeitsbeschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('zeiterfassung', 'verrechenbar')} value={record.fields.verrechenbar} format="bool" />
        <RecordField label={fieldLabel('zeiterfassung', 'notizen')} value={record.fields.notizen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('zeiterfassung', 'berater')}
          name={beraterTarget?.fields.nachname ?? '—'}
          meta={[beraterTarget?.fields.email_beruflich, beraterTarget?.fields.email_privat].filter(Boolean).join(' · ') || undefined}
          onClick={beraterTarget && onOpenBeraterInnen ? () => onOpenBeraterInnen!(beraterTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('zeiterfassung', 'projekt')}
          name={projektTarget?.fields.projektkennung ?? '—'}
          meta={[projektTarget?.fields.projektstart_jahr, projektTarget?.fields.ansprechpartner_kunde].filter(Boolean).join(' · ') || undefined}
          onClick={projektTarget && onOpenProjekte ? () => onOpenProjekte!(projektTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('zeiterfassung', 'leistung')}
          name={leistungTarget?.fields.leistungsbezeichnung ?? '—'}
          meta={undefined}
          onClick={leistungTarget && onOpenLeistungskatalog ? () => onOpenLeistungskatalog!(leistungTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ZEITERFASSUNG} recordId={record.record_id} />
    </>
  );
}
