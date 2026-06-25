import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  initialiseAuth,
  verifyPassword,
  resetWithRecovery,
  loadAuth,
  setUnlocked,
  isUnlocked,
} from "@/lib/teacher-auth";
import { Lock, KeyRound, Copy } from "lucide-react";
import { toast } from "sonner";
import { Printer } from "lucide-react";

type Mode = "login" | "create" | "recover";

export function TeacherAuthGate({ children }: { children: React.ReactNode }) {
  // Start in a neutral "hydrating" state so the SSR pass (which can't read
  // localStorage) renders identical markup to the client's first paint.
  // Without this, the server always renders "Create Teacher Password"
  // while a returning user's client renders "Teacher Gradebook Login",
  // triggering a React hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const [unlocked, setU] = useState<boolean>(false);
  const [mode, setMode] = useState<Mode>("login");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recovery, setRecovery] = useState("");
  const [showKey, setShowKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const locked = attempts >= 5;

  useEffect(() => {
    setU(isUnlocked());
    setMode(loadAuth() ? "login" : "create");
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="max-w-md mx-auto p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">Teacher Gradebook</h2>
        </div>
        <p className="text-xs text-muted-foreground">Loading…</p>
      </Card>
    );
  }

  if (unlocked) return <>{children}</>;

  const handleCreate = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { recoveryKey } = await initialiseAuth(password);
    setBusy(false);
    setShowKey(recoveryKey);
    setPassword("");
    setConfirm("");
  };

  const handleLogin = async () => {
    if (locked) return;
    setBusy(true);
    const ok = await verifyPassword(password);
    setBusy(false);
    if (ok) {
      setUnlocked(true);
      setU(true);
      setAttempts(0);
      toast.success("Teacher mode unlocked.");
    } else {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 5) {
        setOverrideOpen(true);
        toast.error("5 failed attempts — panel frozen. Enter recovery key to override.");
      } else {
        toast.error(`Incorrect password (${next}/5).`);
      }
    }
  };

  const printCertificate = () => {
    if (!showKey) return;
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Emergency Recovery Certificate</title>
      <style>
        body{font-family:Georgia,serif;margin:48px;color:#000;background:#fff}
        h1{border-bottom:3px double #000;padding-bottom:6pt;margin:0 0 12pt}
        .key{font-family:ui-monospace,monospace;font-size:22pt;letter-spacing:0.25em;border:2px solid #000;padding:18pt;text-align:center;margin:18pt 0}
        p{font-size:11pt;line-height:1.55}
        .seal{margin-top:36pt;font-size:9pt;color:#444;border-top:1px solid #888;padding-top:6pt}
      </style></head><body>
      <h1>GradePal — Emergency Recovery Certificate</h1>
      <p>This certificate stores your one-time 16-digit Master Alpha-Numeric Security Key. It is the sole offline override for your local teacher gradebook vault. Keep it physically secure.</p>
      <div class="key">${showKey}</div>
      <p><b>Issued:</b> ${new Date().toLocaleString()}<br/><b>Vault:</b> Teacher Gradebook · local device only</p>
      <p>To override a frozen login, enter this exact key on the lock screen and choose a new password. A fresh certificate is issued on every reset.</p>
      <div class="seal">Generated entirely offline · No server transmission · GradePal Local Vault</div>
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  const handleRecover = async () => {
    if (password.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const res = await resetWithRecovery(recovery, password);
    setBusy(false);
    if (!res.ok) {
      toast.error("Recovery key is incorrect.");
      return;
    }
    setShowKey(res.recoveryKey);
    setRecovery("");
    setPassword("");
  };

  return (
    <>
      <Card className="max-w-md mx-auto p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">
            {mode === "create"
              ? "Create Teacher Password"
              : mode === "recover"
                ? "Reset Password with Recovery Key"
                : "Teacher Gradebook Login"}
          </h2>
        </div>

        {mode === "create" && (
          <>
            <p className="text-xs text-muted-foreground">
              On first use, set a master password. A one-time 16-digit recovery
              key will be generated for password reset.
            </p>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Label>Confirm Password</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button onClick={handleCreate} disabled={busy} className="w-full">
              Create Password
            </Button>
          </>
        )}

        {mode === "login" && !locked && (
          <>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} disabled={busy} className="w-full">
              Unlock
            </Button>
            {attempts > 0 && (
              <div className="text-[11px] text-rose-500 font-semibold text-center">
                {attempts}/5 failed attempts
              </div>
            )}
            <button
              onClick={() => setMode("recover")}
              className="text-xs text-primary hover:underline w-full text-center"
            >
              Forgot password?
            </button>
          </>
        )}

        {mode === "login" && locked && (
          <div className="space-y-3 rounded-xl border border-rose-500/50 bg-rose-500/10 p-4">
            <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              Vault frozen — 5 invalid attempts
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              Inputs are disabled. Enter your 16-digit Emergency Recovery Key below to override and reset credentials offline.
            </p>
            <Label>Recovery Key</Label>
            <Input value={recovery} onChange={(e) => setRecovery(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" />
            <Label>New Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button onClick={handleRecover} disabled={busy} className="w-full">
              Override &amp; Reset
            </Button>
          </div>
        )}

        {mode === "recover" && (
          <>
            <p className="text-xs text-muted-foreground">
              Enter your 16-digit recovery key (XXXX-XXXX-XXXX-XXXX) and choose
              a new password.
            </p>
            <div className="space-y-2">
              <Label>Recovery Key</Label>
              <Input value={recovery} onChange={(e) => setRecovery(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" />
              <Label>New Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button onClick={handleRecover} disabled={busy} className="w-full">
              Reset Password
            </Button>
            <button
              onClick={() => setMode("login")}
              className="text-xs text-muted-foreground hover:underline w-full text-center"
            >
              Back to login
            </button>
          </>
        )}
      </Card>

      <Dialog open={!!showKey} onOpenChange={(o) => !o && (setShowKey(null), setMode("login"))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Your Recovery Key
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copy and write down this recovery key. If you forget your password,
              this is the only way to reset the gradebook.
            </p>
            <div className="bg-muted rounded-lg p-4 text-center font-mono text-lg tracking-wider tabular-nums">
              {showKey}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (showKey) navigator.clipboard.writeText(showKey);
                toast.success("Recovery key copied.");
              }}
              className="gap-2"
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <Button variant="outline" onClick={printCertificate} className="gap-2">
              <Printer className="h-4 w-4" /> Print Recovery Certificate
            </Button>
            <Button
              onClick={() => {
                setShowKey(null);
                setMode("login");
                setAttempts(0);
              }}
            >
              I've saved it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}