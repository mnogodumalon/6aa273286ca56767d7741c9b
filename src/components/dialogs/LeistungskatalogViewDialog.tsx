import type { Leistungskatalog, BeraterInnen } from '@/types/app';
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
import { t, appLabel, fieldLabel, lookupLabel } from '@/i18n';

interface LeistungskatalogViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Leistungskatalog | null;
  onEdit: (record: Leistungskatalog) => void;
  beraterInnenList: BeraterInnen[];
}

export function LeistungskatalogViewDialog({ open, onClose, record, onEdit, beraterInnenList }: LeistungskatalogViewDialogProps) {
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
          <DialogTitle>{t('view_entity', { entity: appLabel('leistungskatalog') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungskatalog', 'berater')}</Label>
            {Array.isArray(record.fields.berater) && record.fields.berater.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {record.fields.berater.map((url: any, i: number) => (
                  <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getBeraterInnenDisplayName(url)}</span>
                ))}
              </div>
            ) : <p className="text-sm">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungskatalog', 'leistungsbezeichnung')}</Label>
            <p className="text-sm">{record.fields.leistungsbezeichnung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungskatalog', 'leistungstyp')}</Label>
            <Badge variant="secondary">{lookupLabel('leistungskatalog', 'leistungstyp', record.fields.leistungstyp?.key) ?? record.fields.leistungstyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungskatalog', 'beschreibung')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungskatalog', 'kostenvoranschlag')}</Label>
            <p className="text-sm">{record.fields.kostenvoranschlag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungskatalog', 'stundensatz_leistung')}</Label>
            <p className="text-sm">{record.fields.stundensatz_leistung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungskatalog', 'einheit')}</Label>
            <Badge variant="secondary">{lookupLabel('leistungskatalog', 'einheit', record.fields.einheit?.key) ?? record.fields.einheit?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leistungskatalog', 'verfuegbarkeit')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.verfuegbarkeit ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.LEISTUNGSKATALOG} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}