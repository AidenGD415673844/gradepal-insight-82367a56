import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ShieldOff, ShieldCheck } from "lucide-react";
import {
  configurePin,
  disablePin,
  lockVaultNow,
  usePinVault,
} from "@/lib/pin-vault";
import { toast } from "sonner";

export function PinVaultPanel() {
  const { configured, locked } = usePinVault();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const setupPin = async () => {
    if (!/^\d{4}$/.test(pin)) return toast.error("PIN must be 4 digits.");
    if (pin !== confirm) return toast.error("PIN and confirmation do not match.");
    setBusy(true);
    try {
      await configurePin(pin);
      toast.success("Vault locked. Re-enter PIN to view data.");
      setPin("");
      setConfirm("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removePin = async () => {
    if (!/^\d{4}$/.test(pin)) return toast.error("Enter current PIN to disable.");
    setBusy(true);
    const ok = await disablePin(pin);
    setBusy(false);
    if (!ok) return toast.error("Incorrect PIN.");
    toast.success("Vault disabled.");
    setPin("");
  };

  const lockNow = async () => {
    if (!/^\d{4}$/.test(pin)) return toast.error("Enter PIN to lock now.");
    setBusy(true);
    const ok = await lockVaultNow(pin);
    setBusy(false);
    if (!ok) return toast.error("Incorrect PIN.");
    toast.success("Vault re-locked.");
    setPin("");
  };

  return (
    <Card className="p-5 max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Zero-Knowledge Vault PIN</h2>
        {configured && (
          <span className={`ml-auto text-[10px] font-bold uppercase rounded px-2 py-0.5 ${locked ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700"}`}>
            {locked ? "Locked" : "Unlocked"}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Encrypt subjects, peer logs, chat history, and timetable blocks with a
        4-digit PIN. A Base64+XOR cipher keyed to your PIN scrambles registry
        strings in <code>localStorage</code>; entering the PIN descrambles
        in-memory so charts re-render. This is a local privacy shroud, not
        bank-grade cryptography.
      </p>
      {!configured ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="numeric"
              maxLength={4}
              placeholder="New 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="text-center tracking-[0.4em] font-mono"
            />
            <Input
              inputMode="numeric"
              maxLength={4}
              placeholder="Confirm PIN"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="text-center tracking-[0.4em] font-mono"
            />
          </div>
          <Button onClick={setupPin} disabled={busy} className="gap-2">
            <ShieldCheck className="h-4 w-4" /> Activate Vault PIN
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            inputMode="numeric"
            maxLength={4}
            placeholder="Enter current PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="text-center tracking-[0.4em] font-mono max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            {!locked && (
              <Button onClick={lockNow} disabled={busy} variant="outline" className="gap-2">
                <Lock className="h-4 w-4" /> Lock Now
              </Button>
            )}
            <Button onClick={removePin} disabled={busy} variant="ghost" className="gap-2 text-destructive">
              <ShieldOff className="h-4 w-4" /> Disable Vault PIN
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
