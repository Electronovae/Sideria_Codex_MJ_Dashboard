import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFiche } from './useFiche.js'
import SectionClasse from './SectionClasse.jsx'
import { useClasses, useFactionsMonde } from './useClasses.js'
import {
  COMPETENCES_PAR_CARAC, LIBELLES_COMPETENCES, LIBELLES_CARAC,
  PALIERS_MONTEE, ORIGINES, modificateur,
} from './modeleFiche.js'

const ETAPES_CRISTALLITE = [
  ['0', 'Exposition'], ['1', 'Précoce'], ['1b', 'Consolidé'], ['2', 'Avancé'],
  ['3', 'Critique'], ['4', 'Terminal'], ['5', 'Passage'], ['6', 'Fusion'],
]

// Jauge cliquable/glissable : on ajuste la valeur en cliquant dans la barre,
// ou on tape une valeur précise dans les champs. couleurAuto colore PV en fonction du %.
function JaugeVisuelle({ label, valeur, max, onChangeValeur, onChangeMax, couleurAuto, extra }) {
  const v = valeur ?? 0
  const m = max ?? 0
  const pct = m > 0 ? Math.max(0, Math.min(100, (v / m) * 100)) : 0
  let couleur = 'var(--or)'
  if (couleurAuto) {
    couleur = pct > 60 ? 'var(--vert)' : pct > 30 ? 'var(--or)' : 'var(--rouge)'
  }
  const gererClic = (e) => {
    if (!m) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onChangeValeur(Math.round(ratio * m))
  }
  return (
    <div className="jauge-visuelle">
      <div className="jauge-visuelle-tete">
        <span className="jauge-visuelle-label">{label}</span>
        <span className="jauge-visuelle-chiffres">
          <input type="number" value={v} onChange={e => onChangeValeur(Number(e.target.value))} />
          <span className="jauge-visuelle-slash">/</span>
          <input type="number" value={m} onChange={e => onChangeMax(Number(e.target.value))} />
          {extra}
        </span>
      </div>
      <div className="jauge-visuelle-barre" onClick={gererClic} title="Cliquer pour ajuster">
        <div className="jauge-visuelle-remplissage" style={{ width: pct + '%', background: couleur }} />
      </div>
    </div>
  )
}

// Jauge de progression de la cristallite : bande segmentée sur les 8 stades,
// cliquable pour choisir directement un stade.
function JaugeCristallite({ code, onChange }) {
  const idx = Math.max(0, ETAPES_CRISTALLITE.findIndex(([c]) => c === String(code)))
  return (
    <div className="jauge-cristallite">
      <div className="jauge-cristallite-barre">
        {ETAPES_CRISTALLITE.map(([c, nom], i) => (
          <div key={c} className={'jauge-cristallite-seg' + (i <= idx ? ' actif' : '')}
            title={`${c} · ${nom}`} onClick={() => onChange(c)} />
        ))}
      </div>
      <div className="jauge-cristallite-label">
        Stade {ETAPES_CRISTALLITE[idx]?.[0]} — {ETAPES_CRISTALLITE[idx]?.[1] || '—'}
      </div>
    </div>
  )
}

// Jauge de réputation façon "compteur de pression" : centrée sur 0, remplissage
// vers le rouge (hostile) ou le vert (allié) selon le signe.
function JaugePression({ valeur, min = -4, max = 4, onChange, couleur }) {
  const v = valeur ?? 0
  const total = max - min
  const pctZero = ((0 - min) / total) * 100
  const pctVal = ((v - min) / total) * 100
  const hostile = v < 0
  const gererClic = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onChange(Math.round(min + ratio * total))
  }
  return (
    <div className="jauge-pression" onClick={gererClic} title="Cliquer pour ajuster">
      <div className="jauge-pression-fond">
        {hostile
          ? <div className="jauge-pression-remplissage jauge-pression-remplissage--hostile"
              style={{ left: pctVal + '%', width: (pctZero - pctVal) + '%', background: 'var(--rouge)' }} />
          : <div className="jauge-pression-remplissage jauge-pression-remplissage--allie"
              style={{ left: pctZero + '%', width: (pctVal - pctZero) + '%', background: couleur || 'var(--vert)' }} />}
        <div className="jauge-pression-zero" style={{ left: pctZero + '%' }} />
      </div>
    </div>
  )
}

export default function FeuilleDePersonnage({ estMJ }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    fiche, chargement, erreur, enregistrement, modifiee, dernierEnregistrement,
    modifier, modifierJson, enregistrer, supprimer, suppression,
    televerserPortrait, televersement,
  } = useFiche(id)
  const [confirmationSuppression, setConfirmationSuppression] = React.useState(false)
  const [ongletActif, setOngletActif] = React.useState('identite')
  const [factionAAjouter, setFactionAAjouter] = React.useState('')
  const [factionOuverte, setFactionOuverte] = React.useState(null)
  const { classes } = useClasses()
  const { factions: mondeFactions } = useFactionsMonde()

  const sauvegardesDeClasse = React.useMemo(() => {
    if (!fiche) return new Set()
    const ids = [fiche?.class_id, fiche?.class_secondaire_id].filter(Boolean)
    const s = new Set()
    ids.forEach(cid => {
      const c = classes.find(x => x.id === cid)
      ;(c?.saving_throws || []).forEach(code => s.add(code))
    })
    return s
  }, [classes, fiche?.class_id, fiche?.class_secondaire_id])

  if (chargement) return <div className="fiches-message">Chargement de la fiche…</div>
  if (erreur) return <div className="fiches-message fiches-message--erreur">{erreur}</div>
  if (!fiche) return null

  const champ = (label, cle, type = 'text') => (
    <label className="fc-champ">
      <span>{label}</span>
      <input type={type} value={fiche[cle] ?? ''} onChange={e => modifier(cle, type === 'number' ? Number(e.target.value) : e.target.value)} />
    </label>
  )

  const champJson = (label, groupe, cle, type = 'text') => (
    <label className="fc-champ">
      <span>{label}</span>
      <input
        type={type}
        value={fiche[groupe]?.[cle] ?? ''}
        onChange={e => modifierJson(groupe, cle, type === 'number' ? Number(e.target.value) : e.target.value)}
      />
    </label>
  )

  const champListe = (label, groupe, cle) => (
    <label className="fc-champ">
      <span>{label}</span>
      <input
        type="text"
        placeholder="séparés par des virgules"
        value={(fiche[groupe]?.[cle] ?? []).join(', ')}
        onChange={e => modifierJson(groupe, cle, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
      />
    </label>
  )

  const attaques = fiche.attacks ?? []
  const modifierAttaque = (i, ch, valeur) => {
    const copie = attaques.map((a, idx) => idx === i ? { ...a, [ch]: valeur } : a)
    modifier('attacks', copie)
  }
  const ajouterAttaque = () => modifier('attacks', [...attaques, { nom: '', bonus: '', degats: '' }])
  const retirerAttaque = (i) => modifier('attacks', attaques.filter((_, idx) => idx !== i))

  const inventaire = fiche.inventory ?? []
  const modifierObjet = (i, valeur) => modifier('inventory', inventaire.map((o, idx) => idx === i ? valeur : o))
  const ajouterObjet = () => modifier('inventory', [...inventaire, ''])
  const retirerObjet = (i) => modifier('inventory', inventaire.filter((_, idx) => idx !== i))

  const montees = fiche.montees_caracteristique ?? PALIERS_MONTEE.map(() => false)
  const basculerMontee = (i) => {
    const copie = montees.map((v, idx) => idx === i ? !v : v)
    modifier('montees_caracteristique', copie)
  }

  const journal = fiche.journal ?? []
  const modifierEntreeJournal = (i, valeur) => modifier('journal', journal.map((e, idx) => idx === i ? { ...e, texte: valeur } : e))
  const ajouterEntreeJournal = () => modifier('journal', [...journal, { id: crypto.randomUUID(), texte: '' }])
  const retirerEntreeJournal = (i) => modifier('journal', journal.filter((_, idx) => idx !== i))

  const ONGLETS = [
    { id: 'identite', label: 'Identité' },
    { id: 'carac', label: 'Caractéristiques' },
    { id: 'combat', label: 'Combat' },
    { id: 'role', label: 'Rôle-play' },
    { id: 'sac', label: 'Inventaire' },
    { id: 'notes', label: 'Notes' },
  ]

  const gererSuppression = async () => {
    const ok = await supprimer()
    if (ok) navigate('..')
  }
  const gererFichierPortrait = (e) => {
    const fichier = e.target.files?.[0]
    if (fichier) televerserPortrait(fichier)
  }

  return (
    <div className="feuille">
      <div className="feuille-sticky">
        <div className="feuille-barre">
          <button className="fiches-btn fiches-btn--discret" onClick={() => navigate('..')}>← Retour</button>
          <div className="feuille-statut">
            {enregistrement ? 'Enregistrement…' : modifiee ? 'Modifications non enregistrées' : dernierEnregistrement ? `Enregistré à ${dernierEnregistrement.toLocaleTimeString()}` : 'À jour'}
          </div>
          <button className="fiches-btn" disabled={!modifiee || enregistrement} onClick={enregistrer}>
            Enregistrer la fiche
          </button>
          {!confirmationSuppression ? (
            <button className="fiches-btn fiches-btn--danger" onClick={() => setConfirmationSuppression(true)}>
              Supprimer le personnage
            </button>
          ) : (
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '.8em', color: 'var(--rouge)' }}>Suppression définitive, confirmer ?</span>
              <button className="fiches-btn fiches-btn--danger" disabled={suppression} onClick={gererSuppression}>
                {suppression ? 'Suppression…' : 'Oui, supprimer'}
              </button>
              <button className="fiches-btn fiches-btn--discret" onClick={() => setConfirmationSuppression(false)}>Annuler</button>
            </span>
          )}
        </div>

        <div className="feuille-vitals">
          <div className="vital vital--pv">
            <span className="vital-label">PV</span>
            <span className="vital-valeur">{fiche.hp_current ?? 0}<span className="vital-sur">/{fiche.hp_max ?? 0}</span></span>
            {fiche.hp_temp ? <span className="vital-extra">+{fiche.hp_temp} temp.</span> : null}
          </div>
          <div className="vital">
            <span className="vital-label">GRD</span>
            <span className="vital-valeur">{fiche.armor_class ?? 10}</span>
          </div>
          <div className="vital">
            <span className="vital-label">Mana</span>
            <span className="vital-valeur">{fiche.mana_current ?? 0}<span className="vital-sur">/{fiche.mana_max ?? 0}</span></span>
          </div>
          <div className="vital">
            <span className="vital-label">Fragments</span>
            <span className="vital-valeur">{fiche.fragments_current ?? 0}</span>
          </div>
          <div className="vital vital--cristallite">
            <span className="vital-label">Cristallite</span>
            <span className="vital-valeur">{ETAPES_CRISTALLITE.find(([code]) => code === String(fiche.cristallite))?.[1] || '—'}</span>
          </div>
        </div>
        <div className="feuille-vitals feuille-vitals--carac">
          {Object.entries(LIBELLES_CARAC).map(([cle, libelle]) => (
            <div key={cle} className="vital vital--carac">
              <span className="vital-label">{libelle.slice(0, 3)}</span>
              <span className="vital-valeur">{fiche.stats?.[cle] ?? 10}
                <span className="vital-sur">{modificateur(fiche.stats?.[cle]) >= 0 ? ' +' : ' '}{modificateur(fiche.stats?.[cle])}</span>
              </span>
            </div>
          ))}
        </div>

        <nav className="feuille-tabs">
          {ONGLETS.map(o => (
            <button key={o.id} className={'feuille-tab' + (ongletActif === o.id ? ' actif' : '')}
              onClick={() => setOngletActif(o.id)}>
              {o.label}
            </button>
          ))}
        </nav>
      </div>

      <section className="feuille-bloc" hidden={ongletActif !== 'identite'}>
        <h2>Identité</h2>
        <div className="feuille-portrait">
          {fiche.avatar_url ? (
            <img src={fiche.avatar_url} alt="Portrait du personnage" className="feuille-portrait-img" />
          ) : (
            <div className="feuille-portrait-vide">Aucun portrait</div>
          )}
          <label className="fiches-btn fiches-btn--discret" style={{ cursor: 'pointer' }}>
            {televersement ? 'Envoi…' : 'Changer le portrait'}
            <input type="file" accept="image/*" onChange={gererFichierPortrait} disabled={televersement} style={{ display: 'none' }} />
          </label>
        </div>
        <div className="fc-grille fc-grille--4">
          {champ('Nom', 'name')}
          <label className="fc-champ">
            <span>Peuple / Origine</span>
            <select value={fiche.origin ?? ''} onChange={e => modifier('origin', e.target.value)}>
              <option value="">— Aucune —</option>
              {!ORIGINES.includes(fiche.origin) && fiche.origin && (
                <option value={fiche.origin}>{fiche.origin}</option>
              )}
              {ORIGINES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          {champ('Niveau Sidérien', 'level', 'number')}
          {champ('Fragments', 'fragments_current', 'number')}
        </div>
        <div className="fc-grille fc-grille--4" style={{ marginTop: 6 }}>
          {champ('Indice de Défense (ID)', 'indice_defense', 'number')}
          {champ('Initiative', 'initiative_bonus', 'number')}
          {champ('Perception passive', 'perception_passive', 'number')}
          {champ('SR de sort', 'sr_sort', 'number')}
        </div>
        <p className="feuille-note">Classe et sous-classe ci-dessous. Les features se débloquent avec les Fragments gagnés en jeu.</p>
      </section>

      <div hidden={ongletActif !== 'identite'}>
        <SectionClasse fiche={fiche} modifier={modifier} characterId={id} />
      </div>

      <section className="feuille-bloc" hidden={ongletActif !== 'carac'}>
        <h2>Caractéristiques</h2>
        <div className="carac-grille">
          {Object.entries(LIBELLES_CARAC).map(([cle, libelle]) => (
            <div key={cle} className="carac-bloc">
              <div className="carac-nom">{libelle}</div>
              <input
                type="number" className="carac-valeur"
                value={fiche.stats?.[cle] ?? 10}
                onChange={e => modifierJson('stats', cle, Number(e.target.value))}
              />
              <div className="carac-mod">{modificateur(fiche.stats?.[cle]) >= 0 ? '+' : ''}{modificateur(fiche.stats?.[cle])}</div>
              <label className={'carac-sauv' + (sauvegardesDeClasse.has(cle) ? ' carac-sauv--classe' : '')}>
                <input
                  type="checkbox"
                  checked={!!fiche.saving_throw_proficiencies?.[cle]}
                  onChange={e => modifierJson('saving_throw_proficiencies', cle, e.target.checked)}
                />
                <span>Sauv.{sauvegardesDeClasse.has(cle) ? ' ★' : ''}</span>
              </label>
              <div className="carac-competences">
                {COMPETENCES_PAR_CARAC[cle].map(comp => (
                  <label key={comp} className="carac-comp">
                    <input
                      type="checkbox"
                      checked={!!fiche.skill_proficiencies?.[comp]}
                      onChange={e => modifierJson('skill_proficiencies', comp, e.target.checked)}
                    />
                    {LIBELLES_COMPETENCES[comp]}
                  </label>
                ))}
              </div>
              {cle === 'ecl' && (
                <p style={{ fontSize: '.68em', color: 'var(--gris)', fontStyle: 'italic', marginTop: 4 }}>
                  Cristallite (CON/ÉCL) · Conduit · Traceur</p>
              )}
            </div>
          ))}
        </div>

        <div className="feuille-sousbloc">
          <h3>Montées de caractéristique</h3>
          <div className="montees-grille">
            {PALIERS_MONTEE.map((palier, i) => (
              <label key={palier} className="montee-case">
                <input type="checkbox" checked={!!montees[i]} onChange={() => basculerMontee(i)} />
                Niv. {palier}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="feuille-bloc" hidden={ongletActif !== 'combat'}>
        <h2>Attaques</h2>
        <div className="attaques-grille">
          {attaques.map((a, i) => (
            <div className="attaque-carte" key={i}>
              <div className="attaque-carte-tete">
                <input className="attaque-nom" placeholder="Nom de l'attaque" value={a.nom ?? ''}
                  onChange={e => modifierAttaque(i, 'nom', e.target.value)} />
                <button className="ligne-suppr" onClick={() => retirerAttaque(i)}>✕</button>
              </div>
              <div className="attaque-carte-corps">
                <label className="attaque-champ attaque-champ--bonus">
                  <span>Bonus</span>
                  <input value={a.bonus ?? ''} placeholder="+5" onChange={e => modifierAttaque(i, 'bonus', e.target.value)} />
                </label>
                <label className="attaque-champ attaque-champ--degats">
                  <span>Dégâts / Type / Notes</span>
                  <input value={a.degats ?? ''} placeholder="1d8+3 tranchant" onChange={e => modifierAttaque(i, 'degats', e.target.value)} />
                </label>
              </div>
            </div>
          ))}
        </div>
        {attaques.length === 0 && <p className="feuille-note">Aucune attaque pour l'instant.</p>}
        <button className="fiches-btn fiches-btn--discret" style={{ marginTop: 10 }} onClick={ajouterAttaque}>+ Ajouter une attaque</button>
      </section>

      <section className="feuille-bloc" hidden={ongletActif !== 'combat'}>
        <h2>Combat &amp; Ressources</h2>

        <div className="jauges-grille">
          <JaugeVisuelle label="Points de vie" valeur={fiche.hp_current} max={fiche.hp_max} couleurAuto
            onChangeValeur={v => modifier('hp_current', v)} onChangeMax={v => modifier('hp_max', v)}
            extra={fiche.hp_temp ? <span className="jauge-visuelle-temp">+{fiche.hp_temp} temp.</span> : null} />
          <JaugeVisuelle label="Mana" valeur={fiche.mana_current} max={fiche.mana_max}
            onChangeValeur={v => modifier('mana_current', v)} onChangeMax={v => modifier('mana_max', v)} />
          <JaugeVisuelle label={fiche.ressource_speciale_type || 'Fragments'} valeur={fiche.fragments_current} max={fiche.fragments_max}
            onChangeValeur={v => modifier('fragments_current', v)} onChangeMax={v => modifier('fragments_max', v)} />
        </div>

        <div className="fc-grille fc-grille--4" style={{ marginTop: 12 }}>
          {champ('PV Temp.', 'hp_temp', 'number')}
          {champ('GRD', 'armor_class', 'number')}
          {champ('Vitesse (m/tour)', 'speed', 'number')}
          {champ('Dés de résistance restants', 'hit_dice_remaining', 'number')}
        </div>

        <details className="feuille-accordeon">
          <summary>Armure et défense</summary>
          <div className="fc-grille fc-grille--3">
            {champ('Armure', 'armor_name')}
            {champ('Bouclier', 'shield_name')}
            {champ('Résistances / Immunités', 'resistances')}
          </div>
        </details>

        <details className="feuille-accordeon">
          <summary>Convertisseur</summary>
          <div className="fc-grille fc-grille--2">
            {champ('Type de convertisseur', 'convertisseur_type')}
            {champ('Type de ressource spéciale', 'ressource_speciale_type')}
          </div>
        </details>

        <details className="feuille-accordeon">
          <summary>Étincelle</summary>
          <div className="fc-grille fc-grille--3">
            {champJson('Dé actuel', 'spark', 'die')}
            {champJson('Utilisées', 'spark', 'current', 'number')}
            {champJson('Maximum', 'spark', 'max', 'number')}
          </div>
          <p className="feuille-note">Progression : 1d8 → 1d10 → 1d12 → 1d20</p>
        </details>

        <details className="feuille-accordeon">
          <summary>Jets de mort</summary>
          <div className="fc-grille fc-grille--3">
            {champ('Succès', 'death_saves_success', 'number')}
            {champ('Échecs', 'death_saves_failure', 'number')}
            <label className="fc-champ fc-champ--case">
              <input type="checkbox" checked={!!fiche.is_stable} onChange={e => modifier('is_stable', e.target.checked)} />
              <span>Stabilisé</span>
            </label>
          </div>
        </details>
      </section>

      <section className="feuille-bloc" hidden={ongletActif !== 'role'}>
        <h2>Cristallite</h2>
        <JaugeCristallite code={fiche.cristallite} onChange={c => modifier('cristallite', c)} />
        <table className="feuille-table">
          <thead><tr><th>Stade</th><th>Nom</th></tr></thead>
          <tbody>
            {ETAPES_CRISTALLITE.map(([code, nom]) => (
              <tr key={code}>
                <td>{code}</td>
                <td>
                  <label className="fc-champ--case">
                    <input
                      type="radio" name="cristallite" checked={String(fiche.cristallite) === code}
                      onChange={() => modifier('cristallite', code)}
                    /> {nom}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="feuille-bloc" hidden={ongletActif !== 'role'}>
        <h2>Réputation des factions</h2>
        {Object.keys(fiche.factions || {}).length === 0 && (
          <p className="feuille-note">Aucune faction ajoutée pour l'instant.</p>
        )}
        <div className="sceaux-grille">
          {Object.keys(fiche.factions || {}).map(fid => {
            const f = mondeFactions.find(x => x.id === fid)
            const val = fiche.factions?.[fid] ?? 0
            return (
              <button key={fid} type="button"
                className={'sceau' + (factionOuverte === fid ? ' sceau--ouvert' : '')}
                style={{ '--sceau-couleur': f?.couleur || '#888' }}
                onClick={() => setFactionOuverte(factionOuverte === fid ? null : fid)}>
                <span className="sceau-nom">{f?.nom || 'Faction inconnue'}</span>
                <span className="sceau-val">{val > 0 ? '+' : ''}{val}</span>
              </button>
            )
          })}
        </div>
        {factionOuverte && (fiche.factions || {})[factionOuverte] !== undefined && (() => {
          const f = mondeFactions.find(x => x.id === factionOuverte)
          const val = fiche.factions?.[factionOuverte] ?? 0
          return (
            <div className="jauge-rep" style={{ marginTop: 10 }}>
              <span className="nom">
                <span style={{ background: f?.couleur || '#888', display: 'inline-block', width: 9, height: 9, borderRadius: '50%', marginRight: 6 }} />
                {f?.nom || 'Faction inconnue'}
              </span>
              <JaugePression valeur={val} couleur={f?.couleur}
                onChange={v => modifierJson('factions', factionOuverte, v)} />
              <span className="val">{val > 0 ? '+' : ''}{val}</span>
              <button className="ligne-suppr" onClick={() => {
                const copie = { ...fiche.factions }
                delete copie[factionOuverte]
                modifier('factions', copie)
                setFactionOuverte(null)
              }}>✕</button>
            </div>
          )
        })()}
        <div className="fc-grille fc-grille--3" style={{ alignItems: 'end', marginTop: 12 }}>
          <label className="fc-champ">
            <span>Ajouter une faction</span>
            <select value={factionAAjouter} onChange={e => setFactionAAjouter(e.target.value)}>
              <option value="">— Choisir —</option>
              {mondeFactions.filter(f => !(fiche.factions || {})[f.id]).map(f => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </label>
          <button className="fiches-btn fiches-btn--discret" disabled={!factionAAjouter} onClick={() => {
            modifierJson('factions', factionAAjouter, 0)
            setFactionOuverte(factionAAjouter)
            setFactionAAjouter('')
          }}>+ Ajouter</button>
        </div>
      </section>

      <section className="feuille-bloc" hidden={ongletActif !== 'role'}>
        <h2>Traits, idéaux et liens</h2>
        <div className="fiches-cartes-grille">
          <div className="fiche-carte">
            <span className="fiche-carte-label">Trait de caractère</span>
            <textarea rows={2} value={fiche.personality_trait ?? ''} placeholder="« ... »"
              onChange={e => modifier('personality_trait', e.target.value)} />
          </div>
          <div className="fiche-carte">
            <span className="fiche-carte-label">Idéal</span>
            <textarea rows={2} value={fiche.ideal ?? ''} placeholder="« ... »"
              onChange={e => modifier('ideal', e.target.value)} />
          </div>
          <div className="fiche-carte">
            <span className="fiche-carte-label">Lien / attache</span>
            <textarea rows={2} value={fiche.bond ?? ''} placeholder="« ... »"
              onChange={e => modifier('bond', e.target.value)} />
          </div>
          <div className="fiche-carte fiche-carte--defaut">
            <span className="fiche-carte-label">Défaut</span>
            <textarea rows={2} value={fiche.flaw ?? ''} placeholder="« ... »"
              onChange={e => modifier('flaw', e.target.value)} />
          </div>
          <div className="fiche-carte fiche-carte--defaut">
            <span className="fiche-carte-label">Peur / ligne rouge</span>
            <textarea rows={2} value={fiche.fear_redline ?? ''} placeholder="« ... »"
              onChange={e => modifier('fear_redline', e.target.value)} />
          </div>
        </div>
        <div className="fc-grille fc-grille--3" style={{ marginTop: 10 }}>
          {champListe('Alliés de confiance', 'relations', 'allies')}
          {champListe('Ennemis / rivaux', 'relations', 'enemies')}
          {champListe('Dettes / obligations', 'relations', 'debts')}
        </div>
      </section>

      <section className="feuille-bloc" hidden={ongletActif !== 'role'}>
        <h2>Journal</h2>
        <p className="feuille-note">Petites notes qui s'accumulent au fil des sessions.</p>
        {journal.map((entree, i) => (
          <div className="journal-entree" key={entree.id ?? i}>
            <span className="journal-puce">§</span>
            <textarea rows={2} value={entree.texte ?? ''} placeholder="Ce qui s'est passé, ce qu'on a appris, ce qu'on a ressenti…"
              onChange={e => modifierEntreeJournal(i, e.target.value)} />
            <button className="ligne-suppr" onClick={() => retirerEntreeJournal(i)}>✕</button>
          </div>
        ))}
        <button className="fiches-btn fiches-btn--discret" style={{ marginTop: 6 }} onClick={ajouterEntreeJournal}>+ Nouvelle entrée</button>
      </section>

      <section className="feuille-bloc" hidden={ongletActif !== 'sac'}>
        <h2>Inventaire</h2>
        {inventaire.map((objet, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            <input value={objet} onChange={e => modifierObjet(i, e.target.value)} style={{ flex: 1 }} />
            <button className="ligne-suppr" onClick={() => retirerObjet(i)}>✕</button>
          </div>
        ))}
        <button className="fiches-btn fiches-btn--discret" style={{ marginTop: 4 }} onClick={ajouterObjet}>+ Ajouter un objet</button>

        <div className="fc-grille fc-grille--6" style={{ marginTop: 14 }}>
          {champJson('LE', 'currency', 'le', 'number')}
          {champJson('PP', 'currency', 'pp', 'number')}
          {champJson('PO', 'currency', 'po', 'number')}
          {champJson('PA', 'currency', 'pa', 'number')}
          {champJson('PC', 'currency', 'pc', 'number')}
          {champJson('Cristaux', 'currency', 'cristaux', 'number')}
        </div>
        <label className="fc-champ fc-champ--zone" style={{ marginTop: 12 }}>
          <span>Taux de conversion</span>
          <textarea rows={2} placeholder="Ex. 1 PO = 10 PA = 100 PC · 1 PP = 5 PO · 1 Cristal = ..."
            value={fiche.conversion_monnaie ?? ''} onChange={e => modifier('conversion_monnaie', e.target.value)} />
        </label>
      </section>

      <section className="feuille-bloc" hidden={ongletActif !== 'notes'}>
        <h2>Notes libres</h2>
        <label className="fc-champ fc-champ--zone">
          <span>Notes</span>
          <textarea rows={6} value={fiche.notes ?? ''} onChange={e => modifier('notes', e.target.value)} />
        </label>
        {estMJ && (
          <label className="fc-champ fc-champ--zone fc-champ--mj">
            <span>Notes MJ (visibles par le MJ uniquement)</span>
            <textarea rows={4} value={fiche.notes_mj ?? ''} onChange={e => modifier('notes_mj', e.target.value)} />
          </label>
        )}
      </section>

      <div className="feuille-barre feuille-barre--basse">
        <button className="fiches-btn" disabled={!modifiee || enregistrement} onClick={enregistrer}>
          Enregistrer la fiche
        </button>
      </div>
    </div>
  )
}
