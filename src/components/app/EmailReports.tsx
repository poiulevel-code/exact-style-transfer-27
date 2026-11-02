import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sheet } from "@/components/app/Sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { sendReportNow, syncReportData } from "@/lib/report-mail.functions";

const CFG_KEY = "kuran-kursu-report-mail-v1";
type Cfg = { key: string; recipients: string[] };

function newKey() {
  const a = new Uint8Array(20);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
function loadCfg(): Cfg {
  try {
    const c = JSON.parse(localStorage.getItem(CFG_KEY) ?? "") as Cfg;
    if (/^[a-z0-9]{24,64}$/.test(c.key)) return { key: c.key, recipients: c.recipients ?? [] };
  } catch { /* new */ }
  const c = { key: newKey(), recipients: [] };
  localStorage.setItem(CFG_KEY, JSON.stringify(c));
  return c;
}
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Keeps the Cloud copy up to date (whenever data changes) and lets the user edit teacher emails. */
export function EmailReports({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { students, attendance } = useStore();
  const sync = useServerFn(syncReportData);
  const send = useServerFn(sendReportNow);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { const c = loadCfg(); setCfg(c); setText(c.recipients.join("\n")); }, []);

  const push = (c: Cfg) => sync({ data: { key: c.key, recipients: c.recipients, students, attendance } });

  // Auto-copy data to Cloud a moment after any change, once teachers are saved.
  useEffect(() => {
    if (!cfg?.recipients.length) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { push(cfg).catch((e) => console.error("Rapor verisi kopyalanamadı", e)); }, 3000);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, attendance, cfg]);

  const save = async () => {
    if (!cfg) return;
    const list = text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    const bad = list.filter((s) => !isEmail(s));
    if (bad.length) return setMsg(`Geçersiz adres: ${bad.join(", ")}`);
    if (list.length > 10) return setMsg("En fazla 10 adres ekleyebilirsiniz.");
    const c = { ...cfg, recipients: list };
    setBusy(true);
    try {
      await push(c);
      localStorage.setItem(CFG_KEY, JSON.stringify(c));
      setCfg(c);
      setMsg(list.length ? "Kaydedildi. Raporlar otomatik gönderilecek." : "Adresler silindi; otomatik gönderim kapalı.");
    } catch (e) { setMsg(`Kaydedilemedi: ${(e as Error).message}`); } finally { setBusy(false); }
  };

  const test = async () => {
    if (!cfg) return;
    setBusy(true);
    try {
      await push(cfg);
      const r = await send({ data: { key: cfg.key, kind: "daily" } });
      setMsg(`Test raporu ${r.count} adrese gönderildi.`);
    } catch (e) { setMsg(`Gönderilemedi: ${(e as Error).message}`); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Otomatik Rapor E-postası">
      <p className="text-sm text-muted-foreground">
        Namazı kaçıran talebelerin listesi şu zamanlarda gönderilir (İstanbul saati): her akşam 20:00 günlük, Pazar akşamı haftalık, ayın son günü aylık.
      </p>
      <label className="mt-4 block text-sm font-medium">Hoca e-postaları (her satıra bir adres)</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="hoca@ornek.com"
        className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm"
      />
      <Input className="hidden" readOnly />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={save} disabled={busy || !cfg}>Kaydet</Button>
        <Button variant="outline" onClick={test} disabled={busy || !cfg?.recipients.length}>Test gönder</Button>
      </div>
      {msg && <p className="mt-3 text-center text-sm text-primary">{msg}</p>}
    </Sheet>
  );
}
