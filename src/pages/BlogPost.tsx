import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Share2, Tag } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd, { generateBlogPostSchema } from '@/components/JsonLd';
import { generateBreadcrumbSchema } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getBlogPostBySlug, getRelatedPosts, BLOG_CATEGORIES } from '@/data/blogPosts';
import { toast } from 'sonner';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;
  
  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const relatedPosts = getRelatedPosts(post.slug, 3);
  const categoryLabel = BLOG_CATEGORIES.find(c => c.slug === post.category)?.label || post.category;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={post.title}
        description={post.description}
        canonical={`/blog/${post.slug}`}
        type="article"
        image={post.image}
        article={{
          publishedTime: post.datePublished,
          modifiedTime: post.dateModified,
          author: post.author,
          section: categoryLabel,
          tags: post.tags,
        }}
      />
      <JsonLd schema={[
        generateBlogPostSchema({
          title: post.title,
          description: post.description,
          slug: post.slug,
          author: post.author,
          datePublished: post.datePublished,
          dateModified: post.dateModified,
          image: post.image,
          category: categoryLabel,
        }),
        generateBreadcrumbSchema(breadcrumbs),
      ]} />
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="container pt-6">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link to="/blog" className="hover:text-foreground">Blog</Link>
            <span>/</span>
            <span className="text-foreground truncate">{post.title}</span>
          </nav>
        </div>

        {/* Article Header */}
        <article className="container py-8">
          <div className="max-w-3xl mx-auto">
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>

            <Badge variant="secondary" className="mb-4">
              {categoryLabel}
            </Badge>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {post.title}
            </h1>

            <p className="text-lg text-muted-foreground mb-6">
              {post.excerpt}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b">
              <span className="font-medium text-foreground">{post.author}</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(post.datePublished).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readingTime} min read
              </span>
              <Button variant="ghost" size="sm" onClick={handleShare} className="ml-auto">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Featured Image */}
            {post.image && (
              <div className="rounded-xl overflow-hidden mb-8">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full aspect-video object-cover"
                />
              </div>
            )}

            {/* Article Content */}
            <div 
              className="prose prose-lg max-w-none 
                prose-headings:text-foreground 
                prose-p:text-muted-foreground 
                prose-strong:text-foreground
                prose-a:text-primary hover:prose-a:text-primary/80
                prose-ul:text-muted-foreground
                prose-ol:text-muted-foreground
                prose-li:text-muted-foreground
                prose-blockquote:text-muted-foreground
                prose-blockquote:border-primary
                prose-code:text-foreground
                prose-code:bg-muted
                prose-code:px-1
                prose-code:py-0.5
                prose-code:rounded
                prose-pre:bg-muted
                prose-table:text-muted-foreground
                prose-th:text-foreground
                prose-td:border-border
                prose-th:border-border"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="py-12 bg-muted/30">
            <div className="container">
              <h2 className="text-2xl font-bold text-foreground mb-6">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.slug} to={`/blog/${relatedPost.slug}`}>
                    <Card className="h-full hover:shadow-md transition-shadow group">
                      <CardContent className="p-5">
                        <Badge variant="outline" className="mb-3 text-xs">
                          {BLOG_CATEGORIES.find(c => c.slug === relatedPost.category)?.label || relatedPost.category}
                        </Badge>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {relatedPost.excerpt}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-12 container text-center">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Ready to Start Your Mobile Food Journey?
          </h2>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button asChild>
              <Link to="/search">Browse Listings</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/list">List Your Asset</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
