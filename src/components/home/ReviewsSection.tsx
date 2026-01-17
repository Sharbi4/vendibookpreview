import { Star, Quote, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
const reviews = [{
  id: 1,
  name: "Marcus Johnson",
  role: "Food Truck Owner",
  avatar: "",
  rating: 5,
  text: "Found the perfect spot for my food truck. The booking process was seamless and my equipment was protected the entire time.",
  location: "Atlanta, GA"
}, {
  id: 2,
  name: "Sarah Chen",
  role: "Event Caterer",
  avatar: "",
  rating: 5,
  text: "I've rented from three different hosts now. Every experience has been professional and the escrow payments give me total peace of mind.",
  location: "Houston, TX"
}, {
  id: 3,
  name: "David Williams",
  role: "Ghost Kitchen Host",
  avatar: "",
  rating: 5,
  text: "As a host, I love how VendiBook handles everything. Document verification and secure payments mean I can focus on helping entrepreneurs succeed.",
  location: "Miami, FL"
}];
const ReviewsSection = () => {
  return <section className="py-16 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Star className="h-4 w-4 fill-primary" />
            Trusted by Entrepreneurs
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            What Vendibook Users Say
          </h2>
          
          {/* Stats Row */}
          <div className="flex flex-wrap justify-center gap-8 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">4.9</div>
              <div className="text-sm text-muted-foreground">Avg. Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">2,500+</div>
              <div className="text-sm text-muted-foreground">Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">98%</div>
              <div className="text-sm text-muted-foreground">Satisfied</div>
            </div>
          </div>
        </div>

        {/* Reviews Grid - 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map(review => <Card key={review.id} className="bg-card border-border/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={review.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {review.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground text-sm">{review.name}</h4>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <p className="text-xs text-muted-foreground">{review.role} • {review.location}</p>
                  </div>
                </div>
                
                <div className="flex gap-0.5 mb-3">
                  {[...Array(review.rating)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />)}
                </div>
                
                <div className="relative">
                  <Quote className="absolute -top-1 -left-1 h-6 w-6 text-primary/10" />
                  <p className="text-muted-foreground text-sm leading-relaxed pl-3">
                    {review.text}
                  </p>
                </div>
              </CardContent>
            </Card>)}
        </div>
      </div>
    </section>;
};
export default ReviewsSection;