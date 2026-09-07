import React, { useEffect, useRef, useState } from 'react'
import { useStudio } from './communs.jsx'
import { nouvelArc } from '../lib/modele.js'
import { fmtDate, versJour, depuisJour, JPA, JPS, SAISONS } from '../lib/calendrier.js'

const H_AXE = 46, MARGE_G = 185, H_PASTILLE = 15, ECART = 3, H_MIN = 32

export default function Frise() {
  const { univers, maj } = useStudio()
  const conteneur = useRef(null)
  const [vue, setVue] = useState({ t0: versJour(300), ech: 0.06 })
  const [largeur, setLargeur] = useState(900)
  const [filtreFac, setFiltreFac] = useState(() => new Set(univers.factions.map(f => f.id)))
  const [sansFaction, setSansFaction] = useState(true)
  const [filtreTypes, setFiltreTypes] = useState(() => new Set(['PJ', 'PNJ']))
  const [survol, setSurvol] = useState(null)
  const [panneauArcs, setPanneauArcs] = useState(false)
  const drag = useRef(null)

  useEffect(() => {
    const majL = () => conteneur.current && setLargeur(conteneur.current.clientWidth)
    majL(); window.addEventListener('resize', majL)
    return () => window.removeEventListener('resize', majL)
  }, [])

  // Zoom : Ctrl+molette, écouteur NON passif (la molette seule défile verticalement).
  useEffect(() => {
    const el = conteneur.current
    if (!el) return
    const surMolette = (ev) => {
      if (!ev.ctrlKey) return
      ev.preventDefault()
      const facteur = ev.deltaY < 0 ? 1.18 : 1 / 1.18
      const ox = ev.clientX - el.getBoundingClientRect().left
      setVue(v => {
        const jCurseur = v.t0 + ox / v.ech
        const ech = Math.min(24, Math.max(0.0008, v.ech * facteur))
        return { ech, t0: jCurseur - ox / ech }
      })
    }
    el.addEventListener('wheel', surMolette, { passive: false })
    return () => el.removeEventListener('wheel', surMolette)
  }, [])

  // Glisser : écouté sur la fenêtre, avec seuil de 4 px et limitation par requestAnimationFrame.
  useEffect(() => {
    let rafDemande = false, dernierX = 0
    const move = (ev) => {
      if (!drag.current) return
      dernierX = ev.clientX
      if (!drag.current.actif) {
        if (Math.abs(ev.clientX - drag.current.x) < 4) return
        drag.current.actif = true
      }
      if (rafDemande) return
      rafDemande = true
      requestAnimationFrame(() => {
        rafDemande = false
        if (drag.current) setVue(v => ({ ...v, t0: drag.current.t0 - (dernierX - drag.current.x) / v.ech }))
      })
    }
    const up = () => { drag.current = null }
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [])

  const faction = (id) => univers.factions.find(f => f.id === id)
  const arc = (id) => univers.arcs.find(a => a.id === id)
  const lignes = [
    { id: '__general__', nom: 'Général (sans PNJ/PJ)', type: 'GEN', faction: null },
    ...(filtreTypes.has('PJ') ? univers.joueurs.map(j => ({ id: j.id, nom: j.personnage, type: 'PJ', faction: j.faction })) : []),
    ...(filtreTypes.has('PNJ') ? univers.pnjs.map(p => ({ id: p.id, nom: p.nom, type: 'PNJ', faction: p.factionIds?.[0] ?? null })) : []),
  ].filter(l => l.faction == null ? sansFaction : filtreFac.has(l.faction))
  const indexLigne = Object.fromEntries(lignes.map((l, i) => [l.id, i]))
  const xDe = (j) => (j - vue.t0) * vue.ech
  const jDe = (x) => vue.t0 + x / vue.ech

  // ── Axe adaptatif ──
  let pas, pasMajeur, precision
  if (vue.ech < 0.004) { pas = 100 * JPA; pasMajeur = 500 * JPA; precision = 'an' }
  else if (vue.ech < 0.03) { pas = 10 * JPA; pasMajeur = 100 * JPA; precision = 'an' }
  else if (vue.ech < 0.35) { pas = JPA; pasMajeur = 10 * JPA; precision = 'an' }
  else if (vue.ech < 3) { pas = JPS; pasMajeur = JPA; precision = 'saison' }
  else { pas = 7; pasMajeur = JPS; precision = 'jour' }
  const ticks = []
  for (let j = Math.floor(jDe(MARGE_G) / pas) * pas; xDe(j) < largeur; j += pas) if (xDe(j) >= MARGE_G - 4) ticks.push(j)

  // ── Pastilles : collecte par ligne ──
  const couleurEvt = (e) => faction(e.factionId)?.couleur || arc(e.arcId)?.couleur || '#8a8272'
  const texteClair = (hex) => {
    const n = parseInt((hex || '#888888').slice(1), 16)
    return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) < 150
  }
  const parLigne = {}
  const poser = (it) => { (parLigne[it.ligne] ||= []).push(it) }
  univers.evenements.forEach(e => {
    const idsValides = [...e.participants, ...(e.joueurIds || [])].filter(id => id in indexLigne)
    const x = xDe(e.debut)
    const ponctuel = !(e.fin != null && xDe(e.fin) > x)
    const larg = ponctuel
      ? Math.min(180, 16 + Math.max(20, e.titre.length * 5.2))
      : Math.max(24, xDe(e.fin) - x)
    const base = { obj: e, x, larg, coul: couleurEvt(e), creux: false, titre: e.titre,
      ponctuel, symbole: e.symbole || 'losange', taille: 4 + (e.importance || 1) * 1.6 }
    if (idsValides.length) idsValides.forEach(id => poser({ ...base, ligne: indexLigne[id] }))
    else poser({ ...base, ligne: indexLigne['__general__'] })
  })
  univers.campagnes.forEach(c => {
    ;(c.sessions || []).forEach(s => {
      if (s.date == null) return
      ;(s.joueurIds || []).forEach(jid => {
        if (!(jid in indexLigne)) return
        const titre = (s.code ? s.code + ' · ' : '') + s.titre
        poser({ obj: { titre: `${univers.joueurs.find(j => j.id === jid)?.personnage} présent à ${titre}`, desc: s.resume, debut: s.date, fin: null },
          ligne: indexLigne[jid], x: xDe(s.date), larg: Math.min(140, Math.max(24, 12 + titre.length * 5.2)),
          coul: faction(c.factionId)?.couleur || '#8d6e63', creux: true, titre: '🎲 ' + titre, ponctuel: false })
      })
    })
  })
  univers.joueurs.forEach(j => {
    if (!(j.id in indexLigne)) return
    ;(j.historique || []).forEach(it => {
      if (it.date == null) return
      const pnjX = univers.pnjs.find(p => p.id === it.pnjId)
      const lieuX = univers.lieux.find(l => l.id === it.lieuId)
      const titre = pnjX?.nom || lieuX?.nom || it.type || 'entrée'
      poser({ obj: { titre: `${j.personnage} × ${titre}`, desc: it.resume, debut: it.date, fin: null },
        ligne: indexLigne[j.id], x: xDe(it.date), larg: Math.min(140, Math.max(24, 12 + titre.length * 5.2)),
        coul: faction(pnjX?.factionIds?.[0])?.couleur || '#8a8272', creux: true, titre, ponctuel: false })
    })
  })

  // ── Rangées illimitées par ligne : la ligne grandit avec les chevauchements ──
  const marques = []
  const nbRangees = lignes.map(() => 1)
  Object.entries(parLigne).forEach(([lg, items]) => {
    items.sort((a, b) => a.x - b.x || b.larg - a.larg)
    const finRangee = []
    items.forEach(it => {
      let r = finRangee.findIndex(fin => it.x >= fin + 4)
      if (r === -1) { r = finRangee.length; finRangee.push(-Infinity) }
      finRangee[r] = it.x + it.larg
      marques.push({ ...it, rangee: r })
    })
    nbRangees[+lg] = Math.max(1, finRangee.length)
  })

  // Géométrie verticale cumulative.
  const geo = []
  let curseurY = H_AXE + 8
  lignes.forEach((l, i) => {
    const h = Math.max(H_MIN, 6 + nbRangees[i] * (H_PASTILLE + ECART))
    geo.push({ top: curseurY, h, centre: curseurY + h / 2 })
    curseurY += h
  })
  const hauteur = curseurY + 14

  const liens = []
  univers.evenements.forEach(e => {
    const ys = [...e.participants, ...(e.joueurIds || [])].filter(id => id in indexLigne).map(id => geo[indexLigne[id]].centre)
    if (ys.length > 1) liens.push({ x: xDe(e.debut), y1: Math.min(...ys), y2: Math.max(...ys) })
  })

  const bascule = (ens, setEns, id) => { const n = new Set(ens); n.has(id) ? n.delete(id) : n.add(id); setEns(n) }
  const centrer = (an, ech) => setVue({ ech, t0: versJour(an) - (largeur + MARGE_G) / 2 / ech })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '6px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderBottom: '2px solid var(--parch-mid)' }}>
        <button className="btn clair" onClick={() => centrer(312, 0.0025)}>Ères</button>
        <button className="btn clair" onClick={() => centrer(312, 0.06)}>Années</button>
        <button className="btn clair" onClick={() => centrer(312, 1)}>Saisons</button>
        <button className="btn clair" onClick={() => setPanneauArcs(v => !v)}>Arcs ({univers.arcs.length})</button>
        {['PJ', 'PNJ'].map(t => <span key={t} className={'puce' + (filtreTypes.has(t) ? '' : ' off')}
          style={{ borderColor: 'var(--or)' }} onClick={() => bascule(filtreTypes, setFiltreTypes, t)}>{t}</span>)}
        <button className="btn clair" onClick={() => setFiltreFac(new Set(univers.factions.map(f => f.id)))}>toutes</button>
        <span className={'puce' + (sansFaction ? '' : ' off')} style={{ borderColor: '#8a8272' }}
          title="Afficher les lignes/éléments sans faction" onClick={() => setSansFaction(v => !v)}>
          <span className="rond" style={{ background: '#8a8272' }} />sans faction</span>
        {univers.factions.map(f => <span key={f.id} className={'puce' + (filtreFac.has(f.id) ? '' : ' off')}
          style={{ borderColor: f.couleur }} title="Ctrl+Clic : isoler cette faction"
          onClick={(ev) => (ev.ctrlKey || ev.metaKey) ? setFiltreFac(new Set([f.id])) : bascule(filtreFac, setFiltreFac, f.id)}>
          <span className="rond" style={{ background: f.couleur }} />{f.nom}</span>)}
        <span className="aide" style={{ marginLeft: 'auto' }}>molette : défiler · Ctrl+molette : zoom · Ctrl+Clic faction : isoler</span>
      </div>
      {panneauArcs && (
        <div style={{ padding: '8px 14px', borderBottom: '2px solid var(--parch-mid)', background: '#efe6cf' }}>
          {univers.arcs.map((a, i) => (
            <div key={a.id} className="rangee" style={{ marginBottom: 4, alignItems: 'end' }}>
              <input value={a.nom} onChange={e => maj(u => { u.arcs[i].nom = e.target.value })} />
              <input type="color" value={a.couleur} style={{ height: 32, flex: '0 0 60px' }}
                onChange={e => maj(u => { u.arcs[i].couleur = e.target.value })} />
              <input className="etroit" type="number" title="An de début" value={depuisJour(a.debut).an}
                onChange={e => maj(u => { u.arcs[i].debut = versJour(+e.target.value || 312) })} />
              <input className="etroit" type="number" title="An de fin" value={depuisJour(a.fin).an}
                onChange={e => maj(u => { u.arcs[i].fin = versJour(+e.target.value || 314) })} />
              <button className="btn clair" style={{ flex: '0 0 40px' }}
                onClick={() => maj(u => { u.arcs.splice(i, 1); u.evenements.forEach(e => { if (e.arcId === a.id) e.arcId = null }) })}>×</button>
            </div>
          ))}
          <button className="btn clair" onClick={() => maj(u => { u.arcs.push(nouvelArc()) })}>+ arc</button>
          <span className="aide" style={{ marginLeft: 10 }}>Un arc = une bande de fond. Rattache les événements à un arc dans l'onglet Événements.</span>
        </div>
      )}
      <div ref={conteneur} style={{ flex: 1, position: 'relative', overflowY: 'auto', overflowX: 'hidden', cursor: 'grab', userSelect: 'none' }}
        onMouseDown={(ev) => { if (ev.button !== 0) return; ev.preventDefault(); drag.current = { x: ev.clientX, t0: vue.t0, actif: false } }} onMouseLeave={() => setSurvol(null)}>
        <svg width={largeur} height={hauteur} style={{ display: 'block' }}>
          {(() => {
            // Étiquettes d'arcs sur plusieurs rangées pour éviter les chevauchements.
            const visibles = univers.arcs
              .map(a => ({ a, x1: Math.max(MARGE_G, xDe(a.debut)), x2: Math.min(largeur, xDe(a.fin)) }))
              .filter(v => v.x2 > v.x1)
              .sort((u1, u2) => u1.x1 - u2.x1)
            const finRangee = []
            return visibles.map(({ a, x1, x2 }) => {
              const lw = 14 + a.nom.length * 6.4
              let r = finRangee.findIndex(fin => x1 >= fin + 10)
              if (r === -1) { r = finRangee.length; finRangee.push(-Infinity) }
              finRangee[r] = x1 + Math.max(lw, 30)
              const y = H_AXE + r * 17
              return <g key={a.id}>
                <rect x={x1} y={H_AXE} width={x2 - x1} height={hauteur - H_AXE} fill={a.couleur} opacity=".08" />
                <rect x={x1} y={y} width={Math.min(x2 - x1, Math.max(lw, 30))} height={16} rx="3" fill={a.couleur} opacity=".8" />
                <text x={x1 + 6} y={y + 12} style={{ font: '700 10px monospace', fill: '#fff' }}>
                  {a.nom.length * 6.4 > x2 - x1 - 10 ? a.nom.slice(0, Math.max(2, Math.floor((x2 - x1 - 14) / 6.4))) + '…' : a.nom}</text>
              </g>
            })
          })()}
          {lignes.map((l, i) => (
            <line key={l.id} x1={MARGE_G} y1={geo[i].centre} x2={largeur} y2={geo[i].centre}
              stroke={faction(l.faction)?.couleur || '#8a8272'} strokeWidth="1" opacity=".15" />
          ))}
          {lignes.map((l, i) => i > 0 && (
            <line key={'sep' + l.id} x1={0} y1={geo[i].top} x2={largeur} y2={geo[i].top}
              stroke="rgba(0,0,0,.05)" strokeWidth="1" />
          ))}
          {ticks.map(j => {
            const x = xDe(j), majr = j % pasMajeur === 0
            return <g key={j}>
              <line x1={x} y1={H_AXE - 12} x2={x} y2={majr ? hauteur : H_AXE}
                stroke={majr ? 'var(--axe)' : 'rgba(122,106,63,.25)'} strokeWidth={majr ? 1.4 : 1} />
              {(majr || pas >= JPA) && <text x={x + 4} y={H_AXE - 18}
                style={{ font: (majr ? '700 12px' : '11px') + ' monospace', fill: majr ? 'var(--svg-texte-fort)' : 'var(--svg-texte)' }}>
                {precision === 'jour' && !majr ? String(depuisJour(j).jour)
                  : precision === 'saison' && !majr ? SAISONS[depuisJour(j).sais]
                  : precision === 'jour' && majr ? fmtDate(j, 'saison') : fmtDate(j, 'an')}</text>}
            </g>
          })}
          <line x1="0" y1={H_AXE} x2={largeur} y2={H_AXE} stroke="var(--axe)" strokeWidth="2" />
          {univers.meta.dateCampagne != null && (() => {
            const x = xDe(univers.meta.dateCampagne)
            if (x < MARGE_G - 20 || x > largeur + 20) return null
            return <g>
              <line x1={x} y1={H_AXE} x2={x} y2={hauteur} stroke="var(--or)" strokeWidth="2" strokeDasharray="5 3" />
              <path d={`M${x},${H_AXE} l7,-10 h-14 Z`} fill="var(--or)" />
              <text x={x + 4} y={H_AXE - 2} style={{ font: '700 10px monospace', fill: 'var(--or)' }}>date de campagne</text>
            </g>
          })()}
          {liens.map((l, i) => (l.x > MARGE_G - 10 && l.x < largeur + 10) &&
            <line key={i} x1={l.x} y1={l.y1} x2={l.x} y2={l.y2} stroke="rgba(38,34,26,.35)" strokeDasharray="2 3" />)}
          {marques.map((m, i) => {
            if (m.x + m.larg < MARGE_G - 10 || m.x > largeur + 10) return null
            const g = geo[m.ligne]
            const y = g.top + 3 + m.rangee * (H_PASTILLE + ECART)
            const clair = texteClair(m.coul)
            const zoomMax = () => setVue({ ech: 6, t0: m.obj.debut - (largeur + MARGE_G) / 2 / 6 })
            const props = {
              style: { cursor: 'pointer' },
              onMouseMove: (ev) => setSurvol({ x: ev.clientX, y: ev.clientY, obj: m.obj }),
              onMouseLeave: () => setSurvol(null),
              onDoubleClick: zoomMax,
            }
            if (m.ponctuel) {
              const cy = y + H_PASTILLE / 2, tS = m.taille || 6
              const symb = m.symbole === 'cercle' ? <circle cx={m.x} cy={cy} r={tS} fill={m.coul} stroke="rgba(0,0,0,.35)" />
                : m.symbole === 'carre' ? <rect x={m.x - tS} y={cy - tS} width={2 * tS} height={2 * tS} fill={m.coul} stroke="rgba(0,0,0,.35)" />
                : m.symbole === 'triangle' ? <path d={`M${m.x},${cy - tS} L${m.x + tS},${cy + tS} L${m.x - tS},${cy + tS} Z`} fill={m.coul} stroke="rgba(0,0,0,.35)" />
                : m.symbole === 'etoile' ? <polygon points={Array.from({ length: 10 }, (_, k) => {
                    const r = k % 2 ? tS / 2.2 : tS, a = -Math.PI / 2 + k * Math.PI / 5
                    return `${m.x + r * Math.cos(a)},${cy + r * Math.sin(a)}`
                  }).join(' ')} fill={m.coul} stroke="rgba(0,0,0,.35)" />
                : <path d={`M${m.x},${cy - tS} L${m.x + tS},${cy} L${m.x},${cy + tS} L${m.x - tS},${cy} Z`} fill={m.coul} stroke="rgba(0,0,0,.35)" />
              const nbCar = Math.floor((m.larg - tS - 8) / 5.2)
              const txt = m.titre.length > nbCar ? (nbCar > 2 ? m.titre.slice(0, nbCar - 1) + '…' : '') : m.titre
              return <g key={i} {...props}>{symb}
                {txt && <text x={m.x + tS + 4} y={cy + 3.5}
                  style={{ font: '9.5px "Palatino Linotype", serif', fill: 'var(--svg-texte-fort)', pointerEvents: 'none' }}>{txt}</text>}
              </g>
            }
            const nbCar = Math.floor((m.larg - 10) / 5.2)
            const txt = m.titre.length > nbCar ? (nbCar > 2 ? m.titre.slice(0, nbCar - 1) + '…' : '') : m.titre
            return <g key={i} {...props}>
              <rect x={m.x} y={y} width={m.larg} height={H_PASTILLE} rx="7"
                fill={m.creux ? 'var(--parch)' : m.coul} stroke={m.creux ? m.coul : 'rgba(0,0,0,.35)'}
                strokeWidth={m.creux ? 1.6 : 1} />
              {txt && <text x={m.x + 6} y={y + 11}
                style={{ font: '9.5px "Palatino Linotype", serif', fill: m.creux ? 'var(--svg-texte-fort)' : (clair ? '#f2ead6' : '#26221a'), pointerEvents: 'none' }}>{txt}</text>}
            </g>
          })}
        </svg>
        <div style={{ position: 'absolute', left: 0, top: 0, height: hauteur, width: MARGE_G, pointerEvents: 'none',
          background: 'linear-gradient(90deg, var(--parch) 80%, transparent)' }}>
          {lignes.map((l, i) => (
            <div key={l.id} style={{ position: 'absolute', top: geo[i].top, height: geo[i].h,
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', width: '100%' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: faction(l.faction)?.couleur || '#8a8272',
                flex: 'none', border: '1px solid rgba(0,0,0,.3)' }} />
              <span style={{ fontSize: '.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nom}</span>
              <span style={{ font: '8px monospace', color: 'var(--gris)' }}>{l.type}</span>
            </div>
          ))}
        </div>
        {survol && <div style={{ position: 'fixed', left: survol.x + 14, top: survol.y + 10, background: 'var(--bleu-nuit)',
          color: 'var(--parch)', border: '1px solid var(--or)', padding: '7px 10px', fontSize: '.78rem', maxWidth: 300,
          pointerEvents: 'none', zIndex: 40 }}>
          <strong>{survol.obj.titre}</strong><br />
          <span style={{ font: '10px monospace', color: 'var(--or-clair)' }}>
            {fmtDate(survol.obj.debut)}{survol.obj.fin != null ? ` → ${fmtDate(survol.obj.fin)}` : ''}</span>
          {survol.obj.desc && <><br />{survol.obj.desc.slice(0, 180)}</>}
        </div>}
      </div>
    </div>
  )
}
