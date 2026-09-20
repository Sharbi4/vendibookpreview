/** Derive readiness from the server-verified merchant integration, never return URL flags. */
interface DerivedStatus {
  status: "ready" | "action_required";
  reasons: string[];
  scopes: string[];
  activeOauth: boolean;
  ppcpApproved: boolean;
  emailConfirmed: boolean;
  receivable: boolean;
  merchantId: string | null;
  /** PPCP_CUSTOM (advanced card) vetting status, when PayPal reports it. */
  acdcVetting: string | null;
  /** Whether the merchant's integration reports vaulting capability. */
  vaulting: string | null;
  /** Capability names PayPal returned for this merchant. */
  capabilities: string[];
}

export function deriveStatus(raw: any, partnerClientId?: string | null): DerivedStatus {
  const oauth = Array.isArray(raw?.oauth_integrations) ? raw.oauth_integrations : [];
  const granted = oauth.flatMap((integration: any) => {
    const status = String(integration?.oauth_integration_status ?? integration?.status ?? '').toUpperCase();
    if (status && !['ACTIVE', 'A'].includes(status)) return [];
    const parties = Array.isArray(integration?.oauth_third_party) ? integration.oauth_third_party : [];
    // Current merchant-integration responses nest scopes under oauth_third_party.
    // Accept the older flat shape only when PayPal explicitly marks it active.
    if (!parties.length) return ['ACTIVE', 'A'].includes(status) ? [integration] : [];
    return parties.filter((party: any) => !partnerClientId || party.partner_client_id === partnerClientId);
  });
  const scopes: string[] = [...new Set<string>(granted.flatMap((party: any) =>
    Array.isArray(party.scopes) ? party.scopes.filter((scope: unknown) => typeof scope === 'string') : []))];
  const activeOauth = scopes.some(scope => scope.endsWith('/payments/payment/authcapture') || scope.endsWith('/payments/realtimepayment'));
  const products = Array.isArray(raw?.products) ? raw.products : [];
  const walletProducts = products.filter((p: any) => ['PPCP', 'PPCP_STANDARD', 'EXPRESS_CHECKOUT'].includes(String(p?.name).toUpperCase()));
  // Card/vaulting vetting is reported separately; it must not conceal an
  // otherwise ready wallet connection. Missing product status is allowed by
  // PayPal's documented response; explicit wallet restrictions still block.
  const ppcpApproved = walletProducts.length === 0 || walletProducts.some((p: any) =>
    !p.vetting_status || ['APPROVED', 'SUBSCRIBED', 'SUBSCRIBED_WITH_LIMIT'].includes(String(p.vetting_status).toUpperCase()));
  const emailConfirmed = raw?.primary_email_confirmed === true;
  const receivable = raw?.payments_receivable === true;
  const merchantId = typeof raw?.merchant_id === "string" ? raw.merchant_id : null;

  // Advanced card processing (ACDC) and vaulting are reported per product /
  // capability. We record what PayPal says; we never assume a capability.
  const acdcProduct = products.find(
    (p: any) => String(p?.name ?? "").toUpperCase() === "PPCP_CUSTOM",
  );
  const acdcVetting = acdcProduct
    ? String(acdcProduct?.vetting_status ?? "PENDING").toUpperCase()
    : null;
  const capabilityList = Array.isArray(raw?.capabilities) ? raw.capabilities : [];
  const capabilities = capabilityList
    .map((c: any) => (typeof c === "string" ? c : c?.name))
    .filter((c: any): c is string => typeof c === "string");
  // Vaulting readiness is reported in two places, and PayPal treats either one
  // being IN_REVIEW / NEED_MORE_DATA as "not available to the seller yet"
  // (IWT pp.5-6): products[name == 'ADVANCED_VAULTING'].vetting_status and
  // capabilities[name == 'PAYPAL_WALLET_VAULTING_ADVANCED'].status. Report the
  // blocking state so the seller is told what PayPal actually needs.
  const vaultingProduct = products.find(
    (p: any) => String(p?.name ?? "").toUpperCase() === "ADVANCED_VAULTING",
  );
  const vaultingCapability = capabilityList.find(
    (c: any) => String(c?.name ?? c ?? "").toUpperCase().includes("VAULT"),
  );
  const vaultingStates = [
    vaultingProduct ? String(vaultingProduct?.vetting_status ?? "IN_REVIEW").toUpperCase() : null,
    vaultingCapability ? String(vaultingCapability?.status ?? "ACTIVE").toUpperCase() : null,
  ].filter((s): s is string => s !== null);
  const vaulting = vaultingStates.length === 0
    ? null
    : vaultingStates.includes("NEED_MORE_DATA")
      ? "NEED_MORE_DATA"
      : vaultingStates.includes("DENIED")
        ? "DENIED"
        : vaultingStates.includes("IN_REVIEW")
          ? "IN_REVIEW"
          : vaultingStates.every((s) => s === "SUBSCRIBED" || s === "ACTIVE")
            ? "SUBSCRIBED"
            : vaultingStates[0];

  const reasons: string[] = [];
  if (!activeOauth) reasons.push("oauth_not_active");
  if (!ppcpApproved) reasons.push("vetting_pending");
  if (!emailConfirmed) reasons.push("primary_email_unconfirmed");
  if (!receivable) reasons.push("payments_receivable_false");

  const ready = activeOauth && ppcpApproved && emailConfirmed && receivable && !!merchantId;
  return {
    status: ready ? "ready" : "action_required",
    reasons,
    scopes,
    activeOauth,
    ppcpApproved,
    emailConfirmed,
    receivable,
    merchantId,
    acdcVetting,
    vaulting,
    capabilities,
  };
}

