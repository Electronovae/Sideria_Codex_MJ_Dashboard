import React, { useEffect, useState } from 'react'
import { useStudio, Champ, SelecteurFaction, ListeFiche, DateSiderienne, Texte } from './communs.jsx'
import { nouveauJoueur, nouvelleEntreeHistorique, TYPES_HISTORIQUE } from '../lib/modele.js'
import { fmtDate } from '../lib/calendrier.js'
import { supabase } from '../lib/supabase.js'

// Lien de référence vers la vraie fiche technique du joueur (tables Player/characters de Romain,
// jamais modifiées ici : lecture seule). On stocke juste characterId sur le PJ du Studio.
let CACHE_CLASSES = null
function nomClasse(id, subId) {
  if (!CACHE_CLASSES || !id) return null
  const c = CACHE_CLASSES.find(x => x.id === id)
  if (!c) return null
  const s = subId ? c.subclasses?.find(x => x.id === subId) : null
  return s ? `${c.nom} · ${s.nom}` : c.nom
}

function LienFicheJoueur({ joueur, modifier }) {
  const [options, setOptions] = useState(null)

  useEffect(() => {
    if (!supabase) return
    if (!CACHE_CLASSES) {
      supabase.from('classes_sideria').select('id, nom, subclasses_sideria(id, nom)').then(({ data }) => {
        CACHE_CLASSES = (data || []).map(c => ({ ...c, subclasses: c.subclasses_sideria }))
      })
    }
    supabase.from('characters').select('id, name, level').order('name').then(({ data }) => setOptions(data || []))
  }, [])

  // Dès qu'un characterId est renseigné, on synchronise personnage/joueur/classe/niveau depuis
  // la vraie fiche : le reste de l'appli (Codex, Graphe, Frise, Recherche, export Obsidian, Supabase)
  // continue de lire ces champs normalement, sans rien savoir du lien.
  useEffect(() => {
    if (!supabase || !joueur.characterId) return
    let annule = false
    Promise.all([
      supabase.from('characters').select('name, level, class_id, subclass_id').eq('id', joueur.characterId).maybeSingle(),
      supabase.from('Player').select('name_player').eq('character_id', joueur.characterId).maybeSingle(),
    ]).then(([{ data: perso }, { data: pl }]) => {
      if (annule || !perso) return
      modifier(x => {
        x.personnage = perso.name
        x.niveau = perso.level
        x.classe = nomClasse(perso.class_id, perso.subclass_id) || x.classe
        if (pl?.name_player) x.joueur = pl.name_player
      })
    })
    return () => { annule = true }
  }, [joueur.characterId])

  if (!supabase) return null

  return (
    <div className="carte" style={{ marginBottom: 16 }}>
      <label>Fiche technique liée</label>
      <select value={joueur.characterId || ''} onChange={e => modifier(x => { x.characterId = e.target.value || null })}>
        <option value="">— non liée —</option>
        {(options || []).map(c => <option key={c.id} value={c.id}>{c.name} (niv. {c.level})</option>)}
      </select>
      {joueur.characterId
        ? <p className="aide" style={{ marginTop: 6 }}>Synchronisé depuis la fiche du joueur. <a href="/fiches" target="_blank" rel="noreferrer">ouvrir les fiches ↗</a></p>
        : <p className="aide" style={{ marginTop: 6 }}>Sélectionne la fiche du joueur pour remplir automatiquement son nom, sa classe et son niveau.</p>}
    </div>
  )
}

export default function Joueurs() {
  const { univers, maj } = useStudio()
  const [selId, setSelId] = useState(univers.joueurs[0]?.id ?? null)
  const j = univers.joueurs.find(x => x.id === selId)

  const ajouter = () => {
    const n = nouveauJoueur()
    maj(u => u.joueurs.push(n))
    setSelId(n.id)
  }
  const modifier = (fn) => maj(u => { fn(u.joueurs.find(x => x.id === selId)) })
  const supprimer = () => {
    if (!confirm(`Supprimer ${j.personnage} ?`)) return
    maj(u => { u.joueurs = u.joueurs.filter(x => x.id !== selId) })
    setSelId(null)
  }
  const sessionsJouees = j ? univers.campagnes.flatMap(c =>
    c.sessions.filter(s => (s.joueurIds || []).includes(j.id)).map(s => ({ ...s, campagne: c }))
  ).sort((a, b) => (a.date ?? 0) - (b.date ?? 0)) : []

  const nbRelies = univers.joueurs.filter(x => x.characterId).length

  return (
    <ListeFiche
      items={univers.joueurs} selId={selId} surSel={setSelId} surAjout={ajouter}
      libelleAjout="+ Nouveau personnage joueur"
      entete={<p className="aide" style={{ padding: '0 14px 8px' }}>
        🔗 {nbRelies} / {univers.joueurs.length} fiche(s) personnage reliée(s)</p>}
      tris={{
        personnage: x => x.personnage,
        joueur: x => x.joueur,
        niveau: x => -x.niveau,
        faction: x => univers.factions.find(f => f.id === x.faction)?.nom || 'zzz',
      }}
      rendu={p => {
        const f = univers.factions.find(x => x.id === p.faction)
        return (<><span className="rond" style={{ background: f?.couleur || '#888' }} />
          <span>{p.personnage}
            {p.characterId && <span title="Fiche personnage reliée" style={{ marginLeft: 6, color: 'var(--or)' }}>🔗</span>}
            <div className="sous">{p.joueur} · niv. {p.niveau}</div>
          </span></>)
      }}
      enfants={j && (
        <div key={j.id}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h2 style={{ flex: 1 }}>{j.personnage}</h2>
            <a className="btn clair" href="/fiches" target="_blank" rel="noreferrer"
              style={{ textDecoration: 'none' }}>Fiches personnage ↗</a>
          </div>
          <LienFicheJoueur joueur={j} modifier={modifier} />
          <div className="rangee">
            <span><label>Faction actuelle</label>
              <SelecteurFaction valeur={j.faction} surChange={v => modifier(x => { x.faction = v })} /></span>
          </div>
          <span><label>Contact / supérieur dans la faction (pour l'organigramme)</label>
            <select value={j.superieurId || ''} onChange={e => modifier(x => { x.superieurId = e.target.value || null })}>
              <option value="">— aucun, affiché à la racine —</option>
              {univers.pnjs.filter(p => p.faction === j.faction).map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select></span>
          <Champ label="Notes MJ (fils personnels, dettes, promesses)" zone value={j.notes}
            onChange={e => modifier(x => { x.notes = e.target.value })} />
          <Champ label="Secrets Maître (ce que le personnage ignore, réservé au MJ)" zone value={j.secrets}
            onChange={e => modifier(x => { x.secrets = e.target.value })} />

          <h3>Citations</h3>
          <p className="aide">Les phrases mémorables prononcées à la table.</p>
          {j.citations.map((c, i) => (
            <div className="rangee" key={i}>
              <input value={c} placeholder="« ... »"
                onChange={e => modifier(x => { x.citations[i] = e.target.value })} />
              <button className="btn clair etroit" onClick={() => modifier(x => { x.citations.splice(i, 1) })}>retirer</button>
            </div>
          ))}
          <button className="btn clair" onClick={() => modifier(x => { x.citations.push('') })}>+ citation</button>

          <h3>Sessions jouées ({sessionsJouees.length})</h3>
          <p className="aide">Coché depuis l'onglet Méta et Campagnes, fiche de la session. Utile pour retrouver qui était là quand.</p>
          {sessionsJouees.length
            ? <ul style={{ marginLeft: 18 }}>{sessionsJouees.map(s => (
                <li key={s.id}>
                  <strong>{s.date != null ? fmtDate(s.date) : 'sans date'}</strong> · {s.code ? s.code + ' · ' : ''}{s.titre}
                  <span className="aide"> ({s.campagne.titre})</span>
                </li>
              ))}</ul>
            : <p className="aide">Aucune session cochée pour ce personnage pour l'instant.</p>}

          <h3>Historique</h3>
          <p className="aide">Tout ce que le personnage a vécu : rencontres, combats, lieux traversés, révélations. Les entrées datées apparaissent sur sa ligne de la frise.</p>
          {j.historique.map((it, i) => {
            const p = univers.pnjs.find(x => x.id === it.pnjId)
            const l = univers.lieux.find(x => x.id === it.lieuId)
            return (
              <div className="carte" key={it.id}>
                <div className="rangee">
                  <span className="etroit"><label>Type</label>
                    <select value={it.type} onChange={e => modifier(x => { x.historique[i].type = e.target.value })}>
                      {TYPES_HISTORIQUE.map(t => <option key={t}>{t}</option>)}
                    </select></span>
                  <DateSiderienne label="Date" optionnel valeur={it.date}
                    surChange={v => modifier(x => { x.historique[i].date = v })} />
                </div>
                <div className="rangee">
                  <span><label>PNJ concerné</label>
                    <select value={it.pnjId || ''} onChange={e => modifier(x => { x.historique[i].pnjId = e.target.value || null })}>
                      <option value="">—</option>
                      {univers.pnjs.map(pp => <option key={pp.id} value={pp.id}>{pp.nom}</option>)}
                    </select></span>
                  <span><label>Lieu</label>
                    <select value={it.lieuId || ''} onChange={e => modifier(x => { x.historique[i].lieuId = e.target.value || null })}>
                      <option value="">—</option>
                      {univers.lieux.map(ll => <option key={ll.id} value={ll.id}>{ll.nom}</option>)}
                    </select></span>
                </div>
                <div className="rangee">
                  <span><label>Campagne</label>
                    <select value={it.campagneId || ''} onChange={e => modifier(x => {
                      x.historique[i].campagneId = e.target.value || null; x.historique[i].sessionId = null
                    })}>
                      <option value="">—</option>
                      {univers.campagnes.map(c => <option key={c.id} value={c.id}>{c.titre}</option>)}
                    </select></span>
                  {it.campagneId && <span><label>Session</label>
                    <select value={it.sessionId || ''} onChange={e => modifier(x => { x.historique[i].sessionId = e.target.value || null })}>
                      <option value="">—</option>
                      {univers.campagnes.find(c => c.id === it.campagneId)?.sessions.map(s =>
                        <option key={s.id} value={s.id}>{(s.code ? s.code + ' ' : '') + s.titre}</option>)}
                    </select></span>}
                </div>
                <Champ label="Ce qui s'est passé" zone value={it.resume}
                  onChange={e => modifier(x => { x.historique[i].resume = e.target.value })} />
                <Champ label="Effet (compteur, réputation, promesse...)" value={it.effet}
                  onChange={e => modifier(x => { x.historique[i].effet = e.target.value })} />
                <div className="aide">{it.type}{p ? ` · ${p.nom}` : ''}{l ? ` · ${l.nom}` : ''} · {it.date != null ? fmtDate(it.date) : 'sans date'}</div>
                <button className="btn clair" style={{ marginTop: 6 }}
                  onClick={() => modifier(x => { x.historique.splice(i, 1) })}>retirer</button>
              </div>
            )
          })}
          <button className="btn clair" onClick={() => modifier(x => {
            x.historique.push(nouvelleEntreeHistorique())
          })}>+ entrée d'historique</button>

          <div style={{ marginTop: 24 }}>
            <button className="btn danger" onClick={supprimer}>Supprimer ce personnage</button>
          </div>
        </div>
      )}
    />
  )
}
