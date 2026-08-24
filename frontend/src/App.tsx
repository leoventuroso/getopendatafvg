import { useEffect, useState } from 'react';
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
          <h1>Montereale Valcellina Open</h1>
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
