import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "confirm">("confirm");
  const [errorMessage, setErrorMessage] = useState("");
  
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  const handleUnsubscribe = async () => {
    if (!email) {
      setStatus("error");
      setErrorMessage("No email address provided");
      return;
    }

    setStatus("loading");

    try {
      const { data, error } = await supabase.functions.invoke("unsubscribe-email", {
        body: { email: decodeURIComponent(email) },
      });

      if (error) throw error;

      setStatus("success");
    } catch (err: any) {
      console.error("Unsubscribe error:", err);
      setStatus("error");
      setErrorMessage(err.message || "Failed to unsubscribe. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === "loading" && (
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              )}
              {status === "success" && (
                <CheckCircle className="h-16 w-16 text-green-500" />
              )}
              {status === "error" && (
                <XCircle className="h-16 w-16 text-destructive" />
              )}
              {status === "confirm" && (
                <Mail className="h-16 w-16 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {status === "loading" && "Processing..."}
              {status === "success" && "Unsubscribed Successfully"}
              {status === "error" && "Something Went Wrong"}
              {status === "confirm" && "Unsubscribe from Emails"}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            {status === "confirm" && (
              <>
                <p className="text-muted-foreground">
                  Are you sure you want to unsubscribe{" "}
                  <strong>{email ? decodeURIComponent(email) : "this email"}</strong>{" "}
                  from Vendibook marketing emails?
                </p>
                <p className="text-sm text-muted-foreground">
                  You will still receive important account and transaction notifications.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button onClick={handleUnsubscribe} variant="destructive">
                    Yes, Unsubscribe
                  </Button>
                  <Button onClick={() => navigate("/")} variant="outline">
                    Cancel
                  </Button>
                </div>
              </>
            )}
            
            {status === "loading" && (
              <p className="text-muted-foreground">
                Please wait while we process your request...
              </p>
            )}
            
            {status === "success" && (
              <>
                <p className="text-muted-foreground">
                  You have been successfully unsubscribed from Vendibook marketing emails.
                </p>
                <p className="text-sm text-muted-foreground">
                  You will still receive important account notifications.
                </p>
                <Button onClick={() => navigate("/")} className="mt-4">
                  Return to Home
                </Button>
              </>
            )}
            
            {status === "error" && (
              <>
                <p className="text-muted-foreground">
                  {errorMessage}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button onClick={handleUnsubscribe}>
                    Try Again
                  </Button>
                  <Button onClick={() => navigate("/contact")} variant="outline">
                    Contact Support
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Unsubscribe;
