import { Star, Quote, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const reviews = [
  {
    id: 1,
    name: "Marcus Johnson",
    role: "Food Truck Owner",
    avatar: "",
    rating: 5,
    text: "VendiBook made it so easy to find the perfect spot for my food truck. The booking process was seamless, and I knew my equipment was protected the entire time.",
    location: "Atlanta, GA"
  },
  {
    id: 2,
    name: "Sarah Chen",
    role: "Event Caterer",
    avatar: "",
    rating: 5,
    text: "I've rented food trailers from three different hosts now. Every experience has been professional and the escrow payment system gives me total peace of mind.",
    location: "Houston, TX"
  },
  {
    id: 3,
    name: "David Williams",
    role: "Ghost Kitchen Host",
    avatar: "",
    rating: 5,
    text: "As a host, I love how VendiBook handles everything. The document verification and secure payments mean I can focus on what I do best—helping entrepreneurs succeed.",
    location: "Miami, FL"
  },
  {
    id: 4,
    name: "Lisa Rodriguez",
    role: "Pop-up Restaurant Owner",
    avatar: "",
    rating: 5,
    text: "From browsing to booking, VendiBook has transformed how I grow my catering business. The support team is incredible and always has my back.",
    location: "Los Angeles, CA"
  }
];

const ReviewsSection = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Star className="h-4 w-4 fill-primary" />
            Trusted by Entrepreneurs
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Reviews You Can Count On
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real stories from real entrepreneurs who are building their dreams with VendiBook
          </p>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">4.9</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">2,500+</div>
            <div className="text-sm text-muted-foreground mt-1">Verified Reviews</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">98%</div>
            <div className="text-sm text-muted-foreground mt-1">Satisfaction Rate</div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {reviews.map((review, index) => (
            <Card 
              key={review.id} 
              className="bg-card border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-6 lg:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={review.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {review.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{review.name}</h4>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">{review.role}</p>
                    <p className="text-xs text-muted-foreground">{review.location}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                </div>
                
                <div className="relative">
                  <Quote className="absolute -top-2 -left-2 h-8 w-8 text-primary/10" />
                  <p className="text-muted-foreground leading-relaxed pl-4">
                    {review.text}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
