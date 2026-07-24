/**
 * Utility for generating public display names.
 * Priority: business_name > "FirstName L." format
 * 
 * Example: "Tiffany Roger" -> "Tiffany R."
 */

interface DisplayNameInput {
  business_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  /**
   * When true, the profile owner has opted in to showing their full last name
   * publicly. When false or omitted, we fall back to the "FirstName L." format.
   */
  show_full_name?: boolean | null;
}

/**
 * Generates a public-safe display name.
 * 
 * Priority order:
 * 1. business_name (if set)
 * 2. "FirstName L." format (if first_name and last_name available)
 * 3. First word of full_name + initial of second word
 * 4. display_name or full_name as fallback
 * 5. "User" as last resort
 * 
 * @example
 * getPublicDisplayName({ first_name: 'Tiffany', last_name: 'Roger' }) // "Tiffany R."
 * getPublicDisplayName({ business_name: 'Taco Truck Co' }) // "Taco Truck Co"
 */
export function getPublicDisplayName(profile: DisplayNameInput): string {
  // Priority 1: Business name
  if (profile.business_name?.trim()) {
    return profile.business_name.trim();
  }

  const showFull = profile.show_full_name === true;

  // Priority 2: FirstName L. (or full "First Last" when opted in)
  if (profile.first_name?.trim() && profile.last_name?.trim()) {
    const firstName = profile.first_name.trim();
    const last = profile.last_name.trim();
    return showFull
      ? `${firstName} ${last}`
      : `${firstName} ${last.charAt(0).toUpperCase()}.`;
  }

  // Priority 3: Parse from full_name if available
  if (profile.full_name?.trim()) {
    const parts = profile.full_name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const last = parts[parts.length - 1];
      return showFull
        ? profile.full_name.trim()
        : `${firstName} ${last.charAt(0).toUpperCase()}.`;
    }
    // Single name, return as-is
    if (parts.length === 1) {
      return parts[0];
    }
  }

  // Priority 4: display_name fallback
  if (profile.display_name?.trim()) {
    return profile.display_name.trim();
  }

  // Priority 5: full_name fallback
  if (profile.full_name?.trim()) {
    return profile.full_name.trim();
  }

  // Last resort
  return 'User';
}

/**
 * Generates initials from a profile for avatar display.
 * Uses first_name and last_name if available, otherwise parses from full_name.
 */
export function getDisplayInitials(profile: DisplayNameInput): string {
  // Priority 1: first_name + last_name
  if (profile.first_name?.trim() && profile.last_name?.trim()) {
    return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
  }

  // Priority 2: Parse from full_name
  if (profile.full_name?.trim()) {
    const parts = profile.full_name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
  }

  // Priority 3: display_name
  if (profile.display_name?.trim()) {
    const parts = profile.display_name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
  }

  return '?';
}
