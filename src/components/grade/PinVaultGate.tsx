import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ShieldCheck } from "lucide-react";
import { usePinVault, unlockVault } from "@/lib/pin-vault";
import { toast } from "sonner";

/** Full-viewport frosted-glass lock screen shown when the Vault is locked. */
export function PinVaultGate() {
  const { configured, locked } = usePinVault();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  if (!configured || !locked) return null;

  const submit = async () => {
    if (!/^\d{4}$/.test(pin)) {
      toast.error("Enter the 4-digit PIN.");
      return;
    }
    setBusy(true);
    const ok = await unlockVault(pin);
    setBusy(false);
    if (!ok) {
      toast.error("Incorrect PIN.");
      setPin("");
      return;
    }
    toast.success("Vault unlocked.");
    setPin("");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-2xl bg-background/70">
      <Card className="w-full max-w-sm p-6 space-y-4 shadow-2xl border-primary/30">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Grade Vault Locked</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Your local academic data is XOR-scrambled until you enter the 4-digit
          PIN. All decryption happens in-memory on this device.
        </p>
        <Input
          autoFocus
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="••••"
          className="text-center text-2xl tracking-[0.6em] font-mono h-14"
        />
        <Button onClick={submit} disabled={busy} className="w-full gap-2">
          <ShieldCheck className="h-4 w-4" />
          {busy ? "Unlocking…" : "Unlock Vault"}
        </Button>
      </Card>
    </div>
  );
}
