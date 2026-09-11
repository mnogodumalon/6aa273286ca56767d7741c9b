import type { Kunden, Projekte, Rechnungen, Angebote } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface KundenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kunden;
  /** N:1-Ziel „Projekte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  projekteList: Projekte[];
  /** Reserviert — Projekte ist hier nur über ein Mehrfach-Feld verknüpft (Text-Join, keine Einzel-Relation); Übergabe erlaubt, aber ohne Wirkung. */
  onOpenProjekte?: (record: Projekte) => void;
  /** 1:N „Rechnungen" (kunde): VOLLE Liste — der Block filtert auf diesen Record. */
  rechnungenList: Rechnungen[];
  /** Zeilen-Klick → overlay.push auf das Rechnungen-Detail (nie der Edit-Dialog). */
  onOpenRechnungen: (record: Rechnungen) => void;
  /** Kontextuelles „+": öffnet den Rechnungen-Dialog mit diesem Record vorgesetzt. */
  onAddRechnungen: () => void;
  /** 1:N „Projekte" (kunde): VOLLE Liste — der Block filtert auf diesen Record. */
  projekteKundeList: Projekte[];
  /** Zeilen-Klick → overlay.push auf das Projekte-Detail (nie der Edit-Dialog). */
  onOpenProjekteKunde: (record: Projekte) => void;
  /** Kontextuelles „+": öffnet den Projekte-Dialog mit diesem Record vorgesetzt. */
  onAddProjekteKunde: () => void;
  /** 1:N „Angebote" (kunde): VOLLE Liste — der Block filtert auf diesen Record. */
  angeboteList: Angebote[];
  /** Zeilen-Klick → overlay.push auf das Angebote-Detail (nie der Edit-Dialog). */
  onOpenAngebote: (record: Angebote) => void;
  /** Kontextuelles „+": öffnet den Angebote-Dialog mit diesem Record vorgesetzt. */
  onAddAngebote: () => void;
}

export function KundenDetails({
  record,
  projekteList,
  rechnungenList,
  onOpenRechnungen,
  onAddRechnungen,
  projekteKundeList,
  onOpenProjekteKunde,
  onAddProjekteKunde,
  angeboteList,
  onOpenAngebote,
  onAddAngebote,
}: KundenDetailsProps) {
  return (
    <>
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
        <RecordField label={fieldLabel('kunden', 'laufende_projekte')} value={Array.isArray(record.fields.laufende_projekte) ? record.fields.laufende_projekte.map((u: unknown) => projekteList.find(t => t.record_id === extractRecordId(u))?.fields.projektkennung ?? '—').join(', ') : null} format="text" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('rechnungen')}
        items={rechnungenList.filter(r => extractRecordId(r.fields.kunde) === record.record_id)}
        map={r => ({ name: r.fields.rechnungsnummer ?? appLabel('rechnungen'), meta: r.fields.rechnungsdatum })}
        onOpen={onOpenRechnungen}
        onAdd={onAddRechnungen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={`${appLabel('projekte')} · ${fieldLabel('projekte', 'kunde')}`}
        items={projekteKundeList.filter(r => extractRecordId(r.fields.kunde) === record.record_id)}
        map={r => ({ name: r.fields.projektkennung ?? appLabel('projekte'), meta: r.fields.projektende })}
        onOpen={onOpenProjekteKunde}
        onAdd={onAddProjekteKunde}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('angebote')}
        items={angeboteList.filter(r => extractRecordId(r.fields.kunde) === record.record_id)}
        map={r => ({ name: r.fields.angebotsnummer ?? appLabel('angebote'), meta: r.fields.angebotsdatum })}
        onOpen={onOpenAngebote}
        onAdd={onAddAngebote}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KUNDEN} recordId={record.record_id} />
    </>
  );
}
