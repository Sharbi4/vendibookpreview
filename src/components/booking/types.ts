/**
 * Shared booking types.
 *
 * `BookingUserInfo` used to live in the retired `BookingInfoModal`. Contact
 * details are now collected question-by-question in `ContactInfoWizard`, and
 * terms/insurance acknowledgements are recorded server-side by `DisclosureStep`.
 */
export interface BookingUserInfo {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  agreedToTerms: boolean;
  acknowledgedInsurance: boolean;
}
