import type { Kunden, Projekte } from '@/types/app';
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

interface KundenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Kunden | null;
  onEdit: (record: Kunden) => void;
  projekteList: Projekte[];
}

export function KundenViewDialog({ open, onClose, record, onEdit, projekteList }: KundenViewDialogProps) {
  function getProjekteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return projekteList.find(r => r.record_id === id)?.fields.projektkennung ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('kunden') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'kundenname')}</Label>
            <p className="text-sm">{record.fields.kundenname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'kundentyp')}</Label>
            <Badge variant="secondary">{lookupLabel('kunden', 'kundentyp', record.fields.kundentyp?.key) ?? record.fields.kundentyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'email')}</Label>
            <p className="text-sm">{record.fields.email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'telefon')}</Label>
            <p className="text-sm">{record.fields.telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'strasse')}</Label>
            <p className="text-sm">{record.fields.strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'hausnummer')}</Label>
            <p className="text-sm">{record.fields.hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'plz')}</Label>
            <p className="text-sm">{record.fields.plz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'ort')}</Label>
            <p className="text-sm">{record.fields.ort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 're_strasse')}</Label>
            <p className="text-sm">{record.fields.re_strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 're_hausnummer')}</Label>
            <p className="text-sm">{record.fields.re_hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 're_plz')}</Label>
            <p className="text-sm">{record.fields.re_plz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 're_ort')}</Label>
            <p className="text-sm">{record.fields.re_ort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'anlagedatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.anlagedatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'ap_titel')}</Label>
            <p className="text-sm">{record.fields.ap_titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'ap_vorname')}</Label>
            <p className="text-sm">{record.fields.ap_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'ap_nachname')}</Label>
            <p className="text-sm">{record.fields.ap_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'ap_email')}</Label>
            <p className="text-sm">{record.fields.ap_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'ap_telefon')}</Label>
            <p className="text-sm">{record.fields.ap_telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'bevorzugte_kontaktart')}</Label>
            <Badge variant="secondary">{lookupLabel('kunden', 'bevorzugte_kontaktart', record.fields.bevorzugte_kontaktart?.key) ?? record.fields.bevorzugte_kontaktart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'letzter_kontakt_datum')}</Label>
            <p className="text-sm">{formatDate(record.fields.letzter_kontakt_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'letzter_kontakt_ansprechpartner')}</Label>
            <p className="text-sm">{record.fields.letzter_kontakt_ansprechpartner ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'notizen')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kunden', 'laufende_projekte')}</Label>
            {Array.isArray(record.fields.laufende_projekte) && record.fields.laufende_projekte.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {record.fields.laufende_projekte.map((url: any, i: number) => (
                  <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getProjekteDisplayName(url)}</span>
                ))}
              </div>
            ) : <p className="text-sm">—</p>}
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.KUNDEN} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}