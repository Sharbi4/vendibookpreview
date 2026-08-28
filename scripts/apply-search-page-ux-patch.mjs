import fs from 'node:fs';

const path = 'src/pages/Search.tsx';
let s = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Missing patch target: ${label}`);
  s = s.replace(from, to);
};

replaceOnce(
`      setLocationCoords(location.coordinates);\n      const params = new URLSearchParams(searchParams);\n      params.set('lat', location.coordinates[1].toString());\n      params.set('lng', location.coordinates[0].toString());\n      params.set('radius', searchRadius.toString());\n      params.delete('page');`,
`      setLocationCoords(location.coordinates);\n      setLocationText(location.name);\n      const params = new URLSearchParams(searchParams);\n      params.set('lat', location.coordinates[1].toString());\n      params.set('lng', location.coordinates[0].toString());\n      params.set('radius', searchRadius.toString());\n      params.set('location', location.name);\n      params.delete('page');`,
'persist selected location text'
);

replaceOnce(
`      params.delete('lat');\n      params.delete('lng');\n      params.delete('radius');\n      params.delete('page');`,
`      params.delete('lat');\n      params.delete('lng');\n      params.delete('radius');\n      params.delete('location');\n      params.delete('page');`,
'clear location URL state'
);

replaceOnce(
`    locationCoords !== null,`,
`    locationCoords !== null || locationText.trim().length > 0,`,
'count typed location as active filter'
);

replaceOnce(
`              {/* Filter Button */}`,
`              {/* First-class location search */}\n              <div className="hidden sm:block w-[280px] lg:w-[340px] shrink-0">\n                <LocationSearchInput\n                  value={locationText}\n                  onChange={setLocationText}\n                  onLocationSelect={handleLocationSelect}\n                  selectedCoordinates={locationCoords}\n                  placeholder="City, state, or ZIP"\n                  showRadiusSelector={false}\n                  radius={searchRadius}\n                  onRadiusChange={handleRadiusChange}\n                />\n              </div>\n\n              {/* Filter Button */}`,
'add header location field'
);

replaceOnce(
`                  {activeFiltersCount > 0 && (\n                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-primary hover:text-primary">\n                      Clear all\n                    </Button>\n                  )}`,
`                  <Button\n                    variant="ghost"\n                    size="sm"\n                    onClick={clearFilters}\n                    disabled={activeFiltersCount === 0 && !searchQuery.trim()}\n                    className="text-xs text-primary hover:text-primary disabled:opacity-40"\n                  >\n                    Clear all\n                  </Button>`,
'always show desktop clear all'
);

replaceOnce(
`  onVerifiedHostsChange,\n}: FilterContentProps) => {`,
`  onVerifiedHostsChange,\n  onClear,\n}: FilterContentProps) => {`,
'destructure clear handler'
);

replaceOnce(
`  return (\n    <div className="space-y-5">\n      {/* Type Filter - First */}`,
`  return (\n    <div className="space-y-5">\n      <div className="flex items-center justify-between border-b border-border/60 pb-3">\n        <span className="text-xs text-muted-foreground">Refine marketplace results</span>\n        <Button type="button" variant="ghost" size="sm" onClick={onClear} className="h-8 px-2 text-xs text-primary">\n          Clear all filters\n        </Button>\n      </div>\n\n      {/* Type Filter - First */}`,
'add clear action inside filter sheet/sidebar'
);

fs.writeFileSync(path, s);
console.log('Search page UX patch applied');
