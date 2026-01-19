import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Calendar, Tag } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd, { generateBlogListSchema } from '@/components/JsonLd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BLOG_POSTS, BLOG_CATEGORIES, getFeaturedPosts } from '@/data/blogPosts';

const Blog = () => {
  const featuredPosts = getFeaturedPosts();
  const recentPosts = BLOG_POSTS.slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Blog | Vendibook - Food Truck & Mobile Vendor Insights"
        description="Industry insights, tips, and guides for food truck entrepreneurs, ghost kitchen operators, and mobile food vendors."
        canonical="/blog"
      />
      <JsonLd schema={generateBlogListSchema()} />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-20 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Vendibook Blog
              </h1>
              <p className="text-lg text-muted-foreground">
                Industry insights, tips, and guides for food truck entrepreneurs, ghost kitchen operators, and mobile food vendors.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="py-12 container">
            <h2 className="text-2xl font-bold text-foreground mb-6">Featured Articles</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredPosts.map((post) => (
                <Link key={post.slug} to={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow group overflow-hidden">
                    {post.image && (
                      <div className="aspect-video overflow-hidden">
                        <img 
                          src={post.image} 
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <Badge variant="secondary" className="mb-3">
                        {BLOG_CATEGORIES.find(c => c.slug === post.category)?.label || post.category}
                      </Badge>
                      <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.datePublished).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readingTime} min read
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="py-12 bg-muted/30">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">Browse by Category</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {BLOG_CATEGORIES.map((category) => (
                <Link key={category.slug} to={`/blog/category/${category.slug}`}>
                  <Card className="hover:shadow-md transition-shadow group h-full">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                        {category.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Posts */}
        <section className="py-12 container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Recent Articles</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPosts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-md transition-shadow group">
                  <CardContent className="p-5">
                    <Badge variant="outline" className="mb-3 text-xs">
                      {BLOG_CATEGORIES.find(c => c.slug === post.category)?.label || post.category}
                    </Badge>
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
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary/5">
          <div className="container text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to Start Your Mobile Food Business?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Browse food trucks, trailers, ghost kitchens, and vendor lots on Vendibook.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button size="lg" asChild>
                <Link to="/search">Browse Listings</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/list">List Your Asset</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
