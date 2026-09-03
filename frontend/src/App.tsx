import { lazy, Suspense, useEffect, useState } from 'react';
import { APP_CONFIG } from './config';
import {
  getActiveModuleFromHash,
  getModuleLabel,
  navigateToModule,
  type AppModule
} from './app/routes';

// Each module pulls in its own maplibre layers, GeoJSON wiring and UI. Loading
// them on demand keeps the first paint (almost always the Home/base module) from
// downloading the other four.
const BaseModule = lazy(() => import('./modules/base/BaseModule'));
const CommunityModule = lazy(() => import('./modules/community/CommunityModule'));
const GreenModule = lazy(() => import('./modules/green/GreenModule'));
const OutdoorModule = lazy(() => import('./modules/outdoor/OutdoorModule'));
const RescueModule = lazy(() => import('./modules/rescue/RescueModule'));

export default function App() {
  const [activeModule, setActiveModule] = useState<AppModule>(getActiveModuleFromHash());
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      setActiveModule(getActiveModuleFromHash());
      setNavOpen(false);
    };

    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) {
      navigateToModule('base');
    }

    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header-bar">
          <div className="app-header-title">
            <h1>{APP_CONFIG.productName}</h1>
            <p className="app-header-subtitle">{APP_CONFIG.municipality.name}</p>
          </div>
          <button
            type="button"
            className="nav-toggle"
            aria-label={navOpen ? 'Chiudi menu' : 'Apri menu'}
            aria-expanded={navOpen}
            aria-controls="module-nav"
            onClick={() => setNavOpen((open) => !open)}
          >
            <i className={navOpen ? 'bi bi-x-lg' : 'bi bi-list'} aria-hidden="true" />
          </button>
        </div>
        <nav
          id="module-nav"
          className={navOpen ? 'module-nav module-nav--open' : 'module-nav'}
          aria-label="Selezione modulo applicativo"
        >
          {(['base', 'outdoor', 'rescue', 'green', 'community'] as AppModule[]).map((module) => (
            <button
              key={module}
              type="button"
              className={activeModule === module ? 'module-link active' : 'module-link'}
              onClick={() => {
                navigateToModule(module);
                setNavOpen(false);
              }}
            >
              {getModuleLabel(module)}
            </button>
          ))}
        </nav>
      </header>

      <Suspense fallback={<div className="module-loading" role="status">Caricamento…</div>}>
        {activeModule === 'base' ? (
          <BaseModule />
        ) : activeModule === 'outdoor' ? (
          <OutdoorModule />
        ) : activeModule === 'rescue' ? (
          <RescueModule />
        ) : activeModule === 'community' ? (
          <CommunityModule />
        ) : (
          <GreenModule />
        )}
      </Suspense>

      <footer className="app-footer">
        <span>
          {APP_CONFIG.productName} · realizzato da{' '}
          <a href="https://github.com/leoventuroso" target="_blank" rel="noopener noreferrer">Leonardo Venturoso</a>
        </span>
        <a href="https://github.com/leoventuroso/mappa-civica" target="_blank" rel="noopener noreferrer">
          <i className="bi bi-github" aria-hidden="true" /> Codice sorgente
        </a>
      </footer>
    </main>
  );
}
