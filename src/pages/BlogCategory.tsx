import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BLOG_CATEGORIES, getBlogPostsByCategory } from '@/data/blogPosts';

const BlogCategory = () => {
  const { category } = useParams<{ category: string }>();
  const categoryData = BLOG_CATEGORIES.find(c => c.slug === category);
  
  if (!categoryData) {
    return <Navigate to="/blog" replace />;
  }

  const posts = getBlogPostsByCategory(category!);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={`${categoryData.label} | Vendibook Blog`}
        description={categoryData.description}
        canonical={`/blog/category/${category}`}
      />
      <Header />

      <main className="flex-1">
        <section className="py-12 container">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            {categoryData.label}
          </h1>
          <p className="text-muted-foreground mb-8">
            {categoryData.description}
          </p>

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No articles in this category yet.</p>
              <Button variant="outline" asChild>
                <Link to="/blog">View All Articles</Link>
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link key={post.slug} to={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-md transition-shadow group">
                    {post.image && (
                      <div className="aspect-video overflow-hidden rounded-t-lg">
                        <img 
                          src={post.image} 
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readingTime} min
                        </span>
                        <span>
                          {new Date(post.datePublished).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BlogCategory;
