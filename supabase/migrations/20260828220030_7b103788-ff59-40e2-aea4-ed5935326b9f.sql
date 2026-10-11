ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS hitch_ball_size text,
  ADD COLUMN IF NOT EXISTS coupler_type text,
  ADD COLUMN IF NOT EXISTS trailer_plug_type text,
  ADD COLUMN IF NOT EXISTS renter_provides_tow_vehicle boolean,
  ADD COLUMN IF NOT EXISTS tow_vehicle_requirement text,
  ADD COLUMN IF NOT EXISTS return_instructions text;

COMMENT ON COLUMN public.listings.hitch_ball_size IS 'Host-provided hitch ball size required to tow this trailer (e.g. 2", 2 5/16").';
COMMENT ON COLUMN public.listings.coupler_type IS 'Host-provided coupler/hitch type (bumper pull, gooseneck, fifth wheel).';
COMMENT ON COLUMN public.listings.trailer_plug_type IS 'Host-provided trailer electrical connector (4-pin, 7-pin, other).';
COMMENT ON COLUMN public.listings.renter_provides_tow_vehicle IS 'True when the renter must bring their own tow vehicle for pickup.';
COMMENT ON COLUMN public.listings.tow_vehicle_requirement IS 'Host-stated tow vehicle requirement text. Never an invented safety rating.';
COMMENT ON COLUMN public.listings.return_instructions IS 'Host instructions for returning the rental at the end of the booking.';