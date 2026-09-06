import React, { useState } from 'react'
import { metaClasse } from './roleMeta.js'
import { TexteLeger } from './texteLeger.jsx'

function Feature({ f, forceOuvert }) {
  const [ouvert, setOuvert] = useState(false)
  React.useEffect(() => { if (forceOuvert != null) setOuvert(forceOuvert) }, [forceOuvert])
  const complet = f.texte_complet && f.texte_complet !== f.description
  return (
    <div className="wiki-feature">
      <div className="wiki-feature-tete">
        <div className="wiki-feature-nom">{f.nom}</div>
        <span className="wiki-feature-cout">
          {f.cout_fragments ? `${f.cout_fragments} Frag.` : ''}
          {f.niveau_requis ? ` · niv. ${f.niveau_requis}` : ''}
        </span>
      </div>
      <div className="wiki-feature-texte"><TexteLeger>{ouvert || !complet ? (f.texte_complet || f.description) : f.description}</TexteLeger></div>
      {complet && (
        <span onClick={() => setOuvert(o => !o)} style={{ cursor: 'pointer', color: 'var(--or)', fontSize: '.78rem' }}>
          {ouvert ? '▲ résumé' : '▼ texte complet du manuel'}
        </span>
      )}
    </div>
  )
}

function BlocBase({ base }) {
  if (!base?.fields?.length) return null
  return (
    <div className="wiki-stats">
      {base.fields.map((f, i) => (
        <div key={i} className="wiki-stat">
          <div className="wiki-stat-label">{f.label}</div>
          <div className="wiki-stat-valeur"><TexteLeger>{f.value}</TexteLeger></div>
        </div>
      ))}
    </div>
  )
}

export default function FicheClasse({ classe, onRetour }) {
  const [onglet, setOnglet] = useState('techniques') // 'techniques' | 'specialisations'
  const [sousClasseId, setSousClasseId] = useState(classe.subclasses?.[0]?.id ?? null)
  const [forceOuvert, setForceOuvert] = useState(null)
  const meta = metaClasse(classe.nom)
  const sousClasse = classe.subclasses?.find(s => s.id === sousClasseId)

  return (
    <div className="wiki-page">
      <button className="wiki-retour" onClick={onRetour}>← Toutes les classes</button>

      <div className="wiki-entete">
        <div className="wiki-carte-tete" style={{ marginBottom: 6 }}>
          <span className="wiki-pastille" style={{ background: meta.couleur }} />
          <span className="wiki-libelle-discret">Classe</span>
        </div>
        <h1>{classe.nom}</h1>
        {classe.flavour && <p className="wiki-citation">{classe.flavour}</p>}
        {meta.tags?.length > 0 && (
          <div className="wiki-tags" style={{ marginTop: 8 }}>
            {meta.tags.map(t => <span key={t} className="wiki-tag">{t}</span>)}
          </div>
        )}
      </div>

      <div className="wiki-corps">
        {classe.description && <p className="wiki-description"><TexteLeger>{classe.description}</TexteLeger></p>}
        {(classe.description_extra || []).map((extra, i) => (
          <div key={i} className="wiki-encart">
            {extra.title && <div className="wiki-encart-titre">{extra.title}</div>}
            <TexteLeger>{extra.text}</TexteLeger>
          </div>
        ))}

        <BlocBase base={classe.base} />

        <div className="wiki-onglets" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex' }}>
            <button
              className={'wiki-onglet' + (onglet === 'techniques' ? ' actif' : '')}
              onClick={() => setOnglet('techniques')}
            >Techniques</button>
            {classe.subclasses?.length > 0 && (
              <button
                className={'wiki-onglet' + (onglet === 'specialisations' ? ' actif' : '')}
                onClick={() => setOnglet('specialisations')}
              >{classe.subclasses_label || 'Spécialisations'}</button>
            )}
          </span>
          <button className="wiki-retour" onClick={() => setForceOuvert(v => !(v ?? false))}>
            {forceOuvert ? '▲ replier tout' : '▼ texte complet du manuel'}
          </button>
        </div>

        {onglet === 'techniques' && (
          <div>
            {(classe.features || []).map(f => <Feature key={f.id} f={f} forceOuvert={forceOuvert} />)}
            {classe.legendaire?.length > 0 && (
              <>
                <h2 className="wiki-sous-titre-section">Capacités légendaires</h2>
                {classe.legendaire.map((l, i) => (
                  <div key={i} className="wiki-feature">
                    <div className="wiki-feature-texte"><TexteLeger>{l.text}</TexteLeger></div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {onglet === 'specialisations' && classe.subclasses?.length > 0 && (
          <div>
            <div className="wiki-pastilles-sous-classes">
              {classe.subclasses.map(sc => (
                <span
                  key={sc.id}
                  className={'wiki-pastille-sous-classe' + (sc.id === sousClasseId ? ' actif' : '')}
                  onClick={() => setSousClasseId(sc.id)}
                >{sc.nom}</span>
              ))}
            </div>
            {sousClasse && (
              <div>
                {sousClasse.tagline && <p className="wiki-citation">{sousClasse.tagline}</p>}
                {sousClasse.flavour && <p className="wiki-description"><TexteLeger>{sousClasse.flavour}</TexteLeger></p>}
                {(sousClasse.features || []).map(f => <Feature key={f.id} f={f} forceOuvert={forceOuvert} />)}
                {Array.isArray(sousClasse.mechanics) && sousClasse.mechanics.map((m, i) => (
                  <div key={i} className="wiki-feature">
                    <div className="wiki-feature-texte"><TexteLeger>{typeof m === 'string' ? m : m.text}</TexteLeger></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
