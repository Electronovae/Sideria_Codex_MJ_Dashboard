import React from 'react'
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { useClasses } from '../fiches/useClasses.js'
import { usePeuples, useHistoriques, useDons, useObjets, useServices, useRegles, useDisciplinesSorts, useSorts } from './useWikiData.js'
import Accueil from './Accueil.jsx'
import ListeClasses from './ListeClasses.jsx'
import FicheClasse from './FicheClasse.jsx'
import PageCaracteristiques from './PageCaracteristiques.jsx'
import Origines from './Origines.jsx'
import Dons from './Dons.jsx'
import Equipement from './Equipement.jsx'
import Progression from './Progression.jsx'
import JouerASideria from './JouerASideria.jsx'
import Sorts from './Sorts.jsx'
import './wiki.css'

// Chaque section a désormais sa propre URL (/classes, /classes/:id, /sorts, ...)
// plutôt qu'un simple état interne : on peut donc partager un lien direct vers une page.
const CIBLE_VERS_CHEMIN = {
  accueil: '/', classes: '/classes', caracteristiques: '/caracteristiques',
  origines: '/origines', dons: '/dons', equipement: '/equipement',
  progression: '/progression', jouer: '/jouer', sorts: '/sorts',
}

function EcranClasses({ classes }) {
  const navigate = useNavigate()
  return <ListeClasses classes={classes} onSelect={id => navigate(`/classes/${id}`)} />
}

function EcranFicheClasse({ classes }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const classe = classes.find(c => c.id === id)
  if (!classe) return <div className="wiki-page"><p className="wiki-vide">Classe introuvable.</p></div>
  return <FicheClasse classe={classe} onRetour={() => navigate('/classes')} />
}

export default function WikiApp() {
  const { classes, chargement } = useClasses()
  const { peuples, chargement: chargementPeuples } = usePeuples()
  const { historiques, chargement: chargementHistoriques } = useHistoriques()
  const { dons, chargement: chargementDons } = useDons()
  const { objets, chargement: chargementObjets } = useObjets()
  const { services, chargement: chargementServices } = useServices()
  const { regles, chargement: chargementRegles } = useRegles()
  const { disciplines, chargement: chargementDisciplines } = useDisciplinesSorts()
  const { sorts, chargement: chargementSorts } = useSorts()
  const navigate = useNavigate()

  const naviguer = (cible) => {
    if (cible === 'fiches' || cible === 'connexion') { window.location.href = '/fiches'; return }
    navigate(CIBLE_VERS_CHEMIN[cible] || '/')
  }

  if (chargement) {
    return <div className="wiki-page"><p className="wiki-vide">Chargement du codex…</p></div>
  }

  return (
    <div className="wiki-app">
      <div className="wiki-nav-croisee">
        <Link to="/" className="wiki-nav-lien">Codex</Link>
        <a href="/fiches" className="wiki-nav-lien wiki-nav-lien--accent">Mes fiches perso ↗</a>
      </div>
      <Routes>
        <Route path="/" element={<Accueil onNaviguer={naviguer} />} />
        <Route path="/classes" element={<EcranClasses classes={classes} />} />
        <Route path="/classes/:id" element={<EcranFicheClasse classes={classes} />} />
        <Route path="/caracteristiques" element={<PageCaracteristiques onRetour={() => navigate('/')} />} />
        <Route path="/origines" element={
          <Origines peuples={peuples} historiques={historiques}
            chargement={chargementPeuples || chargementHistoriques} onRetour={() => navigate('/')} />
        } />
        <Route path="/dons" element={<Dons dons={dons} chargement={chargementDons} onRetour={() => navigate('/')} />} />
        <Route path="/equipement" element={
          <Equipement objets={objets} services={services}
            chargement={chargementObjets || chargementServices} onRetour={() => navigate('/')} />
        } />
        <Route path="/progression" element={<Progression regles={regles} chargement={chargementRegles} onRetour={() => navigate('/')} />} />
        <Route path="/jouer" element={<JouerASideria regles={regles} chargement={chargementRegles} onRetour={() => navigate('/')} />} />
        <Route path="/sorts" element={
          <Sorts disciplines={disciplines} sorts={sorts}
            chargement={chargementDisciplines || chargementSorts} onRetour={() => navigate('/')} />
        } />
        <Route path="*" element={<Accueil onNaviguer={naviguer} />} />
      </Routes>
    </div>
  )
}
