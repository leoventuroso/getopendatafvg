import { navigateToModule } from '../../app/routes';

const MODULES = [
  {
    id: 'outdoor' as const,
    label: 'Outdoor',
    icon: 'bi-signpost-2',
    description: 'Sentieri CAI, MTB, ciclabili, LTS e percorsi con profilo altimetrico',
  },
  {
    id: 'rescue' as const,
    label: 'Soccorso ed Emergenza',
    icon: 'bi-shield-plus',
    description: 'Rii a rischio esondazione, AED, HEMS, idranti e punti di raccolta',
  },
  {
    id: 'green' as const,
    label: 'Green',
    icon: 'bi-tree',
    description: 'NDVI, corridoi di ombra, NBR e temperatura superficiale del territorio',
  },
  {
    id: 'community' as const,
    label: 'Segnala',
    icon: 'bi-megaphone',
    description: 'Invia una segnalazione al Comune: strade, sentieri, rifiuti, illuminazione o proposte',
  },
];

export default function ModuleCards() {
  return (
    <nav className="home-module-cards" aria-label="Moduli">
      {MODULES.map(m => (
        <button
          key={m.id}
          className="home-module-card"
          onClick={() => navigateToModule(m.id)}
        >
          <i className={`bi ${m.icon} home-card-icon`} aria-hidden="true" />
          <span className="home-card-label">{m.label}</span>
          <span className="home-card-desc">{m.description}</span>
        </button>
      ))}
    </nav>
  );
}
