import React, { useEffect, useMemo, useState } from 'react'
import { TexteLeger } from './texteLeger.jsx'
import { supabase } from '../lib/supabase.js'
import { sessionActuelle, surChangementSession } from '../fiches/authClient.js'

const CATEGORIES = [
  { id: 'attaque', label: 'Attaque' },
  { id: 'soutien', label: 'Soutien' },
  { id: 'controle', label: 'Contrôle' },
  { id: 'utilitaire', label: 'Utilitaire' },
  { id: 'autre', label: 'Autre' },
]
const PALIERS_MANA = [1, 2, 3, 4, 5]

// Ajout d'un sort à une fiche perso : nécessite d'être connecté et d'avoir choisi
// une fiche. On lit/écrit directement sorts_connus (jsonb) sur la table characters.
function useMesFiches() {
  const [session, setSession] = useState(undefined)
  const [fiches, setFiches] = useState([])
  const [ficheId, setFicheId] = useState(null)

  useEffect(() => {
    if (!supabase) { setSession(null); return }
    sessionActuelle().then(setSession)
    return surChangementSession(setSession)
  }, [])

  useEffect(() => {
    if (!supabase || !session) { setFiches([]); return }
    supabase.from('characters').select('id, name, sorts_connus').eq('user_id', session.user.id).order('name')
      .then(({ data }) => {
        setFiches(data || [])
        setFicheId(prev => prev && data?.some(f => f.id === prev) ? prev : (data?.[0]?.id ?? null))
      })
  }, [session])

  const fiche = fiches.find(f => f.id === ficheId)

  const ajouter = async (sortId) => {
    if (!fiche) return
    const connus = Array.isArray(fiche.sorts_connus) ? fiche.sorts_connus : []
    if (connus.includes(sortId)) return
    const majConnus = [...connus, sortId]
    const { error } = await supabase.from('characters').update({ sorts_connus: majConnus }).eq('id', fiche.id)
    if (!error) setFiches(fs => fs.map(f => f.id === fiche.id ? { ...f, sorts_connus: majConnus } : f))
  }
  const retirer = async (sortId) => {
    if (!fiche) return
    const majConnus = (fiche.sorts_connus || []).filter(id => id !== sortId)
    const { error } = await supabase.from('characters').update({ sorts_connus: majConnus }).eq('id', fiche.id)
    if (!error) setFiches(fs => fs.map(f => f.id === fiche.id ? { ...f, sorts_connus: majConnus } : f))
  }

  return { connecte: !!session, fiches, ficheId, setFicheId, fiche, ajouter, retirer }
}

function CarteSort({ sort, mesFiches }) {
  const champs = sort.contenu?.filter(c => c.type === 'champ') ?? []
  const description = sort.contenu?.find(c => c.type === 'description')
  const progression = sort.contenu?.find(c => c.type === 'progression')
  const dejaConnu = mesFiches.fiche?.sorts_connus?.includes(sort.id)

  return (
    <div className="wiki-feature">
      <div className="wiki-feature-tete">
        <span className="wiki-feature-nom">{sort.nom}</span>
        {sort.cout_mana != null && <span className="wiki-feature-cout">{sort.cout_mana} Mana</span>}
      </div>
      <div className="wiki-libelle-discret" style={{ marginBottom: 4 }}>{sort.sous_type}</div>
      <div className="wiki-libelle-discret" style={{ marginBottom: 8, fontStyle: 'italic' }}>{sort.meta}</div>

      {champs.map((c, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <span style={{ fontWeight: 600 }}>{c.label}</span>{' '}
          <span className="wiki-feature-texte" style={{ display: 'inline' }}><TexteLeger>{c.texte}</TexteLeger></span>
        </div>
      ))}
      {description && (
        <p className="wiki-feature-texte" style={{ fontStyle: 'italic', marginTop: 6 }}>
          <TexteLeger>{description.texte}</TexteLeger>
        </p>
      )}
      {progression && (
        <div className="wiki-encart" style={{ marginTop: 6 }}>
          <div className="wiki-encart-titre">Progression</div>
          <TexteLeger>{progression.texte}</TexteLeger>
        </div>
      )}

      {mesFiches.connecte && mesFiches.fiche && (
        <button
          type="button"
          className={'wiki-bouton-ajout-sort' + (dejaConnu ? ' actif' : '')}
          onClick={() => dejaConnu ? mesFiches.retirer(sort.id) : mesFiches.ajouter(sort.id)}
        >
          {dejaConnu ? `✓ Sur la fiche de ${mesFiches.fiche.name}` : `+ Ajouter à la fiche de ${mesFiches.fiche.name}`}
        </button>
      )}
    </div>
  )
}

export default function Sorts({ disciplines, sorts, chargement, onRetour }) {
  const [discActive, setDiscActive] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [categoriesActives, setCategoriesActives] = useState(() => new Set())
  const [manaMax, setManaMax] = useState(null) // null = pas de filtre
  const mesFiches = useMesFiches()

  const disciplineCourante = discActive ?? disciplines[0]?.nom ?? null

  const basculerCategorie = (id) => setCategoriesActives(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const sortsAffiches = useMemo(() => {
    let liste = sorts.filter(s => {
      const disc = disciplines.find(d => d.id === s.discipline_id)
      return disc?.nom === disciplineCourante
    })
    if (recherche.trim()) {
      const q = recherche.trim().toLowerCase()
      liste = liste.filter(s => s.nom.toLowerCase().includes(q) || (s.sous_type || '').toLowerCase().includes(q))
    }
    if (categoriesActives.size) liste = liste.filter(s => categoriesActives.has(s.categorie))
    if (manaMax != null) liste = liste.filter(s => s.cout_mana != null && s.cout_mana <= manaMax)
    return liste
  }, [sorts, disciplines, disciplineCourante, recherche, categoriesActives, manaMax])

  const disciplineInfo = disciplines.find(d => d.nom === disciplineCourante)

  if (chargement) {
    return <div className="wiki-page"><p className="wiki-vide">Chargement…</p></div>
  }

  return (
    <div className="wiki-page">
      <button className="wiki-retour" onClick={onRetour}>← Accueil</button>
      <div className="wiki-entete">
        <h1>Sorts</h1>
        <p className="wiki-sous-titre">339 sorts répartis en 11 disciplines.</p>
      </div>

      {mesFiches.connecte && mesFiches.fiches.length > 0 && (
        <div className="wiki-selecteur-fiche">
          <label>Ajouter les sorts à</label>
          <select value={mesFiches.ficheId || ''} onChange={e => mesFiches.setFicheId(e.target.value)}>
            {mesFiches.fiches.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      )}

      <input
        type="text"
        placeholder="Rechercher un sort, un mot-clé de type…"
        value={recherche}
        onChange={e => setRecherche(e.target.value)}
        className="wiki-recherche"
        style={{ marginBottom: 10 }}
      />

      <div className="wiki-filtres-sorts">
        <div className="wiki-filtres-groupe">
          <span className="wiki-filtres-label">Type</span>
          {CATEGORIES.map(c => (
            <span key={c.id} className={'wiki-puce-filtre' + (categoriesActives.has(c.id) ? ' actif' : '')}
              onClick={() => basculerCategorie(c.id)}>{c.label}</span>
          ))}
        </div>
        <div className="wiki-filtres-groupe">
          <span className="wiki-filtres-label">Coût max</span>
          <span className={'wiki-puce-filtre' + (manaMax == null ? ' actif' : '')} onClick={() => setManaMax(null)}>Tous</span>
          {PALIERS_MANA.map(m => (
            <span key={m} className={'wiki-puce-filtre' + (manaMax === m ? ' actif' : '')}
              onClick={() => setManaMax(m)}>{m} Mana</span>
          ))}
        </div>
      </div>

      <div className="wiki-pastilles-sous-classes">
        {disciplines.map(d => (
          <span key={d.id} className={'wiki-pastille-sous-classe' + (d.nom === disciplineCourante ? ' actif' : '')}
            onClick={() => setDiscActive(d.nom)}>{d.nom}</span>
        ))}
      </div>

      {disciplineInfo && (
        <div className="wiki-entete" style={{ marginTop: 4 }}>
          {disciplineInfo.flavour && <p className="wiki-citation">{disciplineInfo.flavour}</p>}
          {disciplineInfo.intro && <p className="wiki-description">{disciplineInfo.intro}</p>}
        </div>
      )}

      {sortsAffiches.length === 0 && <p className="wiki-vide">Aucun sort trouvé.</p>}
      {sortsAffiches.map(s => <CarteSort key={s.id} sort={s} mesFiches={mesFiches} />)}
    </div>
  )
}
