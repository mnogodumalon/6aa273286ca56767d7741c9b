import type { BeraterInnen, Leistungskatalog, Projekte } from '@/types/app';
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

interface BeraterInnenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: BeraterInnen | null;
  onEdit: (record: BeraterInnen) => void;
  leistungskatalogList: Leistungskatalog[];
  projekteList: Projekte[];
}

export function BeraterInnenViewDialog({ open, onClose, record, onEdit, leistungskatalogList, projekteList }: BeraterInnenViewDialogProps) {
  function getLeistungskatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return leistungskatalogList.find(r => r.record_id === id)?.fields.leistungsbezeichnung ?? '—';
  }

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
          <DialogTitle>{t('view_entity', { entity: appLabel('berater/innen') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'nachname')}</Label>
            <p className="text-sm">{record.fields.nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'vorname')}</Label>
            <p className="text-sm">{record.fields.vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'titel')}</Label>
            <p className="text-sm">{record.fields.titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'strasse')}</Label>
            <p className="text-sm">{record.fields.strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'hausnummer')}</Label>
            <p className="text-sm">{record.fields.hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'plz')}</Label>
            <p className="text-sm">{record.fields.plz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'ort')}</Label>
            <p className="text-sm">{record.fields.ort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'email_beruflich')}</Label>
            <p className="text-sm">{record.fields.email_beruflich ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'email_privat')}</Label>
            <p className="text-sm">{record.fields.email_privat ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'telefon')}</Label>
            <p className="text-sm">{record.fields.telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'einstiegsdatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.einstiegsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'status')}</Label>
            <Badge variant="secondary">{lookupLabel('berater/innen', 'status', record.fields.status?.key) ?? record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'stundensatz')}</Label>
            <p className="text-sm">{record.fields.stundensatz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'sonstiges_1')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.sonstiges_1 ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'sonstiges_2')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.sonstiges_2 ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'stunden_aktueller_monat')}</Label>
            <p className="text-sm">{record.fields.stunden_aktueller_monat ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'stunden_aktuelles_quartal')}</Label>
            <p className="text-sm">{record.fields.stunden_aktuelles_quartal ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'stunden_aktuelles_jahr')}</Label>
            <p className="text-sm">{record.fields.stunden_aktuelles_jahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'stunden_letzter_monat')}</Label>
            <p className="text-sm">{record.fields.stunden_letzter_monat ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'stunden_letztes_quartal')}</Label>
            <p className="text-sm">{record.fields.stunden_letztes_quartal ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'stunden_letztes_jahr')}</Label>
            <p className="text-sm">{record.fields.stunden_letztes_jahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'leistungen')}</Label>
            {Array.isArray(record.fields.leistungen) && record.fields.leistungen.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {record.fields.leistungen.map((url: any, i: number) => (
                  <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getLeistungskatalogDisplayName(url)}</span>
                ))}
              </div>
            ) : <p className="text-sm">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('berater/innen', 'projekte')}</Label>
            {Array.isArray(record.fields.projekte) && record.fields.projekte.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {record.fields.projekte.map((url: any, i: number) => (
                  <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getProjekteDisplayName(url)}</span>
                ))}
              </div>
            ) : <p className="text-sm">—</p>}
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS['BERATER/INNEN']} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}