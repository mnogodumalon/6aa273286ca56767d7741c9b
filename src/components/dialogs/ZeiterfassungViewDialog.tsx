import type { Zeiterfassung, BeraterInnen, Projekte, Leistungskatalog } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { t, appLabel, fieldLabel, lookupLabel, dateFnsLocale, dateFormat } from '@/i18n';
import { format, parseISO } from 'date-fns';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), dateFormat(), { locale: dateFnsLocale() }); } catch { return d; }
}

interface ZeiterfassungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Zeiterfassung | null;
  onEdit: (record: Zeiterfassung) => void;
  beraterInnenList: BeraterInnen[];
  projekteList: Projekte[];
  leistungskatalogList: Leistungskatalog[];
}

export function ZeiterfassungViewDialog({ open, onClose, record, onEdit, beraterInnenList, projekteList, leistungskatalogList }: ZeiterfassungViewDialogProps) {
  function getBeraterInnenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return beraterInnenList.find(r => r.record_id === id)?.fields.nachname ?? '—';
  }

  function getProjekteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return projekteList.find(r => r.record_id === id)?.fields.projektkennung ?? '—';
  }

  function getLeistungskatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return leistungskatalogList.find(r => r.record_id === id)?.fields.leistungsbezeichnung ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('zeiterfassung') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('zeiterfassung', 'datum')}</Label>
            <p className="text-sm">{formatDate(record.fields.datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('zeiterfassung', 'stunden')}</Label>
            <p className="text-sm">{record.fields.stunden ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('zeiterfassung', 'monat')}</Label>
            <Badge variant="secondary">{lookupLabel('zeiterfassung', 'monat', record.fields.monat?.key) ?? record.fields.monat?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('zeiterfassung', 'jahr')}</Label>
            <p className="text-sm">{record.fields.jahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('zeiterfassung', 'taetigkeitsbeschreibung')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.taetigkeitsbeschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('zeiterfassung', 'verrechenbar')}</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.verrechenbar ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.verrechenbar ? t('yes') : t('no')}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('zeiterfassung', 'notizen')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('zeiterfassung', 'berater')}</Label>
            <p className="text-sm">{getBeraterInnenDisplayName(record.fields.berater)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('zeiterfassung', 'projekt')}</Label>
            <p className="text-sm">{getProjekteDisplayName(record.fields.projekt)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('zeiterfassung', 'leistung')}</Label>
            <p className="text-sm">{getLeistungskatalogDisplayName(record.fields.leistung)}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.ZEITERFASSUNG} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}