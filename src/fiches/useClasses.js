import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useClasses() {
  const [classes, setClasses] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('classes_sideria').select('id, nom, de_vie, jauges, fragments_cadence, ordre, saving_throws, flavour, description, description_extra, base, legendaire, multiclassage, subclasses_label, sorts_depart, sorts_max_depart').order('ordre'),
      supabase.from('subclasses_sideria').select('id, class_id, nom, tagline, flavour, mechanics'),
      supabase.from('features_sideria').select('id, class_id, subclass_id, nom, cout_fragments, niveau_requis, description, ordre, texte_complet').order('ordre'),
    ]).then(([rc, rs, rf]) => {
      const cls = rc.data ?? []
      const subs = rs.data ?? []
      const feats = rf.data ?? []
      const assemble = cls.map(c => ({
        ...c,
        features: feats.filter(f => f.class_id === c.id && !f.subclass_id),
        subclasses: subs.filter(s => s.class_id === c.id).map(s => ({
          ...s,
          features: feats.filter(f => f.subclass_id === s.id),
        })),
      }))
      setClasses(assemble)
      setChargement(false)
    })
  }, [])

  return { classes, chargement }
}

export function useFactionsMonde() {
  const [factions, setFactions] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    supabase.from('factions').select('id, nom, couleur').order('nom')
      .then(({ data }) => {
        setFactions((data ?? []).filter(f => f.nom !== 'Monde'))
        setChargement(false)
      })
  }, [])

  return { factions, chargement }
}
export function useFeaturesDebloquees(characterId) {
  const [debloquees, setDebloquees] = useState(new Set())
  const [chargement, setChargement] = useState(true)

  const recharger = useCallback(() => {
    if (!characterId) return
    supabase.from('character_features_debloquees').select('feature_id').eq('character_id', characterId)
      .then(({ data }) => {
        setDebloquees(new Set((data ?? []).map(d => d.feature_id)))
        setChargement(false)
      })
  }, [characterId])

  useEffect(() => { recharger() }, [recharger])

  const basculer = useCallback(async (featureId, actif) => {
    if (actif) {
      setDebloquees(prev => new Set(prev).add(featureId))
      const { error } = await supabase.from('character_features_debloquees').insert({ character_id: characterId, feature_id: featureId })
      if (error) setDebloquees(prev => { const n = new Set(prev); n.delete(featureId); return n })
    } else {
      setDebloquees(prev => { const n = new Set(prev); n.delete(featureId); return n })
      const { error } = await supabase.from('character_features_debloquees').delete().eq('character_id', characterId).eq('feature_id', featureId)
      if (error) setDebloquees(prev => new Set(prev).add(featureId))
    }
  }, [characterId])

  return { debloquees, chargement, basculer }
}
