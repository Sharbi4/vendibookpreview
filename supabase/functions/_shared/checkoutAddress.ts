export type PostalAddress = {
  addressLines: string[]; locality?: string; administrativeArea?: string;
  postalCode?: string; regionCode?: string;
};

/** Google completeness is not enough: unresolved components still need review. */
export function checkoutAddressResult(payload: any) {
  const result = payload?.result;
  if (!result?.verdict || !result?.address?.postalAddress) throw new Error('Missing address verdict');
  const verdict = result.verdict;
  const address = result.address;
  const components = address.addressComponents ?? [];
  const suspicious = components.some((c: any) => c.confirmationLevel === 'UNCONFIRMED_AND_SUSPICIOUS');
  const missing = address.missingComponentTypes ?? [];
  const granularity = ['PREMISE', 'SUB_PREMISE'].includes(verdict.validationGranularity);
  const fix = !verdict.addressComplete || !granularity || suspicious || missing.length > 0 || (address.unresolvedTokens?.length ?? 0) > 0;
  const confirm = verdict.hasInferredComponents || verdict.hasReplacedComponents || verdict.hasUnconfirmedComponents;
  const p = address.postalAddress;
  const location = result.geocode?.location;
  return {
    decision: fix ? 'fix' : confirm ? 'confirm' : 'accept',
    formattedAddress: String(address.formattedAddress ?? ''),
    address: { addressLines: p.addressLines ?? [], locality: p.locality ?? '', administrativeArea: p.administrativeArea ?? '', postalCode: p.postalCode ?? '', regionCode: p.regionCode ?? '' } as PostalAddress,
    missingComponents: missing,
    coordinates: Number.isFinite(location?.longitude) && Number.isFinite(location?.latitude) ? [location.longitude, location.latitude] : null,
  };
}
