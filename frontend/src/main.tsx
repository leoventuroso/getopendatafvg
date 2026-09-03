import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// maplibre's base CSS must load before styles.css: our .map-style-switcher
// rules override .maplibregl-ctrl-group at equal specificity, so source order
// decides. Importing it here (eager, before styles.css) instead of from the
// lazy-loaded map.ts keeps that order stable now that map.ts is code-split.
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
