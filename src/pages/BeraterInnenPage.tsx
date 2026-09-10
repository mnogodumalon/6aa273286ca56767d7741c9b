import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { BeraterInnen, Leistungskatalog, Projekte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { BeraterInnenDialog } from '@/components/dialogs/BeraterInnenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel, fieldLabel, lookupLabel, dateFnsLocale, dateFormat } from '@/i18n';
import { format, parseISO } from 'date-fns';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), dateFormat(), { locale: dateFnsLocale() }); } catch { return d; }
}

export default function BeraterInnenPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<BeraterInnen[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BeraterInnen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BeraterInnen | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [leistungskatalogList, setLeistungskatalogList] = useState<Leistungskatalog[]>([]);
  const [projekteList, setProjekteList] = useState<Projekte[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, leistungskatalogData, projekteData] = await Promise.all([
        LivingAppsService.getBeraterInnen(),
        LivingAppsService.getLeistungskatalog(),
        LivingAppsService.getProjekte(),
      ]);
      setRecords(mainData);
      setLeistungskatalogList(leistungskatalogData);
      setProjekteList(projekteData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: BeraterInnen['fields']) {
    await LivingAppsService.createBeraterInnenEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: BeraterInnen['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateBeraterInnenEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteBeraterInnenEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

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

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.some(item => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
      if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
      return String(v).toLowerCase().includes(s);
    });
  });

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title={appLabel('berater/innen')}
      subtitle={`${records.length} ${t('in_system', { entity: appLabel('berater/innen') })}`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> {t('add')}
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('search_entity', { entity: appLabel('berater/innen') })}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('nachname')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'nachname')}
                  {sortKey === 'nachname' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('vorname')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'vorname')}
                  {sortKey === 'vorname' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('titel')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'titel')}
                  {sortKey === 'titel' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('strasse')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'strasse')}
                  {sortKey === 'strasse' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('hausnummer')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'hausnummer')}
                  {sortKey === 'hausnummer' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('plz')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'plz')}
                  {sortKey === 'plz' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('ort')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'ort')}
                  {sortKey === 'ort' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('email_beruflich')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'email_beruflich')}
                  {sortKey === 'email_beruflich' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('email_privat')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'email_privat')}
                  {sortKey === 'email_privat' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('telefon')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'telefon')}
                  {sortKey === 'telefon' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('einstiegsdatum')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'einstiegsdatum')}
                  {sortKey === 'einstiegsdatum' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('status')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'status')}
                  {sortKey === 'status' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('stundensatz')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'stundensatz')}
                  {sortKey === 'stundensatz' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sonstiges_1')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'sonstiges_1')}
                  {sortKey === 'sonstiges_1' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sonstiges_2')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'sonstiges_2')}
                  {sortKey === 'sonstiges_2' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('stunden_aktueller_monat')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'stunden_aktueller_monat')}
                  {sortKey === 'stunden_aktueller_monat' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('stunden_aktuelles_quartal')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'stunden_aktuelles_quartal')}
                  {sortKey === 'stunden_aktuelles_quartal' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('stunden_aktuelles_jahr')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'stunden_aktuelles_jahr')}
                  {sortKey === 'stunden_aktuelles_jahr' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('stunden_letzter_monat')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'stunden_letzter_monat')}
                  {sortKey === 'stunden_letzter_monat' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('stunden_letztes_quartal')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'stunden_letztes_quartal')}
                  {sortKey === 'stunden_letztes_quartal' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('stunden_letztes_jahr')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'stunden_letztes_jahr')}
                  {sortKey === 'stunden_letztes_jahr' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('leistungen')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'leistungen')}
                  {sortKey === 'leistungen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('projekte')}>
                <span className="inline-flex items-center gap-1">
                  {fieldLabel('berater/innen', 'projekte')}
                  {sortKey === 'projekte' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; navigate(`/berater/innen/${record.record_id}`); }}>
                <TableCell className="font-medium">{record.fields.nachname ?? '—'}</TableCell>
                <TableCell>{record.fields.vorname ?? '—'}</TableCell>
                <TableCell>{record.fields.titel ?? '—'}</TableCell>
                <TableCell>{record.fields.strasse ?? '—'}</TableCell>
                <TableCell>{record.fields.hausnummer ?? '—'}</TableCell>
                <TableCell>{record.fields.plz ?? '—'}</TableCell>
                <TableCell>{record.fields.ort ?? '—'}</TableCell>
                <TableCell>{record.fields.email_beruflich ?? '—'}</TableCell>
                <TableCell>{record.fields.email_privat ?? '—'}</TableCell>
                <TableCell>{record.fields.telefon ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.einstiegsdatum)}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{lookupLabel('berater/innen', 'status', record.fields.status?.key) ?? record.fields.status?.label ?? '—'}</span></TableCell>
                <TableCell>{record.fields.stundensatz ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.sonstiges_1 ?? '—'}</span></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.sonstiges_2 ?? '—'}</span></TableCell>
                <TableCell>{record.fields.stunden_aktueller_monat ?? '—'}</TableCell>
                <TableCell>{record.fields.stunden_aktuelles_quartal ?? '—'}</TableCell>
                <TableCell>{record.fields.stunden_aktuelles_jahr ?? '—'}</TableCell>
                <TableCell>{record.fields.stunden_letzter_monat ?? '—'}</TableCell>
                <TableCell>{record.fields.stunden_letztes_quartal ?? '—'}</TableCell>
                <TableCell>{record.fields.stunden_letztes_jahr ?? '—'}</TableCell>
                <TableCell>{Array.isArray(record.fields.leistungen) && record.fields.leistungen.length > 0 ? <div className="flex flex-wrap gap-1">{record.fields.leistungen.map((url: any, i: number) => <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getLeistungskatalogDisplayName(url)}</span>)}</div> : '—'}</TableCell>
                <TableCell>{Array.isArray(record.fields.projekte) && record.fields.projekte.length > 0 ? <div className="flex flex-wrap gap-1">{record.fields.projekte.map((url: any, i: number) => <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getProjekteDisplayName(url)}</span>)}</div> : '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={24} className="text-center py-16 text-muted-foreground">
                  {search ? t('no_results') : t('no_data_yet', { entity: appLabel('berater/innen') })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <BeraterInnenDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        recordId={editingRecord?.record_id}
        leistungskatalogList={leistungskatalogList}
        projekteList={projekteList}
        enablePhotoScan={AI_PHOTO_SCAN['BeraterInnen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['BeraterInnen']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('berater/innen') })}
        description={t('confirm_delete_desc')}
      />

    </PageShell>
  );
}