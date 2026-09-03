export type AppModule = 'base' | 'outdoor' | 'rescue' | 'green' | 'community';
export type OutdoorSection = 'cyclability' | 'trails';
export type CyclabilitySubsection = 'lts' | 'bike-infra' | 'routing';
export type TrailsSubsection = 'trails' | 'slope' | 'routing';

const DEFAULT_MODULE: AppModule = 'base';

function isAppModule(value: string | null): value is AppModule {
  return value === 'base' || value === 'outdoor' || value === 'rescue' || value === 'green' || value === 'community';
}

function isOutdoorSection(value: string | null): value is OutdoorSection {
  return value === 'cyclability' || value === 'trails';
}

function isCyclabilitySubsection(value: string | null): value is CyclabilitySubsection {
  return value === 'lts' || value === 'bike-infra' || value === 'routing';
}

function isTrailsSubsection(value: string | null): value is TrailsSubsection {
  return value === 'trails' || value === 'slope' || value === 'routing';
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

// No default: the section stays unchosen until the user clicks one.
export function getActiveOutdoorSectionFromHash(): OutdoorSection | null {
  const [, section] = getHashSegments();

  return isOutdoorSection(section) ? section : null;
}

export function getActiveCyclabilitySubsectionFromHash(): CyclabilitySubsection | null {
  const [, section, subsection] = getHashSegments();

  if (section === 'cyclability' && isCyclabilitySubsection(subsection)) {
    return subsection;
  }

  return null;
}

export function getActiveTrailsSubsectionFromHash(): TrailsSubsection | null {
  const [, section, subsection] = getHashSegments();

  if (section === 'trails' && isTrailsSubsection(subsection)) {
    return subsection;
  }

  return null;
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
    return 'Modulo Verde';
  }

  return 'Segnala';
}

export function getOutdoorSectionLabel(section: OutdoorSection): string {
  if (section === 'cyclability') {
    return 'Percorsi in bici';
  }

  return 'Sentieri';
}

export function getCyclabilitySubsectionLabel(subsection: CyclabilitySubsection): string {
  if (subsection === 'lts') {
    return 'Stress da traffico';
  }

  if (subsection === 'bike-infra') {
    return 'Infrastrutture ciclabili';
  }

  return 'Pianifica percorso';
}

export function getTrailsSubsectionLabel(subsection: TrailsSubsection): string {
  if (subsection === 'trails') {
    return 'Sentieri e punti acqua';
  }

  if (subsection === 'slope') {
    return 'Pendenza';
  }

  return 'Pianifica percorso';
}
