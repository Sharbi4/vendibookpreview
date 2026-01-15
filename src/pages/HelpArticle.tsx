import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ArrowLeft, List } from 'lucide-react';
import { getArticleBySlug, getAdjacentArticles, getRelatedArticles } from '@/data/helpArticles';

const HelpArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const article = slug ? getArticleBySlug(slug) : undefined;
  const { prev, next } = slug ? getAdjacentArticles(slug) : { prev: null, next: null };
  const relatedArticles = article ? getRelatedArticles(article) : [];

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
          <Button asChild><Link to="/help">Back to Help Center</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b bg-muted/30">
          <div className="container py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/help" className="hover:text-foreground">Help Center</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{article.category}</span>
            </div>
          </div>
        </div>

        <div className="container py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Table of Contents - Sidebar */}
            <aside className="lg:w-64 shrink-0">
              <div className="sticky top-4">
                <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/help')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Help Center
                </Button>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <List className="h-4 w-4" />
                      On This Page
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <nav className="space-y-1">
                      {article.sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className="block w-full text-left text-sm text-muted-foreground hover:text-primary py-1 transition-colors"
                        >
                          {section.title}
                        </button>
                      ))}
                    </nav>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Main Content */}
            <article className="flex-1 min-w-0">
              <Badge variant="secondary" className="mb-4">{article.category}</Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{article.title}</h1>
              <p className="text-lg text-muted-foreground mb-8">{article.description}</p>

              {/* Article Sections */}
              <div className="prose prose-slate dark:prose-invert max-w-none">
                {article.sections.map((section) => (
                  <section key={section.id} id={section.id} className="mb-10 scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-foreground mb-4 pb-2 border-b">{section.title}</h2>
                    <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {section.content.split('\n').map((paragraph, i) => {
                        if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                          return <h3 key={i} className="text-lg font-semibold text-foreground mt-6 mb-2">{paragraph.replace(/\*\*/g, '')}</h3>;
                        }
                        if (paragraph.startsWith('- [ ]')) {
                          return <div key={i} className="flex items-start gap-2 ml-4"><input type="checkbox" className="mt-1" readOnly /><span>{paragraph.replace('- [ ] ', '')}</span></div>;
                        }
                        if (paragraph.startsWith('- ')) {
                          return <li key={i} className="ml-6 list-disc">{paragraph.replace('- ', '')}</li>;
                        }
                        if (paragraph.match(/^\d+\./)) {
                          return <li key={i} className="ml-6 list-decimal">{paragraph.replace(/^\d+\.\s*/, '')}</li>;
                        }
                        if (paragraph.trim() === '') return <br key={i} />;
                        return <p key={i} className="mb-3">{paragraph.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
                      })}
                    </div>
                  </section>
                ))}
              </div>

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="mt-12 pt-8 border-t">
                  <h3 className="text-xl font-semibold mb-4">Related Articles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {relatedArticles.map((related) => (
                      <Link
                        key={related.slug}
                        to={`/help/${related.slug}`}
                        className="p-4 border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors"
                      >
                        <h4 className="font-medium text-foreground mb-1">{related.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{related.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Prev/Next Navigation */}
              <div className="mt-12 pt-8 border-t flex justify-between gap-4">
                {prev ? (
                  <Link to={`/help/${prev.slug}`} className="flex-1 p-4 border rounded-lg hover:border-primary transition-colors">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </div>
                    <div className="font-medium text-foreground">{prev.title}</div>
                  </Link>
                ) : <div className="flex-1" />}
                
                {next ? (
                  <Link to={`/help/${next.slug}`} className="flex-1 p-4 border rounded-lg hover:border-primary transition-colors text-right">
                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground mb-1">
                      Next <ChevronRight className="h-4 w-4" />
                    </div>
                    <div className="font-medium text-foreground">{next.title}</div>
                  </Link>
                ) : <div className="flex-1" />}
              </div>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HelpArticle;
