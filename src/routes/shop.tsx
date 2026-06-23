import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  TIERS,
  type Tier,
  type TierMeta,
  usePremium,
  spendWallet,
  activateTier,
  switchTierFree,
  checkPurchase,
  verifyCipherToken,
  getMasters,
  redeemCode,
  WALLET_CAP,
} from "@/lib/premium";
import { grantCredits } from "@/lib/ai-credits";
import {
  Crown,
  Wallet,
  Tag,
  CheckCircle2,
  Sparkles,
  Phone,
  GraduationCap,
  KeyRound,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "GradePal Pro Shop — GradeCalc" },
      {
        name: "description",
        content:
          "Unlock GradePal Pro and Student tiers. Pay using your local referral wallet, redeem a promo code, or request a manual voucher key via WhatsApp.",
      },
      { property: "og:title", content: "GradePal Pro Shop" },
      { property: "og:description", content: "Subscription tiers, wallet checkout and promo code redemption — all client-side." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/shop" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/shop" }],
  }),
  component: ShopPage,
});

function TierCard({ meta }: { meta: TierMeta }) {
  const { wallet, tier } = usePremium();
  const active = tier?.tier === meta.id;
  const canAfford = wallet >= meta.hkd;
  const check = checkPurchase(meta.id);
  const isFreeSwitch = check.kind === "free";
  const isBlocked = check.kind === "block";

  const buy = () => {
    const c = checkPurchase(meta.id);
    if (c.kind === "block") {
      toast.error(c.reason);
      return;
    }
    if (c.kind === "free") {
      switchTierFree(meta.id, "wallet-switch");
      toast.success(`Switched to ${meta.label} — no charge (carried over remaining value).`);
      return;
    }
    if (!spendWallet(meta.hkd)) {
      toast.error(`Need $${meta.hkd.toFixed(2)} HKD — wallet has $${wallet.toFixed(2)}.`);
      return;
    }
    activateTier(meta.id, "wallet");
    toast.success(`${meta.label} activated!`);
  };

  return (
    <Card
      className={`p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        active ? "border-primary ring-2 ring-primary/30" : ""
      } ${meta.family === "student" ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/5" : "bg-gradient-to-br from-amber-500/10 to-orange-500/5"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {meta.family === "pro" ? (
            <Crown className="h-5 w-5 text-amber-600" />
          ) : (
            <GraduationCap className="h-5 w-5 text-emerald-600" />
          )}
          <div className="font-bold text-base">{meta.label}</div>
        </div>
        {active && <Badge className="bg-primary">Active</Badge>}
        {isFreeSwitch && !active && <Badge variant="secondary" className="text-[10px]">Free switch</Badge>}
      </div>
      <div className="text-3xl font-extrabold tabular-nums">
        ${meta.hkd}
        <span className="text-sm font-medium text-muted-foreground"> HKD</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {meta.durationDays === 7 && "Billed weekly · auto-expires after 7 days."}
        {meta.durationDays === 30 && "Billed monthly · 30-day access."}
        {meta.durationDays === 365 && "Best value · full 365 days."}
      </div>
      {isBlocked && (
        <div className="text-[11px] rounded-md bg-warning/10 border border-warning/30 text-warning-foreground p-1.5">
          {check.reason}
        </div>
      )}
      <Button
        onClick={buy}
        disabled={isBlocked || (check.kind === "charge" && !canAfford)}
        size="sm"
        className="gap-2 mt-auto transition-transform active:scale-95"
        variant={isFreeSwitch ? "outline" : "default"}
      >
        <Wallet className="h-4 w-4" />
        {isFreeSwitch ? "Switch For Free" : "Purchase Using Wallet"}
      </Button>
    </Card>
  );
}

function DeveloperCodeBox() {
  const [code, setCode] = useState("");

  const apply = () => {
    const raw = code.trim().toUpperCase();
    if (!raw) {
      toast.error("Enter the code your developer gave you.");
      return;
    }
    // Accept only cipher tokens + master keys (no public promo words here).
    const cipher = verifyCipherToken(raw);
    const master = getMasters().find((m) => m.key.toUpperCase() === raw);
    if (!cipher && !master) {
      toast.error("This input only accepts developer-issued subscription codes.");
      return;
    }
    const r = redeemCode(raw);
    if (r.ok) {
      toast.success(r.message);
      setCode("");
    } else {
      toast.error(r.message);
    }
  };

  return (
    <Card className="p-5 space-y-3 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 border-violet-500/30">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-violet-600" />
        <h3 className="font-bold text-base">Enter Code Given By Developer</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Redeem a private subscription key issued directly to you. For promo words and
        wallet credits, use the standard code box below.
      </p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="GP-XX-XXXXXX-XXXX  or  master key"
          onKeyDown={(e) => e.key === "Enter" && apply()}
          className="font-mono uppercase"
        />
        <Button onClick={apply} className="gap-2 transition-transform active:scale-95">
          <CheckCircle2 className="h-4 w-4" /> Redeem
        </Button>
      </div>
    </Card>
  );
}

function CodeBox() {
  const [code, setCode] = useState("");
  const [flash, setFlash] = useState<null | { ok: boolean; msg: string }>(null);

  const apply = () => {
    const r = redeemCode(code);
    setFlash({ ok: r.ok, msg: r.message });
    if (r.ok) {
      toast.success(r.message);
      setCode("");
    } else {
      toast.error(r.message);
    }
    setTimeout(() => setFlash(null), 3500);
  };

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-base">Enter Code Here</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Redeem a promo word, master license, or scrambled validation token. One redemption per device.
      </p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. WELCOME10  or  GP-PM-ABC123-1F2E"
          onKeyDown={(e) => e.key === "Enter" && apply()}
          className="font-mono uppercase"
        />
        <Button onClick={apply} className="gap-2 transition-transform active:scale-95">
          <CheckCircle2 className="h-4 w-4" /> Apply Code
        </Button>
      </div>
      {flash && (
        <div
          className={`text-sm rounded-lg p-3 border animate-fade-in transition-all ${
            flash.ok
              ? "bg-success/10 border-success/30 text-success-foreground"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {flash.msg}
        </div>
      )}
    </Card>
  );
}

function ShopPage() {
  const { wallet, tier } = usePremium();
  const pro = TIERS.filter((t) => t.family === "pro");
  const student = TIERS.filter((t) => t.family === "student");

  return ShopBody({ wallet, tier, pro, student });
}

function ShopBody({ wallet, tier, pro, student }: { wallet: number; tier: ReturnType<typeof usePremium>["tier"]; pro: TierMeta[]; student: TierMeta[] }) {

  return (
    <AppShell title="GradePal Pro Shop">
      <div className="space-y-5">
        <Card className="p-5 bg-gradient-to-br from-primary/15 to-primary/5 border-primary/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-card flex items-center justify-center shadow-soft">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Referral wallet balance</div>
              <div className="text-3xl font-extrabold tabular-nums">
                ${wallet.toFixed(2)}
                <span className="text-sm font-medium text-muted-foreground"> HKD</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                +$1.00 HKD per new peer accepted · cap ${WALLET_CAP} HKD
              </div>
            </div>
          </div>
          {tier && (
            <div className="text-right">
              <Badge className="bg-primary mb-1">Active</Badge>
              <div className="text-sm font-bold">
                {TIERS.find((t) => t.id === tier.tier)?.label}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Expires {new Date(tier.expiresAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </Card>

        <div>
          <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-600" /> GradePal Pro tiers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pro.map((t) => (
              <TierCard key={t.id} meta={t} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-emerald-600" /> Student tiers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {student.map((t) => (
              <TierCard key={t.id} meta={t} />
            ))}
          </div>
        </div>

        <CodeBox />
        <DeveloperCodeBox />

        <TopUpsCard />

        <Card className="p-5 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border-indigo-500/30">
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm flex items-center gap-2">
                International Voucher Payments
                <Sparkles className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Card processing is restricted. To purchase via a digital gift card voucher
                code, please contact the developer via WhatsApp/SMS at{" "}
                <a
                  href="https://wa.me/85266190340"
                  className="font-mono font-semibold text-indigo-600 hover:underline"
                >
                  +852 6619 0340
                </a>{" "}
                with an attached note to receive your premium access key pass.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}