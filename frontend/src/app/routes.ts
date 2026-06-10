export type AppModule = 'base' | 'outdoor' | 'rescue' | 'green' | 'community';
export type OutdoorSection = 'cyclability' | 'trails';
export type CyclabilitySubsection = 'lts' | 'bike-infra' | 'slope';
export type TrailsSubsection = 'trails' | 'slope';

const DEFAULT_MODULE: AppModule = 'base';
const DEFAULT_OUTDOOR_SECTION: OutdoorSection = 'cyclability';
const DEFAULT_CYCLABILITY_SUBSECTION: CyclabilitySubsection = 'lts';
const DEFAULT_TRAILS_SUBSECTION: TrailsSubsection = 'trails';

function isAppModule(value: string | null): value is AppModule {
  return value === 'base' || value === 'outdoor' || value === 'rescue' || value === 'green' || value === 'community';
}

function isOutdoorSection(value: string | null): value is OutdoorSection {
  return value === 'cyclability' || value === 'trails';
}

function isCyclabilitySubsection(value: string | null): value is CyclabilitySubsection {
  return value === 'lts' || value === 'bike-infra' || value === 'slope';
}

function isTrailsSubsection(value: string | null): value is TrailsSubsection {
  return value === 'trails' || value === 'slope';
}

function getHashSegments(): string[] {
  return window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
}

export function getActiveModuleFromHash(): AppModule {
  const [module] = getHashSegments();

  if (isAppModule(module)) {
    return module;
  }

  const legacyModule = new URLSearchParams(window.location.search).get('module');
  if (isAppModule(legacyModule)) {
    return legacyModule;
  }

  return DEFAULT_MODULE;
}

export function getActiveOutdoorSectionFromHash(): OutdoorSection {
  const [, section] = getHashSegments();

  if (isOutdoorSection(section)) {
    return section;
  }

  return DEFAULT_OUTDOOR_SECTION;
}

export function getActiveCyclabilitySubsectionFromHash(): CyclabilitySubsection {
  const [, section, subsection] = getHashSegments();

  if (section === 'cyclability' && isCyclabilitySubsection(subsection)) {
    return subsection;
  }

  return DEFAULT_CYCLABILITY_SUBSECTION;
}

export function getActiveTrailsSubsectionFromHash(): TrailsSubsection {
  const [, section, subsection] = getHashSegments();

  if (section === 'trails' && isTrailsSubsection(subsection)) {
    return subsection;
  }

  return DEFAULT_TRAILS_SUBSECTION;
}

export function navigateToModule(module: AppModule): void {
  window.location.hash = `#/${module}`;
}

export function navigateToOutdoorSection(section: OutdoorSection, subsection?: CyclabilitySubsection): void {
  window.location.hash = subsection ? `#/outdoor/${section}/${subsection}` : `#/outdoor/${section}`;
}

export function navigateToCyclabilitySubsection(subsection: CyclabilitySubsection): void {
  window.location.hash = `#/outdoor/cyclability/${subsection}`;
}

export function navigateToTrailsSubsection(subsection: TrailsSubsection): void {
  window.location.hash = `#/outdoor/trails/${subsection}`;
}

export function getModuleLabel(module: AppModule): string {
  if (module === 'base') {
    return 'Home';
  }

  if (module === 'outdoor') {
    return 'Modulo Outdoor';
  }

  if (module === 'rescue') {
    return 'Modulo Soccorso ed Emergenza';
  }

  if (module === 'green') {
    return 'Modulo Green';
  }

  return 'Segnala';
}

export function getOutdoorSectionLabel(section: OutdoorSection): string {
  if (section === 'cyclability') {
    return 'Cyclability';
  }

  return 'Trails';
}

export function getCyclabilitySubsectionLabel(subsection: CyclabilitySubsection): string {
  if (subsection === 'lts') {
    return 'LTS';
  }

  if (subsection === 'bike-infra') {
    return 'Bike infrastructure';
  }

  return 'Slope';
}
