import type { Rechnungen, Kunden, Projekte, BeraterInnen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { t, appLabel, fieldLabel, lookupLabel, dateFnsLocale, dateFormat } from '@/i18n';
import { format, parseISO } from 'date-fns';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), dateFormat(), { locale: dateFnsLocale() }); } catch { return d; }
}

interface RechnungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Rechnungen | null;
  onEdit: (record: Rechnungen) => void;
  kundenList: Kunden[];
  projekteList: Projekte[];
  beraterInnenList: BeraterInnen[];
}

export function RechnungenViewDialog({ open, onClose, record, onEdit, kundenList, projekteList, beraterInnenList }: RechnungenViewDialogProps) {
  function getKundenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kundenList.find(r => r.record_id === id)?.fields.kundenname ?? '—';
  }

  function getProjekteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return projekteList.find(r => r.record_id === id)?.fields.projektkennung ?? '—';
  }

  function getBeraterInnenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return beraterInnenList.find(r => r.record_id === id)?.fields.nachname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('rechnungen') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'rechnungsnummer')}</Label>
            <p className="text-sm">{record.fields.rechnungsnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'rechnungsdatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.rechnungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'faelligkeitsdatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.faelligkeitsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'rechnungsstatus')}</Label>
            <Badge variant="secondary">{lookupLabel('rechnungen', 'rechnungsstatus', record.fields.rechnungsstatus?.key) ?? record.fields.rechnungsstatus?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'abrechnungsmonat')}</Label>
            <Badge variant="secondary">{lookupLabel('rechnungen', 'abrechnungsmonat', record.fields.abrechnungsmonat?.key) ?? record.fields.abrechnungsmonat?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'abrechnungsjahr')}</Label>
            <p className="text-sm">{record.fields.abrechnungsjahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'nettobetrag')}</Label>
            <p className="text-sm">{record.fields.nettobetrag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'mehrwertsteuer')}</Label>
            <p className="text-sm">{record.fields.mehrwertsteuer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'gesamtbetrag')}</Label>
            <p className="text-sm">{record.fields.gesamtbetrag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'zahlungseingang')}</Label>
            <p className="text-sm">{formatDate(record.fields.zahlungseingang)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'leistungspositionen')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.leistungspositionen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'notizen')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'rechnungsdatei')}</Label>
            {record.fields.rechnungsdatei ? (
              <MediaThumbnail src={record.fields.rechnungsdatei} fit="contain" className="w-full rounded-lg border" />
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'kunde')}</Label>
            <p className="text-sm">{getKundenDisplayName(record.fields.kunde)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'projekt')}</Label>
            <p className="text-sm">{getProjekteDisplayName(record.fields.projekt)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('rechnungen', 'berater')}</Label>
            {Array.isArray(record.fields.berater) && record.fields.berater.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {record.fields.berater.map((url: any, i: number) => (
                  <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getBeraterInnenDisplayName(url)}</span>
                ))}
              </div>
            ) : <p className="text-sm">—</p>}
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.RECHNUNGEN} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}