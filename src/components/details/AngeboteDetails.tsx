import type { Angebote, Projekte, Kunden } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';

export interface AngeboteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Angebote;
  /** N:1-Ziel „Projekte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  projekteList: Projekte[];
  /** Klick auf die Projekte-Relation → overlay.push auf dessen Detail. */
  onOpenProjekte?: (record: Projekte) => void;
  /** N:1-Ziel „Kunden": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kundenList: Kunden[];
  /** Klick auf die Kunden-Relation → overlay.push auf dessen Detail. */
  onOpenKunden?: (record: Kunden) => void;
}

export function AngeboteDetails({
  record,
  projekteList,
  onOpenProjekte,
  kundenList,
  onOpenKunden,
}: AngeboteDetailsProps) {
  const projektTarget = projekteList.find(r => r.record_id === extractRecordId(record.fields.projekt));
  const kundeTarget = kundenList.find(r => r.record_id === extractRecordId(record.fields.kunde));
  return (
    <>
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
        <RecordField label={fieldLabel('angebote', 'vorlage_datei')} className="md:col-span-2">
          {record.fields.vorlage_datei ? (
            <MediaThumbnail src={record.fields.vorlage_datei as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('angebote', 'projekt')}
          name={projektTarget?.fields.projektkennung ?? '—'}
          meta={[projektTarget?.fields.projektstart_jahr, projektTarget?.fields.ansprechpartner_kunde].filter(Boolean).join(' · ') || undefined}
          onClick={projektTarget && onOpenProjekte ? () => onOpenProjekte!(projektTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('angebote', 'kunde')}
          name={kundeTarget?.fields.kundenname ?? '—'}
          meta={[kundeTarget?.fields.email, kundeTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={kundeTarget && onOpenKunden ? () => onOpenKunden!(kundeTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANGEBOTE} recordId={record.record_id} />
    </>
  );
}
