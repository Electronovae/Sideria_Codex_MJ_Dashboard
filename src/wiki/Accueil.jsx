import React from 'react'

const SECTIONS = [
  { titre: 'Parcourir les 16 classes', accroche: 'Techniques complètes, spécialisations, capacités légendaires.', action: 'classes' },
  { titre: 'Origines', accroche: 'Peuples et historiques : bonus de départ, compétences, capacités narratives.', action: 'origines' },
  { titre: 'Dons', accroche: 'Génériques, de maîtrise ou de classe. Acquis aux niveaux 1, 10, 20, 30 et 40.', action: 'dons' },
  { titre: 'Équipement', accroche: 'Armes, armures, outils, consommables et services courants.', action: 'equipement' },
  { titre: 'Jouer à Sidéria', accroche: 'Caractéristiques, compétences, combat, aventure, montures et marchandises.', action: 'jouer' },
  { titre: 'Progression & multiclassage', accroche: "XP, Fragments de Progression, Indice de Discipline.", action: 'progression' },
  { titre: 'Sorts', accroche: '339 sorts répartis en 11 disciplines.', action: 'sorts' },
]

export default function Accueil({ onNaviguer }) {
  return (
    <div className="wiki-page">
      <div className="wiki-hero">
        <div className="wiki-hero-fil" />
        <h1 className="wiki-hero-titre">Sidéria <span>— L'Ère de l'Éther</span></h1>
        <p className="wiki-hero-baseline">Un jeu de rôle steampunk-fantasy</p>
        <p className="wiki-hero-pitch">
          Sidéria est une cité tentaculaire bâtie sur l'exploitation de l'Éther, une énergie brute qui alimente
          machines, magie et ambitions. En surface, l'Arcadie prospère sous ses dômes de cuivre et de verre.
          En contrebas, les Bas-Fonds respirent la fumée des forges et les secrets qu'on y enterre.
          Entre les deux : toi, et les choix qui feront ta légende — ou ta perte.
        </p>
        <div className="wiki-hero-cta">
          <button className="wiki-hero-bouton wiki-hero-bouton--principal" onClick={() => onNaviguer('fiches')}>
            + Créer un personnage
          </button>
          <button className="wiki-hero-bouton" onClick={() => onNaviguer('classes')}>
            Explorer le Codex ↓
          </button>
        </div>
      </div>

      <div className="wiki-entete" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginTop: 34 }}>
        <div>
          <h2 className="wiki-sous-titre-section" style={{ marginTop: 0 }}>Le Codex</h2>
          <p className="wiki-sous-titre" style={{ marginBottom: 0 }}>
            Le manuel des joueurs, en version consultable. Plus besoin d'ouvrir le PDF.
          </p>
        </div>
        <button className="wiki-etape-lien" style={{
          flex: 'none', background: 'var(--bleu)', color: '#fff', padding: '9px 16px',
          borderRadius: 8, fontSize: '.85rem', whiteSpace: 'nowrap',
        }} onClick={() => onNaviguer('connexion')}>
          Se connecter
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, marginBottom: 20 }}>
        {SECTIONS.map(s => (
          <button
            key={s.titre}
            className="wiki-carte-classe"
            disabled={!s.action}
            style={!s.action ? { opacity: .55, cursor: 'default' } : undefined}
            onClick={() => s.action && onNaviguer(s.action)}
          >
            <div className="wiki-carte-tete">
              <span className="wiki-pastille" style={{ background: 'var(--or)' }} />
              <span className="wiki-carte-nom">{s.titre}</span>
            </div>
            <p className="wiki-carte-accroche" style={{ marginBottom: 0 }}>{s.accroche}</p>
          </button>
        ))}
      </div>

      <div className="wiki-cta-creation">
        <button className="wiki-etape-lien" style={{
          background: 'var(--or)', color: '#26221a', padding: '12px 22px',
          borderRadius: 8, fontSize: '.95rem', fontWeight: 700,
        }} onClick={() => onNaviguer('fiches')}>
          + Créer un personnage →
        </button>
      </div>
    </div>
  )
}
