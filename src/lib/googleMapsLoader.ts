// Keep Google Maps loader options identical across the app.
// If these options ever differ between components, @react-google-maps/api will throw:
// "Loader must not be called again with different options".

export const GOOGLE_MAPS_LOADER_ID = 'google-map-script' as const;

// Only include the libraries we actually use. If you add more, update them everywhere via this file.
export const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

