import type { Angebote, Projekte, Kunden } from '@/types/app';
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

interface AngeboteViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Angebote | null;
  onEdit: (record: Angebote) => void;
  projekteList: Projekte[];
  kundenList: Kunden[];
}

export function AngeboteViewDialog({ open, onClose, record, onEdit, projekteList, kundenList }: AngeboteViewDialogProps) {
  function getProjekteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return projekteList.find(r => r.record_id === id)?.fields.projektkennung ?? '—';
  }

  function getKundenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kundenList.find(r => r.record_id === id)?.fields.kundenname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('angebote') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'angebotsnummer')}</Label>
            <p className="text-sm">{record.fields.angebotsnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'angebotsjahr')}</Label>
            <p className="text-sm">{record.fields.angebotsjahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'angebotstyp')}</Label>
            <Badge variant="secondary">{lookupLabel('angebote', 'angebotstyp', record.fields.angebotstyp?.key) ?? record.fields.angebotstyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'angebotsdatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.angebotsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'gueltig_bis')}</Label>
            <p className="text-sm">{formatDate(record.fields.gueltig_bis)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'zeitrahmen_anfang')}</Label>
            <p className="text-sm">{formatDate(record.fields.zeitrahmen_anfang)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'zeitrahmen_ende')}</Label>
            <p className="text-sm">{formatDate(record.fields.zeitrahmen_ende)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'dauer')}</Label>
            <p className="text-sm">{record.fields.dauer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'kostentyp')}</Label>
            <Badge variant="secondary">{lookupLabel('angebote', 'kostentyp', record.fields.kostentyp?.key) ?? record.fields.kostentyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'kostenbetrag')}</Label>
            <p className="text-sm">{record.fields.kostenbetrag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'kosten_beschreibung')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.kosten_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'angebotsbeschreibung')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.angebotsbeschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'leistungspositionen')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.leistungspositionen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'anmerkungen')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.anmerkungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'vorlage_datei')}</Label>
            {record.fields.vorlage_datei ? (
              <MediaThumbnail src={record.fields.vorlage_datei} fit="contain" className="w-full rounded-lg border" />
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'projekt')}</Label>
            <p className="text-sm">{getProjekteDisplayName(record.fields.projekt)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('angebote', 'kunde')}</Label>
            <p className="text-sm">{getKundenDisplayName(record.fields.kunde)}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.ANGEBOTE} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}