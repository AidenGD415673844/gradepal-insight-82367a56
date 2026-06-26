import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRef, useState } from "react";
import { Sparkles, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGrades } from "@/lib/grade-store";
import { spendCredits, estimateCost } from "@/lib/ai-credits";
import { Link } from "@tanstack/react-router";
import { callOpenRouter, OpenRouterError, type ORMessage } from "@/lib/openrouter";

type Result = {
  score: number;
  letter: string;
  summary: string;
  strengths: string[];
  improvements: string[];
};

export function AIGraderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [rubric, setRubric] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { scale } = useGrades();

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image file only.");
      return;
    }
    if (file.size > 1_500_000) {
      toast.error("Image is too large (max 1.5 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const cost = estimateCost("ai_grader", {
    chars: (text?.length ?? 0) + (rubric?.length ?? 0),
    hasImage: !!imageDataUrl,
  });

  const run = async () => {
    if (!text && !imageDataUrl) {
      toast.error("Provide text or an image");
      return;
    }
    // AI Credit gate — variable cost scaled by amount of work.
    const spend = spendCredits("ai_grader", {
      chars: (text?.length ?? 0) + (rubric?.length ?? 0),
      hasImage: !!imageDataUrl,
    });
    if (!spend.ok) {
      toast.error(
        `Not enough AI credits — need ${spend.need.toFixed(1)}, have ${spend.have.toFixed(1)}. Top up in the Pro Shop.`,
      );
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const sorted = [...scale].sort((a, b) => b.min - a.min);
      const scaleStr = sorted.map((s) => `${s.min}+ → ${s.letter}`).join(", ");
      // CRITICAL: keep base64 image data OUT of the text prompt string so the
      // JSON-extraction regex below never sees megabytes of pixel data.
      // Vision goes through an image_url content block instead.
      const textBlock = text
        ? `Student work (transcribed by student):\n${text}`
        : "Grade the attached image of the student's work.";
      const userContent: ORMessage["content"] = imageDataUrl
        ? [
            { type: "text", text: textBlock },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ]
        : textBlock;
      const raw = await callOpenRouter({
        feature: "grader",
        maxTokens: 700,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `You are a strict but fair teacher. Reply ONLY with JSON: {"score": int 0-100, "letter": string, "summary": string, "strengths": string[], "improvements": string[]}. Use exactly these letters: ${scaleStr}. ${rubric ? "Rubric: " + rubric : ""}`,
          },
          { role: "user", content: userContent },
        ],
      });
      const cleaned = raw.replace(/```json|```/gi, "").trim();
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned malformed grading output.");
      const parsed = JSON.parse(m[0]) as Result;
      const correct = sorted.find((s) => parsed.score >= s.min);
      if (correct) parsed.letter = correct.letter;
      setResult(parsed);
    } catch (e) {
      const msg = e instanceof OpenRouterError && e.busy
        ? "The AI Grader's free server is busy. Try again in a few seconds."
        : e instanceof Error ? e.message : "AI grading failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Grader
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Upload student work as text or image and get an AI-generated grade with feedback.
        </p>
        <div className="text-[11px] text-muted-foreground px-3">
          Estimated cost: <b>{cost.toFixed(1)} credits</b> (scales with input length).{" "}
          <Link to="/shop" className="underline text-primary">Top up</Link>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Rubric (optional)</Label>
            <Input
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              placeholder="e.g. 5th grade algebra homework"
            />
          </div>
          <div>
            <Label>Work as Text</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the student's work here…"
              rows={5}
            />
          </div>
          <div>
            <Label>Or Upload Image</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" /> {imageDataUrl ? "Change image" : "Click to upload"}
              </Button>
              {imageDataUrl && (
                <Button variant="ghost" onClick={() => setImageDataUrl(null)}>
                  Remove
                </Button>
              )}
            </div>
            <Input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {imageDataUrl && (
              <img src={imageDataUrl} alt="" className="mt-2 max-h-40 rounded-lg border" />
            )}
          </div>
          <Button onClick={run} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Grading…</>
            ) : (
              "Grade Work"
            )}
          </Button>
        </div>

        {result && (
          <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-primary">
                {result.score}/100
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {result.letter}
              </div>
            </div>
            <p className="text-sm">{result.summary}</p>
            {result.strengths?.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-success mb-1">Strengths</div>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.improvements?.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-warning-foreground mb-1">
                  Areas for Improvement
                </div>
                <ul className="space-y-1">
                  {result.improvements.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
