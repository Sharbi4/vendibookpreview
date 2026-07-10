/**
 * Drop-in "Report an issue" button that opens the ReportIssueDialog.
 * Add this anywhere without worrying about interfering with parent state.
 */
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ReportIssueDialog, type ReportIssueContext } from "./ReportIssueDialog";

interface Props extends Omit<ButtonProps, "onClick"> {
  context: ReportIssueContext;
  label?: string;
  showIcon?: boolean;
}

export function ReportIssueButton({ context, label = "Report an issue", showIcon = true, variant = "ghost", size = "sm", ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const handleOpen = async () => {
    setOpen(true);
    if (user) {
      try {
        await supabase.from("analytics_events").insert({
          event_name: "report_issue_opened",
          user_id: user.id,
          properties: { feature_area: context.featureArea },
        });
      } catch { /* ignore */ }
    }
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={handleOpen} {...rest}>
        {showIcon && <AlertCircle className="mr-1.5 h-4 w-4" />}
        {label}
      </Button>
      <ReportIssueDialog open={open} onOpenChange={setOpen} context={context} />
    </>
  );
}
