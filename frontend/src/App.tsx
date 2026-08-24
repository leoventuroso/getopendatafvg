import { useEffect, useState } from 'react';
import { APP_CONFIG } from './config';
import BaseModule from './modules/base/BaseModule';
import CommunityModule from './modules/community/CommunityModule';
import GreenModule from './modules/green/GreenModule';
import OutdoorModule from './modules/outdoor/OutdoorModule';
import RescueModule from './modules/rescue/RescueModule';
import {
  getActiveModuleFromHash,
  getModuleLabel,
  navigateToModule,
  type AppModule
} from './app/routes';

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
    </main>
  );
}
