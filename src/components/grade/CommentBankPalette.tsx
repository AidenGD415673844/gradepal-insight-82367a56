import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, MessageSquarePlus, Copy } from "lucide-react";
import { toast } from "sonner";

const PRESETS: Record<string, string[]> = {
  cognitive: [
    "Demonstrates strong analytical reasoning, consistently breaking complex problems into manageable components and arriving at well-justified conclusions.",
    "Applies prior knowledge fluently to unfamiliar contexts, transferring concepts across topics with notable independence.",
    "Would benefit from slowing down on multi-step questions to verify each stage before progressing — small procedural slips are masking otherwise solid understanding.",
    "Shows emerging strength in evaluating alternative strategies; further practice with open-ended problem sets will sharpen decision-making under time pressure.",
  ],
  communication: [
    "Articulates ideas with clarity and structure, supporting arguments with relevant evidence and precise subject vocabulary.",
    "Written work is well-organised; continued focus on signposting between paragraphs will elevate the overall flow and persuasive force.",
    "Contributes thoughtfully to discussions, listening actively before extending peers' contributions with substantive additions.",
    "Should aim to consolidate technical terminology in written responses to match the strength already shown in oral explanations.",
  ],
  autonomy: [
    "Approaches independent work with discipline and self-direction, meeting deadlines without prompting and submitting tasks of consistent quality.",
    "Manages workload effectively, prioritising challenging tasks and using lesson time productively.",
    "Would benefit from initiating questions earlier in the learning cycle rather than waiting until revision — proactive clarification will compound progress.",
    "Engagement during lessons is strong; sustaining that same intensity into homework completion will close the gap between class performance and assessment outcomes.",
  ],
};

/**
 * Collapsible palette of teacher-comment presets. Clicking a preset
 * smoothly appends the phrase to the supplied target text field AND
 * mirrors it onto the clipboard.
 */
export function CommentBankPalette({
  value,
  onAppend,
}: {
  value: string;
  onAppend: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const handlePick = async (phrase: string) => {
    const sep = value && !/\s$/.test(value) ? " " : "";
    onAppend((value ?? "") + sep + phrase);
    try {
      await navigator.clipboard.writeText(phrase);
      toast.success("Comment appended & copied to clipboard");
    } catch {
      toast.success("Comment appended");
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/50"
        >
          <span className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
            Comment Bank Palette
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <Tabs defaultValue="cognitive">
          <TabsList className="grid grid-cols-3 h-auto">
            <TabsTrigger value="cognitive" className="text-[11px] whitespace-normal py-1.5">
              Cognitive & Problem-Solving
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-[11px] whitespace-normal py-1.5">
              Communication & Expression
            </TabsTrigger>
            <TabsTrigger value="autonomy" className="text-[11px] whitespace-normal py-1.5">
              Autonomy & Engagement
            </TabsTrigger>
          </TabsList>
          {(["cognitive", "communication", "autonomy"] as const).map((key) => (
            <TabsContent key={key} value={key} className="space-y-2 mt-2">
              {PRESETS[key].map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePick(p)}
                  className="w-full text-left text-xs p-2 rounded-md border bg-card hover:bg-muted/60 flex items-start gap-2 transition-colors"
                >
                  <Copy className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="leading-relaxed">{p}</span>
                </button>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}