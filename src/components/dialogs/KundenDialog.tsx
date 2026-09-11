/**
 * KundenDialog — pre-generated create/edit dialog for Kunden.
 *
 * Props: open, onClose, onSubmit(fields) => Promise<void>, defaultValues?,
 * recordId? (pass when EDITING — enables the attachments section),
 * projekteList (full hook array — resolves the Projekte applookup),
 * enablePhotoScan?, enablePhotoLocation?.
 *
 * defaultValues is SHAPE-TOLERANT and its prop type is the EXPORTED
 * KundenDialogDefaults — NOT the entity field type: lookup fields accept
 * the bare KEY string (or LookupValue), applookup fields the bare record id
 * (or record URL); the dialog normalizes. Type prefill STATE with the export:
 *  ❌ useState<Partial<Kunden['fields']>>({ … })   // LookupValue fields reject string prefills (TS2322)
 *  ✓ useState<KundenDialogDefaults | undefined>(undefined)
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Kunden, Projekte, LookupValue } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, extractRecordIds, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Kunden';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { requiredMessage } from '@/lib/journey/messages';
import { t, appLabel, fieldLabel, lookupLabel, localeTag, CURRENCY } from '@/i18n';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, MultiCombobox } from '@/components/Combobox';
import { ProjekteDialog } from '@/components/dialogs/ProjekteDialog';
import { DatePicker } from '@/components/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { IconAlertCircle, IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

/** Widened prefill type for KundenDialog.defaultValues — see file header. */
export type KundenDialogDefaults = Omit<Kunden['fields'], 'kundentyp' | 'bevorzugte_kontaktart'> & {
    kundentyp?: LookupValue | string;
    bevorzugte_kontaktart?: LookupValue | string;
  };

interface KundenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Kunden['fields']) => Promise<void>;
  /** SHAPE-TOLERANT: lookup fields accept the bare key (string) or the
   *  LookupValue object; applookup fields the bare record id or the full
   *  record URL — the dialog normalizes both. */
  defaultValues?: KundenDialogDefaults;
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  projekteList: Projekte[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

// defaultValues are SHAPE-TOLERANT: the dialog resolves bare lookup keys via
// its own options and bare record ids via the field's target app — consumers
// never carry the LookupValue/record-URL shape in their head.
const NORMALIZE_LOOKUPS: Record<string, readonly { key: string; label: string }[]> = {
  kundentyp: LOOKUP_OPTIONS['kunden']?.['kundentyp'] ?? [],
  bevorzugte_kontaktart: LOOKUP_OPTIONS['kunden']?.['bevorzugte_kontaktart'] ?? [],
};
const NORMALIZE_APPLOOKUPS: Record<string, string> = {
  laufende_projekte: APP_IDS.PROJEKTE,
};
function normalizeDefaults(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [k, opts] of Object.entries(NORMALIZE_LOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string') out[k] = opts.find(o => o.key === v) ?? { key: v, label: v };
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' ? opts.find(o => o.key === x) ?? { key: x, label: x } : x));
  }
  for (const [k, appId] of Object.entries(NORMALIZE_APPLOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string' && v !== '' && !v.startsWith('http')) out[k] = createRecordUrl(appId, v);
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' && x !== '' && !x.startsWith('http') ? createRecordUrl(appId, x) : x));
  }
  return out;
}

export function KundenDialog({ open, onClose, onSubmit, defaultValues, recordId, projekteList, enablePhotoScan = true, enablePhotoLocation = true }: KundenDialogProps) {
  const [fields, setFields] = useState<Partial<Kunden['fields']>>({});
  const [saving, setSaving] = useState(false);
  const normalizedDefaults = useMemo<Record<string, unknown> | undefined>(
    () => (defaultValues ? normalizeDefaults(defaultValues as Record<string, unknown>) : undefined),
    [defaultValues],
  );
  // Dirty-tracking: in edit-mode the Speichern button is disabled until the
  // user actually changes something. JSON.stringify is good enough for our
  // fields (plain values + LookupValue objects + string arrays).
  const isDirty = useMemo(() => {
    if (!normalizedDefaults) return true;  // create-mode: always allow submit
    try {
      return JSON.stringify(fields) !== JSON.stringify(normalizedDefaults);
    } catch {
      return true;
    }
  }, [fields, normalizedDefaults]);
  // Inline-Create state for "Projekte" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraProjekte` list, and select it in
  // the originating Combobox via the captured `createProjekteField`.
  const [createProjekteOpen, setCreateProjekteOpen] = useState(false);
  const [createProjekteInitial, setCreateProjekteInitial] = useState('');
  const [createProjekteField, setCreateProjekteField] = useState<string>('');
  const [extraProjekte, setExtraProjekte] = useState< Projekte[]>([]);
  const projekteListAll = useMemo(
    () => [...projekteList, ...extraProjekte],
    [projekteList, extraProjekte],
  );
  function openCreateProjekte(fieldKey: string, q: string) {
    setCreateProjekteField(fieldKey);
    setCreateProjekteInitial(q);
    setCreateProjekteOpen(true);
  }
  const [showErrors, setShowErrors] = useState(false);
  const REQUIRED_FIELDS = ['kundenname', 'kundentyp', 'email'] as const;
  const missingRequired = REQUIRED_FIELDS.filter(k => {
    const v = (fields as Record<string, unknown>)[k];
    return v == null || v === '' || (Array.isArray(v) && v.length === 0);
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  // Computed-field plumbing. Pure no-op when formEnhancements.computed is {}.
  // The number renderer uses computedValues only as a fallback when the user
  // hasn't typed anything — clearing the input always restores the computation.
  // computedContext exposes applookup list props so { kind: 'applookup', ... }
  // operands can resolve to numeric fields on the target record.
  const computedContext = useMemo<ComputedContext>(() => ({
    lookupLists: {
      'laufende_projekte': projekteList,
    },
  }), [projekteList, ]);
  const computedValues = useMemo<Record<string, number | null>>(() => {
    let out: Record<string, number | null> = {};
    const entries = Object.entries(formEnhancements.computed);
    for (let i = 0; i < 5; i++) {
      const merged: Record<string, unknown> = { ...(fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(out)) {
        if (v === null) continue;
        const cur = merged[k];
        if (cur === undefined || cur === null || cur === '') merged[k] = v;
      }
      const next: Record<string, number | null> = {};
      let changed = false;
      for (const [key, spec] of entries) {
        const v = evalComputed(spec, merged, computedContext);
        next[key] = v;
        if (v !== out[key]) changed = true;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  }, [fields, computedContext]);

  useEffect(() => {
    if (open) {
      setFields(applyDefaults(normalizedDefaults ?? {}, formEnhancements.defaults) as Partial<Kunden['fields']>);
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
      setSubmitError(null);
    }
  }, [open, normalizedDefaults]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  // Submit errors surface IN the dialog (it is modal — a banner in the page
  // body would be hidden behind it). A consumer onSubmit that THROWS (the
  // documented "throw to prevent closing" validation pattern) lands here:
  // the dialog stays open, nothing is saved, the message is visible.
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (missingRequired.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      // Fill empty number slots from computed values; user-typed values always win.
      // CRITICAL: only backend-mapped keys may be backfilled. Virtual computeds
      // (sub-agent invents `_netto`, `_bestellung_gesamtbetrag` etc. for the
      // "Berechnungen" display) have no backend counterpart — writing them
      // triggers a 422 from the Living-Apps API ("field does not exist").
      const merged = { ...fields };
      for (const [key, val] of Object.entries(computedValues)) {
        if (val === null) continue;
        if (!backendFieldSet.has(key)) continue;
        const cur = (merged as Record<string, unknown>)[key];
        if (cur === undefined || cur === null || cur === '') {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      const clean = cleanFieldsForApi(merged, 'kunden');
      await onSubmit(clean as Kunden['fields']);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : t('submit_error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="laufende_projekte" entity="Projekte">\n${JSON.stringify(projekteList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "kundenname": string | null, // Name / Firmenname\n  "kundentyp": LookupValue | null, // Kundentyp (select one key: "einzelperson" | "firma" | "behoerde" | "sonstiges") mapping: einzelperson=Einzelperson, firma=Firma, behoerde=Behörde, sonstiges=Sonstiges\n  "email": string | null, // E-Mail\n  "telefon": string | null, // Telefon\n  "strasse": string | null, // Straße\n  "hausnummer": string | null, // Hausnummer\n  "plz": string | null, // Postleitzahl\n  "ort": string | null, // Ort\n  "re_strasse": string | null, // Rechnungsstraße\n  "re_hausnummer": string | null, // Rechnungs-Hausnummer\n  "re_plz": string | null, // Rechnungs-Postleitzahl\n  "re_ort": string | null, // Rechnungs-Ort\n  "anlagedatum": string | null, // YYYY-MM-DD\n  "ap_titel": string | null, // Titel Ansprechpartner\n  "ap_vorname": string | null, // Vorname Ansprechpartner\n  "ap_nachname": string | null, // Nachname Ansprechpartner\n  "ap_email": string | null, // E-Mail Ansprechpartner\n  "ap_telefon": string | null, // Telefon Ansprechpartner\n  "bevorzugte_kontaktart": LookupValue | null, // Bevorzugte Kontaktart (select one key: "email" | "telefon" | "post" | "persoenlich") mapping: email=E-Mail, telefon=Telefon, post=Post, persoenlich=Persönlich\n  "letzter_kontakt_datum": string | null, // YYYY-MM-DD\n  "letzter_kontakt_ansprechpartner": string | null, // Ansprechpartner beim letzten Kontakt\n  "notizen": string | null, // Notizen\n  "laufende_projekte": string[] | null, // Display names from Projekte, one per referenced record (see <available-records>)\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["laufende_projekte"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const laufende_projekteNames = raw['laufende_projekte'];
        if (Array.isArray(laufende_projekteNames) && laufende_projekteNames.length > 0) {
          const laufende_projekteUrls = (laufende_projekteNames as unknown[])
            .map(n => projekteList.find(r => matchName(String(n), [String(r.fields.projektkennung ?? '')])))
            .filter((r): r is NonNullable<typeof r> => Boolean(r))
            .map(r => createRecordUrl(APP_IDS.PROJEKTE, r.record_id));
          if (laufende_projekteUrls.length > 0) merged['laufende_projekte'] = laufende_projekteUrls;
        }
        return merged as Partial<Kunden['fields']>;
      });
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error(`${t('scan_error')}:`, err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues
    ? t('edit_entity', { entity: appLabel('kunden') })
    : t('new_entity', { entity: appLabel('kunden') });

  const fieldBlocks: Record<string, React.ReactNode> = {
    'kundenname': (
      <div key="kundenname" className="space-y-1.5">
        <Label htmlFor="kundenname">{fieldLabel('kunden', 'kundenname')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="kundenname"
          placeholder=""
          value={fields.kundenname ?? ''}
          onChange={e => setFields(f => ({ ...f, kundenname: e.target.value }))}
          required
        />
        {showErrors && !fields.kundenname && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('kunden', 'kundenname')}</p>
        )}
      </div>
    ),
    'kundentyp': (
      <div key="kundentyp" className="space-y-1.5">
        <Label htmlFor="kundentyp">{fieldLabel('kunden', 'kundentyp')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.kundentyp) === 'einzelperson'}
            onClick={() => setFields(f => ({ ...f, kundentyp: (lookupKey(f.kundentyp) === 'einzelperson' ? undefined : 'einzelperson') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.kundentyp) === 'einzelperson'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('kunden', 'kundentyp', 'einzelperson') ?? 'Einzelperson'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.kundentyp) === 'firma'}
            onClick={() => setFields(f => ({ ...f, kundentyp: (lookupKey(f.kundentyp) === 'firma' ? undefined : 'firma') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.kundentyp) === 'firma'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('kunden', 'kundentyp', 'firma') ?? 'Firma'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.kundentyp) === 'behoerde'}
            onClick={() => setFields(f => ({ ...f, kundentyp: (lookupKey(f.kundentyp) === 'behoerde' ? undefined : 'behoerde') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.kundentyp) === 'behoerde'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('kunden', 'kundentyp', 'behoerde') ?? 'Behörde'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.kundentyp) === 'sonstiges'}
            onClick={() => setFields(f => ({ ...f, kundentyp: (lookupKey(f.kundentyp) === 'sonstiges' ? undefined : 'sonstiges') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.kundentyp) === 'sonstiges'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('kunden', 'kundentyp', 'sonstiges') ?? 'Sonstiges'}
          </button>
        </div>
        {showErrors && !fields.kundentyp && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('kunden', 'kundentyp')}</p>
        )}
      </div>
    ),
    'email': (
      <div key="email" className="space-y-1.5">
        <Label htmlFor="email">{fieldLabel('kunden', 'email')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          placeholder=""
          value={fields.email ?? ''}
          onChange={e => setFields(f => ({ ...f, email: e.target.value }))}
          required
        />
        {showErrors && !fields.email && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('kunden', 'email')}</p>
        )}
      </div>
    ),
    'telefon': (
      <div key="telefon" className="space-y-1.5">
        <Label htmlFor="telefon">{fieldLabel('kunden', 'telefon')}</Label>
        <Input
          id="telefon"
          type="tel"
          inputMode="tel"
          placeholder=""
          value={fields.telefon ?? ''}
          onChange={e => setFields(f => ({ ...f, telefon: e.target.value }))}
        />
      </div>
    ),
    'strasse': (
      <div key="strasse" className="space-y-1.5">
        <Label htmlFor="strasse">{fieldLabel('kunden', 'strasse')}</Label>
        <Input
          id="strasse"
          placeholder=""
          value={fields.strasse ?? ''}
          onChange={e => setFields(f => ({ ...f, strasse: e.target.value }))}
        />
      </div>
    ),
    'hausnummer': (
      <div key="hausnummer" className="space-y-1.5">
        <Label htmlFor="hausnummer">{fieldLabel('kunden', 'hausnummer')}</Label>
        <Input
          id="hausnummer"
          placeholder=""
          value={fields.hausnummer ?? ''}
          onChange={e => setFields(f => ({ ...f, hausnummer: e.target.value }))}
        />
      </div>
    ),
    'plz': (
      <div key="plz" className="space-y-1.5">
        <Label htmlFor="plz">{fieldLabel('kunden', 'plz')}</Label>
        <Input
          id="plz"
          placeholder=""
          value={fields.plz ?? ''}
          onChange={e => setFields(f => ({ ...f, plz: e.target.value }))}
        />
      </div>
    ),
    'ort': (
      <div key="ort" className="space-y-1.5">
        <Label htmlFor="ort">{fieldLabel('kunden', 'ort')}</Label>
        <Input
          id="ort"
          placeholder=""
          value={fields.ort ?? ''}
          onChange={e => setFields(f => ({ ...f, ort: e.target.value }))}
        />
      </div>
    ),
    're_strasse': (
      <div key="re_strasse" className="space-y-1.5">
        <Label htmlFor="re_strasse">{fieldLabel('kunden', 're_strasse')}</Label>
        <Input
          id="re_strasse"
          placeholder=""
          value={fields.re_strasse ?? ''}
          onChange={e => setFields(f => ({ ...f, re_strasse: e.target.value }))}
        />
      </div>
    ),
    're_hausnummer': (
      <div key="re_hausnummer" className="space-y-1.5">
        <Label htmlFor="re_hausnummer">{fieldLabel('kunden', 're_hausnummer')}</Label>
        <Input
          id="re_hausnummer"
          placeholder=""
          value={fields.re_hausnummer ?? ''}
          onChange={e => setFields(f => ({ ...f, re_hausnummer: e.target.value }))}
        />
      </div>
    ),
    're_plz': (
      <div key="re_plz" className="space-y-1.5">
        <Label htmlFor="re_plz">{fieldLabel('kunden', 're_plz')}</Label>
        <Input
          id="re_plz"
          placeholder=""
          value={fields.re_plz ?? ''}
          onChange={e => setFields(f => ({ ...f, re_plz: e.target.value }))}
        />
      </div>
    ),
    're_ort': (
      <div key="re_ort" className="space-y-1.5">
        <Label htmlFor="re_ort">{fieldLabel('kunden', 're_ort')}</Label>
        <Input
          id="re_ort"
          placeholder=""
          value={fields.re_ort ?? ''}
          onChange={e => setFields(f => ({ ...f, re_ort: e.target.value }))}
        />
      </div>
    ),
    'anlagedatum': (
      <div key="anlagedatum" className="space-y-1.5">
        <Label htmlFor="anlagedatum">{fieldLabel('kunden', 'anlagedatum')}</Label>
        <DatePicker
          id="anlagedatum"
          placeholder=""
          mode="date"
          value={fields.anlagedatum ?? null}
          onChange={v => setFields(f => ({ ...f, anlagedatum: v ?? undefined }))}
        />
      </div>
    ),
    'ap_titel': (
      <div key="ap_titel" className="space-y-1.5">
        <Label htmlFor="ap_titel">{fieldLabel('kunden', 'ap_titel')}</Label>
        <Input
          id="ap_titel"
          placeholder=""
          value={fields.ap_titel ?? ''}
          onChange={e => setFields(f => ({ ...f, ap_titel: e.target.value }))}
        />
      </div>
    ),
    'ap_vorname': (
      <div key="ap_vorname" className="space-y-1.5">
        <Label htmlFor="ap_vorname">{fieldLabel('kunden', 'ap_vorname')}</Label>
        <Input
          id="ap_vorname"
          placeholder=""
          value={fields.ap_vorname ?? ''}
          onChange={e => setFields(f => ({ ...f, ap_vorname: e.target.value }))}
        />
      </div>
    ),
    'ap_nachname': (
      <div key="ap_nachname" className="space-y-1.5">
        <Label htmlFor="ap_nachname">{fieldLabel('kunden', 'ap_nachname')}</Label>
        <Input
          id="ap_nachname"
          placeholder=""
          value={fields.ap_nachname ?? ''}
          onChange={e => setFields(f => ({ ...f, ap_nachname: e.target.value }))}
        />
      </div>
    ),
    'ap_email': (
      <div key="ap_email" className="space-y-1.5">
        <Label htmlFor="ap_email">{fieldLabel('kunden', 'ap_email')}</Label>
        <Input
          id="ap_email"
          type="email"
          inputMode="email"
          placeholder=""
          value={fields.ap_email ?? ''}
          onChange={e => setFields(f => ({ ...f, ap_email: e.target.value }))}
        />
      </div>
    ),
    'ap_telefon': (
      <div key="ap_telefon" className="space-y-1.5">
        <Label htmlFor="ap_telefon">{fieldLabel('kunden', 'ap_telefon')}</Label>
        <Input
          id="ap_telefon"
          type="tel"
          inputMode="tel"
          placeholder=""
          value={fields.ap_telefon ?? ''}
          onChange={e => setFields(f => ({ ...f, ap_telefon: e.target.value }))}
        />
      </div>
    ),
    'bevorzugte_kontaktart': (
      <div key="bevorzugte_kontaktart" className="space-y-1.5">
        <Label htmlFor="bevorzugte_kontaktart">{fieldLabel('kunden', 'bevorzugte_kontaktart')}</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.bevorzugte_kontaktart) === 'email'}
            onClick={() => setFields(f => ({ ...f, bevorzugte_kontaktart: (lookupKey(f.bevorzugte_kontaktart) === 'email' ? undefined : 'email') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.bevorzugte_kontaktart) === 'email'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('kunden', 'bevorzugte_kontaktart', 'email') ?? 'E-Mail'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.bevorzugte_kontaktart) === 'telefon'}
            onClick={() => setFields(f => ({ ...f, bevorzugte_kontaktart: (lookupKey(f.bevorzugte_kontaktart) === 'telefon' ? undefined : 'telefon') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.bevorzugte_kontaktart) === 'telefon'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('kunden', 'bevorzugte_kontaktart', 'telefon') ?? 'Telefon'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.bevorzugte_kontaktart) === 'post'}
            onClick={() => setFields(f => ({ ...f, bevorzugte_kontaktart: (lookupKey(f.bevorzugte_kontaktart) === 'post' ? undefined : 'post') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.bevorzugte_kontaktart) === 'post'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('kunden', 'bevorzugte_kontaktart', 'post') ?? 'Post'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.bevorzugte_kontaktart) === 'persoenlich'}
            onClick={() => setFields(f => ({ ...f, bevorzugte_kontaktart: (lookupKey(f.bevorzugte_kontaktart) === 'persoenlich' ? undefined : 'persoenlich') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.bevorzugte_kontaktart) === 'persoenlich'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('kunden', 'bevorzugte_kontaktart', 'persoenlich') ?? 'Persönlich'}
          </button>
        </div>
      </div>
    ),
    'letzter_kontakt_datum': (
      <div key="letzter_kontakt_datum" className="space-y-1.5">
        <Label htmlFor="letzter_kontakt_datum">{fieldLabel('kunden', 'letzter_kontakt_datum')}</Label>
        <DatePicker
          id="letzter_kontakt_datum"
          placeholder=""
          mode="date"
          value={fields.letzter_kontakt_datum ?? null}
          onChange={v => setFields(f => ({ ...f, letzter_kontakt_datum: v ?? undefined }))}
        />
      </div>
    ),
    'letzter_kontakt_ansprechpartner': (
      <div key="letzter_kontakt_ansprechpartner" className="space-y-1.5">
        <Label htmlFor="letzter_kontakt_ansprechpartner">{fieldLabel('kunden', 'letzter_kontakt_ansprechpartner')}</Label>
        <Input
          id="letzter_kontakt_ansprechpartner"
          placeholder=""
          value={fields.letzter_kontakt_ansprechpartner ?? ''}
          onChange={e => setFields(f => ({ ...f, letzter_kontakt_ansprechpartner: e.target.value }))}
        />
      </div>
    ),
    'notizen': (
      <div key="notizen" className="space-y-1.5">
        <Label htmlFor="notizen">{fieldLabel('kunden', 'notizen')}</Label>
        <Textarea
          id="notizen"
          placeholder=""
          value={fields.notizen ?? ''}
          onChange={e => setFields(f => ({ ...f, notizen: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'laufende_projekte': (
      <div key="laufende_projekte" className="space-y-1.5">
        <Label htmlFor="laufende_projekte">{fieldLabel('kunden', 'laufende_projekte')}</Label>
        <MultiCombobox
          id="laufende_projekte"
          placeholder=""
          items={projekteListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.projektkennung ?? r.record_id),
          }))}
          values={extractRecordIds(fields.laufende_projekte)}
          onChange={ids => setFields(f => ({ ...f, laufende_projekte: ids.length ? ids.map(id => createRecordUrl(APP_IDS.PROJEKTE, id)) as any : undefined }))}
          onCreateNew={(q) => openCreateProjekte("laufende_projekte", q)}
          createLabel={t('create_in', { entity: appLabel('projekte') })}
        />
      </div>
    ),
  };
  const orderedFields = applyFieldOrder(Object.keys(fieldBlocks), formEnhancements.fieldOrder);
  const orderedFieldsKey = orderedFields.map((it) => typeof it === 'string' ? it : it.row.join('+')).join(',');

  // Render-Modell für Computed-Felder:
  //
  //   • BACKEND-FELDER mit computed-Eintrag (z.B. gesamtpreis bei einer
  //     Katzenpension) bleiben als normales Eingabe-Feld stehen. Der Number-
  //     Input nutzt den computed-Wert als Vorschlag, der User kann jederzeit
  //     überschreiben (clearing → restore computed).
  //   • VIRTUELLE computed-Keys (Eintrag in formEnhancements.computed, ABER
  //     kein passendes Backend-Feld in orderedFields) erscheinen NICHT als
  //     Input, sondern unten als kompakte 'Berechnungen'-Übersicht oder als
  //     Inline-Hint unter dem letzten beitragenden Input.
  const FIELD_LABELS: Record<string, string> = {"kundenname": "Name / Firmenname", "kundentyp": "Kundentyp", "email": "E-Mail", "telefon": "Telefon", "strasse": "Straße", "hausnummer": "Hausnummer", "plz": "Postleitzahl", "ort": "Ort", "re_strasse": "Rechnungsstraße", "re_hausnummer": "Rechnungs-Hausnummer", "re_plz": "Rechnungs-Postleitzahl", "re_ort": "Rechnungs-Ort", "anlagedatum": "Anlagedatum", "ap_titel": "Titel Ansprechpartner", "ap_vorname": "Vorname Ansprechpartner", "ap_nachname": "Nachname Ansprechpartner", "ap_email": "E-Mail Ansprechpartner", "ap_telefon": "Telefon Ansprechpartner", "bevorzugte_kontaktart": "Bevorzugte Kontaktart", "letzter_kontakt_datum": "Datum letzter Kontakt", "letzter_kontakt_ansprechpartner": "Ansprechpartner beim letzten Kontakt", "notizen": "Notizen", "laufende_projekte": "Aktuell laufende Projekte"};
  const CURRENCY_KEYS = new Set<string>([]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"laufende_projekte": {"budget": "Budget (€)", "projektkennung": "Projektkennung", "projektnummer": "Projektnummer", "projektart": "Projektart", "projektstart_jahr": "Startjahr", "projektstart_monat": "Startmonat", "status": "Projektstatus", "ansprechpartner_kunde": "Ansprechpartner beim Kunden", "letzter_schritt": "Letzter Schritt / aktueller Stand", "projektende": "Geplantes Projektende", "notizen": "Notizen", "kunde": "Kunde", "projektleitung": "Projektleitung"}};
  const inputFields = useMemo(() => flattenFieldOrder(orderedFields), [orderedFieldsKey]);
  const backendFieldSet = useMemo(() => new Set(inputFields), [inputFields.join(',')]);
  const virtualComputed = useMemo(
    () => Object.fromEntries(
      Object.entries(formEnhancements.computed).filter(([k]) => !backendFieldSet.has(k)),
    ),
    [backendFieldSet],
  );
  const virtualFormEnhancements = useMemo(
    () => ({ ...formEnhancements, computed: virtualComputed }),
    [virtualComputed],
  );
  const computedLayout = useMemo(
    () => classifyComputed(virtualFormEnhancements, inputFields, computedDeps),
    [virtualFormEnhancements, inputFields.join(',')],
  );
  // Applookup-Referenzen: pro ownKey (Lookup-Feld im Form) die Liste der
  // lookupKeys, die in irgendeiner computed-Formel referenziert werden.
  // MODUS-1: aus dem Spec-Tree extrahiert. MODUS-2: aus dem Build-Time-
  // Export computedApplookupRefs (parse-formulas hat Regex-Pairs gesammelt).
  // Pro (ownKey, lookupKey)-Paar nur einmal; pro ownKey können aber mehrere
  // lookupKeys gleichzeitig auftauchen (z.B. einzelpreis UND karten10_preis
  // beim Yoga-Kurs), und alle werden separat als Inline-Hint gerendert.
  const applookupRefs = useMemo(
    () => mergeApplookupRefs(
      extractApplookupRefs(formEnhancements.computed),
      computedApplookupRefs,
    ),
    [],
  );
  function summaryLabel(k: string): string {
    if (FIELD_LABELS[k]) return FIELD_LABELS[k];
    // Leading underscore(s) als Virtual-Marker abstreifen; Unterstriche zu
    // Leerzeichen, jedes Wort kapitalisieren. Umlaute kommen vom Sub-Agent
    // direkt im Key (z. B. `_buchung_dauer_nächte`) — JS/TS/Vite unterstützen
    // Unicode-Identifier nativ, daher keine ASCII-Transliteration nötig.
    return k.replace(/^_+/, '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  function formatSummaryValue(k: string, v: unknown): string {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    // Backend-Feld mit €-Label ODER virtueller Computed-Key, dessen Name nach Geld aussieht.
    const looksLikeCurrency = CURRENCY_KEYS.has(k) || /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k);
    if (looksLikeCurrency) {
      return n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0 max-sm:[&>button]:size-10 max-sm:[&>button]:grid max-sm:[&>button]:place-items-center max-sm:[&>button]:rounded-full max-sm:[&>button]:border max-sm:[&>button]:border-input max-sm:[&>button]:bg-background max-sm:[&>button]:opacity-100 max-sm:[&>button>svg]:size-5">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <DialogTitle className="flex-1 truncate text-left">{DIALOG_INTENT}</DialogTitle>
          {enablePhotoScan && (
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              aria-expanded={aiOpen}
              aria-controls="ai-fill-panel"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 max-sm:py-2.5 max-sm:px-4 text-xs font-semibold transition-all mr-7 max-sm:mr-12 shadow-sm ${
                aiOpen
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 hover:border-primary/50'
              }`}
            >
              <IconSparkles className={`h-3.5 w-3.5 ${aiOpen ? '' : 'text-primary'}`} />
              <span className="hidden sm:inline">{t('smart_fill')}</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </DialogHeader>
        {enablePhotoScan && aiOpen && (
          <div id="ai-fill-panel" className="border-b bg-muted/20 px-6 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">{t('scan_header_sub')}</p>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  {t('useinfo_label')}
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? t('useinfo_loading') : `(${t('useinfo_more')})`}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">{t('profile_preamble')}</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">{t('useinfo_error')}</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_analyzing')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_analyzing_sub')}</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('scan_success')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_success_sub')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_upload')}</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />{t('scan_camera_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />{t('scan_file_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />{t('scan_doc_btn')}
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder={t('scan_text_placeholder')}
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title={t('paste')}
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />{t('scan_text_analyze')}
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 min-w-0 max-sm:[&_input]:h-11">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0">
            {(() => {
              const renderField = (k: string) => {
                const inlineHints = computedLayout.anchors[k] ?? [];
                const refs = applookupRefs[k] ?? [];
                return (
                  <div key={k} className="space-y-1.5 min-w-0">
                    {fieldBlocks[k]}
                    {refs.map(({ lookupKey }) => {
                      // Show the live numeric value the formula will pull from
                      // the selected lookup target (e.g. "Monatspreis: 34,90 €"
                      // under the Tarif combobox). Hidden while no lookup is
                      // selected or the target field is non-numeric.
                      const v = resolveApplookupRef(k, lookupKey, fields as Record<string, unknown>, computedContext);
                      if (v === null) return null;
                      const lbl = APPLOOKUP_LABELS[k]?.[lookupKey] ?? lookupKey;
                      const text = formatSummaryValue(lookupKey, v);
                      return (
                        <div key={`alh-${k}-${lookupKey}`} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{lbl}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                    {inlineHints.map((cKey) => {
                      const v = computedValues[cKey];
                      const text = formatSummaryValue(cKey, v);
                      if (text === '—') return null;
                      return (
                        <div key={cKey} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{summaryLabel(cKey)}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              };
              return orderedFields.map((item, idx) => {
                if (typeof item === 'string') return renderField(item);
                const cols = item.cols ?? `repeat(${item.row.length}, minmax(0, 1fr))`;
                return (
                  <div key={`row-${idx}`} className="grid gap-3" style={{ gridTemplateColumns: cols }}>
                    {item.row.map(renderField)}
                  </div>
                );
              });
            })()}
            {(computedLayout.aggregates.length > 0 || computedLayout.finalTotal) && (
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                {computedLayout.aggregates.length > 0 && (
                  <dl className="space-y-1.5 pb-2">
                    {computedLayout.aggregates.map((k) => {
                      const userVal = (fields as Record<string, unknown>)[k];
                      const computed = computedValues[k];
                      const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                      return (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <dt className="text-sm text-muted-foreground truncate">{summaryLabel(k)}</dt>
                          <dd className="text-sm font-medium tabular-nums whitespace-nowrap">{formatSummaryValue(k, v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {computedLayout.finalTotal && (() => {
                  const k = computedLayout.finalTotal;
                  const userVal = (fields as Record<string, unknown>)[k];
                  const computed = computedValues[k];
                  const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                  // Innere Border nur wenn aggregates existieren — sonst hätten wir
                  // zwei direkt aufeinanderfolgende Striche (Outer + Inner) mit nur
                  // einer Aggregat-Zeile dazwischen → zu viel visuelles Rauschen.
                  const sep = computedLayout.aggregates.length > 0 ? 'pt-3 border-t border-border' : 'pt-1';
                  return (
                    <div className={`flex justify-between items-baseline gap-3 ${sep}`}>
                      <span className="text-base font-semibold text-foreground">{summaryLabel(k)}</span>
                      <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground">{formatSummaryValue(k, v)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {showErrors && missingRequired.length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1.5" role="alert">
                <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
                {t('missing_required')}
              </p>
            )}
            {recordId && (
              <div className="pt-2 border-t border-border">
                <AttachmentsSection appId={APP_IDS.KUNDEN} recordId={recordId} />
              </div>
            )}
          </div>
          {submitError && (
            <div className="flex items-start gap-2 border-t border-destructive/20 bg-destructive/10 px-6 py-2.5 text-sm text-destructive" role="alert">
              <IconAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{submitError}</span>
            </div>
          )}
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2 max-sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="max-sm:h-12 max-sm:flex-1 max-sm:text-base">{t('cancel')}</Button>
            <Button
              type="submit"
              className="max-sm:h-12 max-sm:flex-1 max-sm:text-base"
              disabled={saving || !isDirty || (showErrors && missingRequired.length > 0)}
            >
              {saving ? t('saving') : defaultValues ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {createProjekteOpen && (
      <ProjekteDialog
        open={createProjekteOpen}
        onClose={() => setCreateProjekteOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createProjekteEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Projekte;
            setExtraProjekte(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.PROJEKTE, result.id);
            setFields(prev => ({ ...prev, [createProjekteField]: url } as any));
          }
          setCreateProjekteOpen(false);
        }}
        defaultValues={createProjekteInitial
          ? ({ projektkennung: createProjekteInitial } as any)
          : undefined}
        kundenList={[]}
        beraterInnenList={[]}
      />
    )}
    </>
  );
}