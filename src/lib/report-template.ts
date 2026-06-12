import { useEffect, useState } from "react";

export type TemplateId = "preset" | "simple" | "modern" | "k12" | "college" | "international";
export type LangId = "en" | "es" | "fr" | "zh";

export type ReportTemplate = {
  template: TemplateId;
  lang: LangId;
  schoolName: string;
  accent: string; // hex color
  font: "system" | "serif" | "mono";
  logoDataUrl: string | null;
};

export const DEFAULT_TEMPLATE: ReportTemplate = {
  template: "preset",
  lang: "en",
  schoolName: "",
  accent: "#6366f1",
  font: "system",
  logoDataUrl: null,
};

const KEY = "gradecalc-report-template-v1";

export function loadTemplate(): ReportTemplate {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_TEMPLATE;
    return { ...DEFAULT_TEMPLATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

export function saveTemplate(t: ReportTemplate) {
  localStorage.setItem(KEY, JSON.stringify(t));
}

export function useReportTemplate(): [ReportTemplate, (t: Partial<ReportTemplate>) => void] {
  const [t, setT] = useState<ReportTemplate>(DEFAULT_TEMPLATE);
  useEffect(() => {
    setT(loadTemplate());
  }, []);
  const update = (p: Partial<ReportTemplate>) => {
    setT((prev) => {
      const next = { ...prev, ...p };
      saveTemplate(next);
      return next;
    });
  };
  return [t, update];
}

/** Translation dictionary — no AI/network, pure static map. */
export const I18N: Record<LangId, Record<string, string>> = {
  en: {
    reportCard: "Academic Report Card",
    teacher: "Teacher",
    aspirational: "Aspirational Goal",
    previous: "Previous",
    termGrade: "Term Grade",
    comments: "Teacher Comments",
    strengths: "Strengths",
    trends: "Trends",
    commendations: "Commendations",
    responsibility: "Responsibility",
    improvement: "Improvement",
    templates: "Templates",
    vsClass: "vs class avg",
    badges: "Badges",
    school: "School",
  },
  es: {
    reportCard: "Boletín Académico",
    teacher: "Profesor",
    aspirational: "Meta Aspiracional",
    previous: "Anterior",
    termGrade: "Nota del Periodo",
    comments: "Comentarios del Profesor",
    strengths: "Fortalezas",
    trends: "Tendencias",
    commendations: "Reconocimientos",
    responsibility: "Responsabilidad",
    improvement: "Mejora",
    templates: "Plantillas",
    vsClass: "vs media de clase",
    badges: "Insignias",
    school: "Escuela",
  },
  fr: {
    reportCard: "Bulletin Scolaire",
    teacher: "Enseignant",
    aspirational: "Objectif",
    previous: "Précédent",
    termGrade: "Note du Trimestre",
    comments: "Commentaires",
    strengths: "Points Forts",
    trends: "Tendances",
    commendations: "Félicitations",
    responsibility: "Responsabilité",
    improvement: "Amélioration",
    templates: "Modèles",
    vsClass: "vs moy. classe",
    badges: "Badges",
    school: "École",
  },
  zh: {
    reportCard: "学业成绩单",
    teacher: "教师",
    aspirational: "目标等级",
    previous: "上学期",
    termGrade: "本学期成绩",
    comments: "教师评语",
    strengths: "优势",
    trends: "趋势",
    commendations: "表扬",
    responsibility: "责任感",
    improvement: "改进",
    templates: "模板",
    vsClass: "对比班级均分",
    badges: "徽章",
    school: "学校",
  },
};

export const TEMPLATE_OPTIONS: { id: TemplateId; label: string; hint: string }[] = [
  { id: "preset", label: "Selected Preset", hint: "Current full layout" },
  { id: "simple", label: "Simple", hint: "Minimal, single column" },
  { id: "modern", label: "Modern", hint: "Gradient header, large grade" },
  { id: "k12", label: "K-12", hint: "Standards-friendly" },
  { id: "college", label: "College", hint: "GPA-forward layout" },
  { id: "international", label: "International", hint: "IB/IGCSE style" },
];

export const LANG_OPTIONS: { id: LangId; label: string }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "zh", label: "中文" },
];

export function computeBadges(args: {
  avg: number;
  prevAvg: number | null;
  completion: number;
  hasData: boolean;
}): { label: string; emoji: string; tone: "good" | "warn" | "bad" }[] {
  const out: { label: string; emoji: string; tone: "good" | "warn" | "bad" }[] = [];
  if (!args.hasData) return out;
  if (args.avg >= 91) out.push({ label: "Top Performer", emoji: "🏆", tone: "good" });
  else if (args.avg >= 81) out.push({ label: "Honor Roll", emoji: "⭐", tone: "good" });
  if (args.prevAvg != null && args.avg - args.prevAvg >= 5)
    out.push({ label: "Most Improved", emoji: "📈", tone: "good" });
  if (args.prevAvg != null && args.avg - args.prevAvg <= -5)
    out.push({ label: "Needs Attention", emoji: "⚠️", tone: "warn" });
  if (args.completion === 100)
    out.push({ label: "Perfect Completion", emoji: "✅", tone: "good" });
  else if (args.completion < 60)
    out.push({ label: "Missing Work", emoji: "📝", tone: "bad" });
  if (args.avg < 50) out.push({ label: "Support Needed", emoji: "🛟", tone: "bad" });
  return out;
}