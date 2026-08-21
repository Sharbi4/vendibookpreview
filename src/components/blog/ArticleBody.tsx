import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

/**
 * Renders blog article content that may be stored either as HTML (newer posts)
 * or as Markdown (older posts). A single detection pass decides which path to
 * use so individual articles never have to be migrated by hand.
 */

const HTML_BLOCK_RE = /<(p|div|h[1-6]|ul|ol|li|table|section|blockquote|img|figure|span|strong|em|a)\b[^>]*>/i;
const MD_SIGNAL_RE = /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|\|.+\|)/;

export function isMarkdownContent(content: string): boolean {
  const trimmed = (content || '').trim();
  if (!trimmed) return false;
  // HTML posts open with a tag and contain block-level markup throughout.
  if (HTML_BLOCK_RE.test(trimmed)) return false;
  return MD_SIGNAL_RE.test(trimmed);
}

const PROSE_CLASSES = [
  'prose prose-lg max-w-none',
  'prose-headings:text-foreground prose-headings:font-bold prose-headings:break-words',
  'prose-h1:text-3xl md:prose-h1:text-4xl prose-h1:leading-tight',
  'prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:leading-snug',
  'prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3',
  'prose-p:text-muted-foreground prose-p:leading-relaxed',
  'prose-strong:text-foreground',
  'prose-a:text-primary hover:prose-a:text-primary/80 prose-a:break-words',
  'prose-ul:text-muted-foreground prose-ol:text-muted-foreground prose-li:text-muted-foreground',
  'prose-blockquote:text-muted-foreground prose-blockquote:border-primary',
  'prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
  'prose-pre:bg-muted prose-pre:overflow-x-auto',
  'prose-img:rounded-2xl prose-img:w-full prose-img:h-auto',
  'prose-table:text-muted-foreground prose-th:text-foreground prose-td:border-border prose-th:border-border',
  'break-words [overflow-wrap:anywhere]',
].join(' ');

interface ArticleBodyProps {
  content: string;
  className?: string;
}

const ArticleBody = ({ content, className }: ArticleBodyProps) => {
  const markdown = useMemo(() => isMarkdownContent(content), [content]);

  const sanitizedHtml = useMemo(() => {
    if (markdown) return '';
    return DOMPurify.sanitize(content, {
      ADD_ATTR: ['data-cta', 'target', 'rel'],
    });
  }, [content, markdown]);

  const wrapperClass = `${PROSE_CLASSES}${className ? ` ${className}` : ''}`;

  if (markdown) {
    return (
      <div className={wrapperClass}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="overflow-x-auto my-6">
                <table className="w-full text-left text-sm border-collapse">{children}</table>
              </div>
            ),
            th: ({ children }) => <th className="py-3 pr-4 font-semibold border-b">{children}</th>,
            td: ({ children }) => <td className="py-3 pr-4 border-b border-border/60 align-top">{children}</td>,
            input: (props) => (
              <input
                {...props}
                disabled
                className="mr-2 align-middle accent-primary"
              />
            ),
            a: ({ href, children }) => (
              <a href={href} className="text-primary underline font-medium">
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className={wrapperClass} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
  );
};

export default ArticleBody;
