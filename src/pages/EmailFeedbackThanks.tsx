import { useSearchParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const LABELS: Record<string, string> = {
  helpful: "Glad you found it helpful.",
  okay: "Thanks for the honest signal.",
  not_for_me: "Sorry it missed — we'll keep refining.",
};

export default function EmailFeedbackThanks() {
  const [params] = useSearchParams();
  const rating = params.get("r") ?? "";
  const label = LABELS[rating] ?? "Thanks for the feedback.";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-serif mb-4">Thank you</h1>
          <p className="text-muted-foreground mb-8">{label} Your feedback helps us make The Vendibook Report better.</p>
          <Link to="/" className="text-primary font-medium hover:underline">Return to Vendibook →</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
