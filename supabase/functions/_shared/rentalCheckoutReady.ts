/** Recheck mutable requirements at submission/order creation; wizard history is not authority. */
export async function assertRentalCheckoutReady(admin: any, booking: any, authorization: string) {
  if (!booking.renter_snapshot) throw new Error("Complete renter contact details before payment.");
  const { data: requirements, error: requirementsError } = await admin.from("listing_required_documents")
    .select("document_type").eq("listing_id", booking.listing_id).eq("is_required", true).eq("deadline_type", "before_booking_request");
  if (requirementsError) throw requirementsError;
  if (requirements?.length) {
    const { data: documents, error } = await admin.from("booking_documents")
      .select("document_type,status,reviewed_at,booking_id,booking_requests!inner(shopper_id)")
      .eq("booking_requests.shopper_id", booking.shopper_id);
    if (error) throw error;
    const cutoff = Date.now() - 365 * 86400000;
    for (const requirement of requirements) {
      if (!(documents ?? []).some((d: any) => d.document_type === requirement.document_type &&
        ((d.booking_id === booking.id && ["pending", "approved"].includes(d.status)) ||
          (d.status === "approved" && new Date(d.reviewed_at).getTime() >= cutoff)))) {
        throw new Error("Upload all required pre-booking documents before continuing.");
      }
    }
  }
  const { data: verification, error: verificationError } = await admin.functions.invoke("booking-verification", {
    headers: { Authorization: authorization }, body: { action: "status", listingId: booking.listing_id },
  });
  if (verificationError || !verification?.attestation || verification.attestation.stale ||
      !verification.identity || (verification.identity.available && !verification.identity.verified && !verification.identity.pending_review)) {
    throw new Error("Complete the current rental disclosure and verification before continuing.");
  }
  for (const type of ["rental_transaction_terms", "checkout_privacy_electronic_consent"]) {
    const { data: document, error: documentError } = await admin.from("legal_documents").select("version")
      .eq("document_type", type).eq("status", "active").order("effective_at", { ascending: false }).limit(1).maybeSingle();
    if (documentError || !document) throw new Error("Rental agreements are unavailable. Please try again.");
    const { data: consent, error } = await admin.from("user_consents").select("id")
      .eq("user_id", booking.shopper_id).eq("document_type", type).eq("document_version", document.version)
      .is("revoked_at", null).contains("related_ids", { listing_id: booking.listing_id })
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !consent) throw new Error("Accept the current rental and privacy agreements before continuing.");
  }
}
