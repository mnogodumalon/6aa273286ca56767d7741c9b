import type { Projekte, Kunden, BeraterInnen } from '@/types/app';
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

interface ProjekteViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Projekte | null;
  onEdit: (record: Projekte) => void;
  kundenList: Kunden[];
  beraterInnenList: BeraterInnen[];
}

export function ProjekteViewDialog({ open, onClose, record, onEdit, kundenList, beraterInnenList }: ProjekteViewDialogProps) {
  function getKundenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kundenList.find(r => r.record_id === id)?.fields.kundenname ?? '—';
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
          <DialogTitle>{t('view_entity', { entity: appLabel('projekte') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'projektkennung')}</Label>
            <p className="text-sm">{record.fields.projektkennung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'projektnummer')}</Label>
            <p className="text-sm">{record.fields.projektnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'projektart')}</Label>
            <Badge variant="secondary">{lookupLabel('projekte', 'projektart', record.fields.projektart?.key) ?? record.fields.projektart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'projektstart_jahr')}</Label>
            <p className="text-sm">{record.fields.projektstart_jahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'projektstart_monat')}</Label>
            <Badge variant="secondary">{lookupLabel('projekte', 'projektstart_monat', record.fields.projektstart_monat?.key) ?? record.fields.projektstart_monat?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'status')}</Label>
            <Badge variant="secondary">{lookupLabel('projekte', 'status', record.fields.status?.key) ?? record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'ansprechpartner_kunde')}</Label>
            <p className="text-sm">{record.fields.ansprechpartner_kunde ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'letzter_schritt')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.letzter_schritt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'projektende')}</Label>
            <p className="text-sm">{formatDate(record.fields.projektende)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'notizen')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'kunde')}</Label>
            <p className="text-sm">{getKundenDisplayName(record.fields.kunde)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('projekte', 'projektleitung')}</Label>
            <p className="text-sm">{getBeraterInnenDisplayName(record.fields.projektleitung)}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.PROJEKTE} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}