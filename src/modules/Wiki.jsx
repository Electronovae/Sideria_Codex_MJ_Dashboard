import React, { useMemo, useState } from 'react'
import { ListeFiche, Texte } from './communs.jsx'
import { useClasses } from '../fiches/useClasses.js'
import { useDisciplinesSorts, useSorts } from '../wiki/useWikiData.js'
import { supabase } from '../lib/supabase.js'

// ── Petits blocs de présentation, tous en lecture seule (le contenu du manuel n'est pas
// édité ici), à l'exception du set de sorts de départ par classe, géré en bas de fiche. ──

function BlocBase({ base }) {
  if (!base?.fields?.length) return null
  return (
    <table style={{ margin: '8px 0' }}>
      <tbody>
        {base.fields.map((f, i) => (
          <tr key={i}>
            <td style={{ color: 'var(--gris)', paddingRight: 12, whiteSpace: 'nowrap' }}>{f.label}</td>
            <td><Texte>{f.value}</Texte></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BlocExtra({ items }) {
  if (!items?.length) return null
  return items.map((it, i) => (
    <div key={i} className="carte" style={{ marginBottom: 10 }}>
      {it.title && <h4 style={{ margin: '0 0 4px' }}>{it.title}</h4>}
      <Texte>{it.text}</Texte>
    </div>
  ))
}

function Feature({ f, forceOuvert }) {
  const [ouvert, setOuvert] = useState(false)
  React.useEffect(() => { if (forceOuvert != null) setOuvert(forceOuvert) }, [forceOuvert])
  const complet = f.texte_complet && f.texte_complet !== f.description
  return (
    <div className="carte" style={{ marginBottom: 8 }}>
      <div className="rangee" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong>{f.nom}</strong>
        <span className="aide" style={{ margin: 0 }}>
          {f.cout_fragments ? `${f.cout_fragments} Frag.` : ''}
          {f.niveau_requis ? ` · niv. ${f.niveau_requis}` : ''}
        </span>
      </div>
      <Texte>{ouvert || !complet ? (f.texte_complet || f.description) : f.description}</Texte>
      {complet && (
        <span onClick={() => setOuvert(o => !o)} style={{ cursor: 'pointer', color: 'var(--or)', fontSize: '.78rem' }}>
          {ouvert ? '▲ résumé' : '▼ texte complet du manuel'}
        </span>
      )}
    </div>
  )
}

function BlocLegendaire({ items }) {
  if (!items?.length) return null
  return (
    <>
      <h3>Capacités légendaires</h3>
      {items.map((l, i) => (
        <div key={i} className="carte" style={{ marginBottom: 8, borderLeftColor: 'var(--or-clair)' }}>
          <Texte>{l.text}</Texte>
        </div>
      ))}
    </>
  )
}

function BlocMulticlassage({ items }) {
  if (!items?.length) return null
  return (
    <>
      <h3>Suggestions de multiclassage</h3>
      {items.map((m, i) => (
        <div key={i} className="carte" style={{ marginBottom: 8 }}>
          <strong>{m.name}</strong>
          <Texte>{m.text}</Texte>
        </div>
      ))}
    </>
  )
}

function FicheSousClasse({ sc, forceOuvert }) {
  return (
    <div style={{ marginTop: 18 }}>
      <h3 style={{ borderBottom: '1px solid var(--parch-mid)', paddingBottom: 3 }}>{sc.nom}</h3>
      {sc.tagline && <p className="citation">{sc.tagline}</p>}
      {sc.flavour && <Texte>{sc.flavour}</Texte>}
      {(sc.features || []).map(f => <Feature key={f.id} f={f} forceOuvert={forceOuvert} />)}
      <BlocLegendaire items={
        // les capacités légendaires liées à un Patron/Serment sont parfois stockées dans mechanics de la sous-classe
        Array.isArray(sc.mechanics) ? sc.mechanics.map(t => ({ text: t })) : null
      } />
    </div>
  )
}

function EditeurSortsDepart({ classe }) {
  const { sorts, chargement: chargSorts } = useSorts()
  const { disciplines, chargement: chargDisc } = useDisciplinesSorts()
  const [sortsDepart, setSortsDepart] = useState(classe.sorts_depart || [])
  const [maxDepart, setMaxDepart] = useState(classe.sorts_max_depart ?? 3)
  const [enregistrement, setEnregistrement] = useState(false)
  const nomCourt = (classe.nom || '').replace(/^(Le |La |L')/, '')

  const sortsDisponibles = useMemo(() => sorts.filter(s => (s.sous_type || '').includes(nomCourt)), [sorts, nomCourt])

  if (chargSorts || chargDisc) return <p className="aide">Chargement des sorts…</p>
  if (!sortsDisponibles.length) return (
    <p className="aide">Aucun sort exclusif trouvé pour « {nomCourt} » (rien à définir en set de départ, ou le sous_type des sorts ne correspond pas au nom de la classe).</p>
  )

  const basculer = async (id) => {
    const suivant = sortsDepart.includes(id) ? sortsDepart.filter(x => x !== id) : [...sortsDepart, id]
    setSortsDepart(suivant)
    setEnregistrement(true)
    await supabase.from('classes_sideria').update({ sorts_depart: suivant }).eq('id', classe.id)
    setEnregistrement(false)
  }

  const changerMax = async (valeur) => {
    const v = Math.max(0, Number(valeur) || 0)
    setMaxDepart(v)
    setEnregistrement(true)
    await supabase.from('classes_sideria').update({ sorts_max_depart: v }).eq('id', classe.id)
    setEnregistrement(false)
  }

  return (
    <div>
      <div className="rangee" style={{ gap: 8, alignItems: 'baseline', marginBottom: 10 }}>
        <label style={{ fontWeight: 600 }}>Nombre de sorts sélectionnables à la création :</label>
        <input type="number" min="0" style={{ width: 60 }} value={maxDepart}
          onChange={e => changerMax(e.target.value)} />
      </div>
      <p className="aide">Coché ici, un sort est imposé (verrouillé) et compte dans le plafond ci-dessus à l'étape « Sorts » de l'assistant de création.
        {enregistrement && ' Enregistrement…'}
      </p>
      {sortsDisponibles.map(s => (
        <label key={s.id} className="rangee" style={{ gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
          <input type="checkbox" checked={sortsDepart.includes(s.id)} onChange={() => basculer(s.id)} />
          <span>{s.nom}</span>
          <span className="aide">{s.sous_type}</span>
        </label>
      ))}
    </div>
  )
}

function FicheClasse({ c }) {
  const [forceOuvert, setForceOuvert] = useState(null)
  if (!c) return null
  return (
    <div>
      <div className="rangee" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: '0 0 4px' }}>{c.nom}</h2>
        <button className="btn clair" onClick={() => setForceOuvert(v => !(v ?? false))}>
          {forceOuvert ? '▲ replier tout' : '▼ texte complet du manuel'}
        </button>
      </div>
      {c.flavour && <p className="citation">{c.flavour}</p>}
      {c.description && <Texte>{c.description}</Texte>}
      <BlocExtra items={c.description_extra} />
      <BlocBase base={c.base} />

      <h3>Techniques de classe</h3>
      {(c.features || []).length
        ? c.features.map(f => <Feature key={f.id} f={f} forceOuvert={forceOuvert} />)
        : <p className="aide">Aucune technique renseignée pour l'instant.</p>}

      <BlocLegendaire items={c.legendaire} />
      <BlocMulticlassage items={c.multiclassage} />

      {(c.subclasses || []).length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>{c.subclasses_label || 'Spécialisations'}</h3>
          {c.subclasses.map(sc => <FicheSousClasse key={sc.id} sc={sc} forceOuvert={forceOuvert} />)}
        </>
      )}

      {c.base?.fields?.some(f => f.label === 'Magie') && (
        <>
          <h3 style={{ marginTop: 24 }}>Set de sorts de départ</h3>
          <EditeurSortsDepart classe={c} />
        </>
      )}
    </div>
  )
}

export default function Wiki() {
  const { classes, chargement } = useClasses()
  const [selId, setSelId] = useState(null)
  const classe = classes.find(c => c.id === selId) || classes[0]

  if (chargement) return <div className="vide">Chargement du codex des classes…</div>

  return (
    <ListeFiche
      items={classes}
      selId={classe?.id ?? null}
      surSel={setSelId}
      surAjout={null}
      libelleAjout={null}
      rendu={c => (
        <>
          <div>{c.nom}</div>
          <div className="sous">{c.subclasses?.length || 0} spécialisation{(c.subclasses?.length || 0) > 1 ? 's' : ''}</div>
        </>
      )}
      enfants={<FicheClasse key={classe?.id} c={classe} />}
    />
  )
}
