import type { Projekte, Kunden, BeraterInnen, Zeiterfassung, Rechnungen, Angebote } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface ProjekteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Projekte;
  /** N:1-Ziel „Kunden": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kundenList: Kunden[];
  /** Klick auf die Kunden-Relation → overlay.push auf dessen Detail. */
  onOpenKunden?: (record: Kunden) => void;
  /** N:1-Ziel „BeraterInnen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beraterInnenList: BeraterInnen[];
  /** Klick auf die BeraterInnen-Relation → overlay.push auf dessen Detail. */
  onOpenBeraterInnen?: (record: BeraterInnen) => void;
  /** 1:N „Zeiterfassung" (projekt): VOLLE Liste — der Block filtert auf diesen Record. */
  zeiterfassungList: Zeiterfassung[];
  /** Zeilen-Klick → overlay.push auf das Zeiterfassung-Detail (nie der Edit-Dialog). */
  onOpenZeiterfassung: (record: Zeiterfassung) => void;
  /** Kontextuelles „+": öffnet den Zeiterfassung-Dialog mit diesem Record vorgesetzt. */
  onAddZeiterfassung: () => void;
  /** 1:N „Rechnungen" (projekt): VOLLE Liste — der Block filtert auf diesen Record. */
  rechnungenList: Rechnungen[];
  /** Zeilen-Klick → overlay.push auf das Rechnungen-Detail (nie der Edit-Dialog). */
  onOpenRechnungen: (record: Rechnungen) => void;
  /** Kontextuelles „+": öffnet den Rechnungen-Dialog mit diesem Record vorgesetzt. */
  onAddRechnungen: () => void;
  /** 1:N „Kunden" (laufende_projekte): VOLLE Liste — der Block filtert auf diesen Record. */
  kundenLaufendeProjekteList: Kunden[];
  /** Zeilen-Klick → overlay.push auf das Kunden-Detail (nie der Edit-Dialog). */
  onOpenKundenLaufendeProjekte: (record: Kunden) => void;
  /** Kontextuelles „+": öffnet den Kunden-Dialog mit diesem Record vorgesetzt. */
  onAddKundenLaufendeProjekte: () => void;
  /** „Vorhandene wählen": Listenfeld-Rückbezug — hängt diesen Record an einen bestehenden Kunden-Datensatz. */
  onPickKundenLaufendeProjekte?: () => void;
  /** 1:N „Berater/innen" (projekte): VOLLE Liste — der Block filtert auf diesen Record. */
  beraterInnenProjekteList: BeraterInnen[];
  /** Zeilen-Klick → overlay.push auf das BeraterInnen-Detail (nie der Edit-Dialog). */
  onOpenBeraterInnenProjekte: (record: BeraterInnen) => void;
  /** Kontextuelles „+": öffnet den BeraterInnen-Dialog mit diesem Record vorgesetzt. */
  onAddBeraterInnenProjekte: () => void;
  /** „Vorhandene wählen": Listenfeld-Rückbezug — hängt diesen Record an einen bestehenden BeraterInnen-Datensatz. */
  onPickBeraterInnenProjekte?: () => void;
  /** 1:N „Angebote" (projekt): VOLLE Liste — der Block filtert auf diesen Record. */
  angeboteList: Angebote[];
  /** Zeilen-Klick → overlay.push auf das Angebote-Detail (nie der Edit-Dialog). */
  onOpenAngebote: (record: Angebote) => void;
  /** Kontextuelles „+": öffnet den Angebote-Dialog mit diesem Record vorgesetzt. */
  onAddAngebote: () => void;
}

export function ProjekteDetails({
  record,
  kundenList,
  onOpenKunden,
  beraterInnenList,
  onOpenBeraterInnen,
  zeiterfassungList,
  onOpenZeiterfassung,
  onAddZeiterfassung,
  rechnungenList,
  onOpenRechnungen,
  onAddRechnungen,
  kundenLaufendeProjekteList,
  onOpenKundenLaufendeProjekte,
  onAddKundenLaufendeProjekte,
  onPickKundenLaufendeProjekte,
  beraterInnenProjekteList,
  onOpenBeraterInnenProjekte,
  onAddBeraterInnenProjekte,
  onPickBeraterInnenProjekte,
  angeboteList,
  onOpenAngebote,
  onAddAngebote,
}: ProjekteDetailsProps) {
  const kundeTarget = kundenList.find(r => r.record_id === extractRecordId(record.fields.kunde));
  const projektleitungTarget = beraterInnenList.find(r => r.record_id === extractRecordId(record.fields.projektleitung));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('projekte', 'budget')} value={record.fields.budget} format="text" />
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
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('projekte', 'kunde')}
          name={kundeTarget?.fields.kundenname ?? '—'}
          meta={[kundeTarget?.fields.email, kundeTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={kundeTarget && onOpenKunden ? () => onOpenKunden!(kundeTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('projekte', 'projektleitung')}
          name={projektleitungTarget?.fields.nachname ?? '—'}
          meta={[projektleitungTarget?.fields.email_beruflich, projektleitungTarget?.fields.email_privat].filter(Boolean).join(' · ') || undefined}
          onClick={projektleitungTarget && onOpenBeraterInnen ? () => onOpenBeraterInnen!(projektleitungTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('zeiterfassung')}
        items={zeiterfassungList.filter(r => extractRecordId(r.fields.projekt) === record.record_id)}
        map={r => ({ name: r.fields.jahr ?? appLabel('zeiterfassung'), meta: r.fields.datum })}
        onOpen={onOpenZeiterfassung}
        onAdd={onAddZeiterfassung}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('rechnungen')}
        items={rechnungenList.filter(r => extractRecordId(r.fields.projekt) === record.record_id)}
        map={r => ({ name: r.fields.rechnungsnummer ?? appLabel('rechnungen'), meta: r.fields.rechnungsdatum })}
        onOpen={onOpenRechnungen}
        onAdd={onAddRechnungen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={`${appLabel('kunden')} · ${fieldLabel('kunden', 'laufende_projekte')}`}
        items={kundenLaufendeProjekteList.filter(r => Array.isArray(r.fields.laufende_projekte) && r.fields.laufende_projekte.some((u: unknown) => extractRecordId(u) === record.record_id))}
        map={r => ({ name: r.fields.kundenname ?? appLabel('kunden'), meta: r.fields.anlagedatum })}
        onOpen={onOpenKundenLaufendeProjekte}
        onAdd={onAddKundenLaufendeProjekte}
        onPick={onPickKundenLaufendeProjekte}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={`${appLabel('berater/innen')} · ${fieldLabel('berater/innen', 'projekte')}`}
        items={beraterInnenProjekteList.filter(r => Array.isArray(r.fields.projekte) && r.fields.projekte.some((u: unknown) => extractRecordId(u) === record.record_id))}
        map={r => ({ name: r.fields.nachname ?? appLabel('berater/innen'), meta: r.fields.einstiegsdatum })}
        onOpen={onOpenBeraterInnenProjekte}
        onAdd={onAddBeraterInnenProjekte}
        onPick={onPickBeraterInnenProjekte}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('angebote')}
        items={angeboteList.filter(r => extractRecordId(r.fields.projekt) === record.record_id)}
        map={r => ({ name: r.fields.angebotsnummer ?? appLabel('angebote'), meta: r.fields.angebotsdatum })}
        onOpen={onOpenAngebote}
        onAdd={onAddAngebote}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.PROJEKTE} recordId={record.record_id} />
    </>
  );
}
