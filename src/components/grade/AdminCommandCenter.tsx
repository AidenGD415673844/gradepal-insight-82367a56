import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TIERS,
  type Tier,
  generateCipherToken,
  getMasters,
  parseMasterRegistry,
  setMasters,
  setLocalPromos,
  getLocalPromos,
  K_SYSOP,
} from "@/lib/premium";
import { Shield, Copy, KeyRound, Lock, ScrollText, Megaphone } from "lucide-react";
import { toast } from "sonner";

const REQUIRED_TOKEN = "SYSOP-LO6130-99X72-GLOBAL";
const REQUIRED_PASS = "grADecaLC-2026-aiden63-smart";
const REQUIRED_PIN = "8752948803";

export function AdminCommandCenter({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [stage, setStage] = useState<"gate" | "open">("gate");
  const [tokenInput, setTokenInput] = useState(
    typeof window !== "undefined" ? localStorage.getItem(K_SYSOP) ?? "" : "",
  );
  const [pass, setPass] = useState("");
  const [pin, setPin] = useState("");

  const closeSelfDestruct = () => {
    setStage("gate");
    setPass("");
    setPin("");
    onOpenChange(false);
  };

  const tryUnlock = () => {
    // Persist token if user typed one
    if (tokenInput) localStorage.setItem(K_SYSOP, tokenInput);
    const stored = localStorage.getItem(K_SYSOP) ?? "";
    if (stored !== REQUIRED_TOKEN) {
      toast.error("Self-destruct: invalid sysop token.");
      closeSelfDestruct();
      return;
    }
    if (pass !== REQUIRED_PASS) {
      toast.error("Self-destruct: invalid developer password.");
      closeSelfDestruct();
      return;
    }
    if (pin !== REQUIRED_PIN) {
      toast.error("Self-destruct: invalid master PIN.");
      closeSelfDestruct();
      return;
    }
    setStage("open");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) closeSelfDestruct();
        else onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            System Administrator Command Center
          </DialogTitle>
        </DialogHeader>

        {stage === "gate" ? (
          <div className="space-y-3 animate-fade-in">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
              <Lock className="h-4 w-4 mt-0.5" />
              Three-factor device gate. Any failure self-destructs the modal.
            </div>
            <div>
              <Label>Sysop token (cached in browser)</Label>
              <Input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="SYSOP-XXXXX-XXXXX-GLOBAL"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Developer password</Label>
              <Input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                type="password"
                placeholder="••••••••••••"
              />
            </div>
            <div>
              <Label>Master PIN passcode</Label>
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                type="password"
                inputMode="numeric"
                placeholder="••••••••••"
                className="font-mono tabular-nums"
              />
            </div>
            <Button onClick={tryUnlock} className="w-full gap-2">
              <Shield className="h-4 w-4" /> Verify & Unlock
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="cipher" className="animate-fade-in">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cipher" className="gap-1.5">
                <KeyRound className="h-4 w-4" /> Cipher
              </TabsTrigger>
              <TabsTrigger value="master" className="gap-1.5">
                <ScrollText className="h-4 w-4" /> Master List
              </TabsTrigger>
              <TabsTrigger value="promo" className="gap-1.5">
                <Megaphone className="h-4 w-4" /> Promo Distributor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cipher" className="mt-4">
              <CipherTab />
            </TabsContent>
            <TabsContent value="master" className="mt-4">
              <MasterTab />
            </TabsContent>
            <TabsContent value="promo" className="mt-4">
              <PromoTab />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CipherTab() {
  const [tier, setTier] = useState<Tier>("pro_monthly");
  const [out, setOut] = useState<string[]>([]);

  const gen = () => {
    const token = generateCipherToken(tier);
    setOut((prev) => [token, ...prev].slice(0, 12));
    navigator.clipboard?.writeText(token).catch(() => undefined);
    toast.success("Token generated & copied");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Generates a scrambled token that passes the global verification equation on any
        device. One-shot per device on redemption.
      </p>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Select value={tier} onValueChange={(v) => setTier(v as Tier)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIERS.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label} (${t.hkd} HKD)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={gen} className="gap-2">
          <KeyRound className="h-4 w-4" /> Generate Validation Token
        </Button>
      </div>
      {out.length > 0 && (
        <div className="border rounded-lg divide-y bg-muted/30">
          {out.map((t) => (
            <div key={t} className="flex items-center justify-between p-2.5 font-mono text-sm">
              <span>{t}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(t);
                  toast.success("Copied");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MasterTab() {
  const existing = getMasters();
  const [text, setText] = useState(
    existing
      .map((m) =>
        m.kind === "tier" ? `${m.key}=tier:${m.tier}` : `${m.key}=${m.amount}`,
      )
      .join("\n"),
  );

  const save = () => {
    const parsed = parseMasterRegistry(text);
    setMasters(parsed);
    toast.success(`Saved ${parsed.length} master entr${parsed.length === 1 ? "y" : "ies"}.`);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Comma- or newline-separated <code>KEY=VALUE</code> pairs. Value is an HKD wallet
        amount (e.g. <code>VIP=50</code>) or <code>tier:&lt;id&gt;</code> to grant a
        subscription tier (e.g. <code>GOLDEN=tier:pro_annual</code>).
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="font-mono text-xs"
        placeholder={"GOLDEN=tier:pro_annual\nVIP=50\nMOON=tier:student_monthly"}
      />
      <Button onClick={save} className="gap-2">
        <ScrollText className="h-4 w-4" /> Save Master Registry
      </Button>
    </div>
  );
}

function PromoTab() {
  const [word, setWord] = useState("");
  const [hkd, setHkd] = useState<number>(10);
  const [snippet, setSnippet] = useState("");

  const exportPromo = () => {
    const code = word.trim().toUpperCase();
    if (!code) return toast.error("Enter a promo word");
    if (!Number.isFinite(hkd) || hkd <= 0) return toast.error("Enter a positive HKD value");

    // 1) Add to local promos (live immediately for this device)
    const local = getLocalPromos();
    const merged = [...local.filter((p) => p.code.toUpperCase() !== code), { code, hkd }];
    setLocalPromos(merged);

    // 2) Print global config snippet
    const out = `  { code: ${JSON.stringify(code)}, hkd: ${hkd} },`;
    setSnippet(out);
    navigator.clipboard?.writeText(out).catch(() => undefined);
    toast.success("Promo activated locally & snippet copied to clipboard");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Activates the code on this device immediately, then prints a snippet you can paste
        into <code>src/lib/premium-codes.ts → GLOBAL_PROMOS</code> to make it global for
        every user on next deploy.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-2">
        <div>
          <Label>Set Promo Word Code</Label>
          <Input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="WELCOME10"
            className="font-mono uppercase"
          />
        </div>
        <div>
          <Label>Balance Yield ($ HKD)</Label>
          <Input
            type="number"
            value={hkd}
            min={1}
            onChange={(e) => setHkd(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={exportPromo} className="gap-2 w-full">
            <Megaphone className="h-4 w-4" /> Export Global Config string
          </Button>
        </div>
      </div>
      {snippet && (
        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="text-[11px] text-muted-foreground mb-1.5">
            Paste into <code>GLOBAL_PROMOS</code> array:
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">{snippet}</pre>
        </div>
      )}
    </div>
  );
}