import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { authActif, sessionActuelle, surChangementSession, obtenirOuCreerPlayer, deconnexion } from './authClient.js'
import Login from './Login.jsx'
import Selection from './Selection.jsx'
import CreationGuidee from './CreationGuidee.jsx'
import FeuilleDePersonnage from './FeuilleDePersonnage.jsx'
import BanniereMotDePasse from './BanniereMotDePasse.jsx'

export default function FichesApp() {
  const [session, setSession] = useState(undefined) // undefined = pas encore vérifié
  const [player, setPlayer] = useState(null)
  const [erreur, setErreur] = useState(null)
  const [banniereIgnoree, setBanniereIgnoree] = useState(false)

  useEffect(() => {
    sessionActuelle().then(setSession)
    return surChangementSession(setSession)
  }, [])

  useEffect(() => {
    if (!session) { setPlayer(null); return }
    obtenirOuCreerPlayer(session.user.id, session.user.email ?? 'voyageur')
      .then(setPlayer)
      .catch(err => setErreur(err.message))
  }, [session])

  if (!authActif()) {
    return <div className="fiches-message">Supabase non configuré (.env manquant). Le module fiches nécessite une connexion active.</div>
  }

  if (session === undefined) {
    return <div className="fiches-message">Chargement…</div>
  }

  if (!session) {
    return <Login />
  }

  if (erreur) {
    return <div className="fiches-message fiches-message--erreur">{erreur}</div>
  }

  if (!player) {
    return <div className="fiches-message">Chargement du profil…</div>
  }

  const estMJ = player.role === 'admin' || player.role === 'mj'
  const proposerMotDePasse = !player.password_defini && !banniereIgnoree

  return (
    <div className="fiches-app">
      <header className="fiches-header">
        <span className="fiches-header-titre">The Sideria Codex <em>— Fiches Personnage</em></span>
        <nav className="fiches-header-nav">
          <a href="/" className="fiches-btn fiches-btn--discret">Wiki ↗</a>
          {estMJ && <a href="/studio" className="fiches-btn fiches-btn--discret">Studio ↗</a>}
        </nav>
        <span className="fiches-header-joueur">
          {player.name_player} {estMJ && <span className="fiches-badge">MJ</span>}
        </span>
        <button className="fiches-btn fiches-btn--discret" onClick={deconnexion}>Se déconnecter</button>
      </header>
      {proposerMotDePasse && (
        <BanniereMotDePasse
          player={player}
          onDefini={() => setPlayer({ ...player, password_defini: true })}
          onIgnorer={() => setBanniereIgnoree(true)}
        />
      )}
      <main className="fiches-main">
        <Routes>
          <Route path="/" element={<Selection player={player} estMJ={estMJ} />} />
          <Route path="nouveau" element={<CreationGuidee player={player} />} />
          <Route path=":id" element={<FeuilleDePersonnage player={player} estMJ={estMJ} />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </main>
    </div>
  )
}
