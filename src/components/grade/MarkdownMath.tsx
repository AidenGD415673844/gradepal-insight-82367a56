import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// Normalises common LaTeX forms LLMs emit so remark-math can parse them:
//   - \( ... \)  -> $ ... $
//   - \[ ... \]  -> $$ ... $$
function normaliseMath(src: string): string {
  return src
    .replace(/\\\((.+?)\\\)/gs, (_, m) => `$${m}$`)
    .replace(/\\\[(.+?)\\\]/gs, (_, m) => `$$${m}$$`);
}

export function MarkdownMath({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {normaliseMath(content)}
      </ReactMarkdown>
    </div>
  );
}
