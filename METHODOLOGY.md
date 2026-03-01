# OOPS — Méthodologie du programme

> Ce document décrit les principes kinésiologiques sur lesquels repose OOPS.
> Il s'adresse aux contributeurs, aux utilisateurs curieux, et à quiconque
> veut comprendre pourquoi le programme fait ce qu'il fait.

---

## 1. Principes fondateurs

Le programme OOPS repose sur le modèle **FITT-VP** :

| Composante | Signification | Application OOPS |
|---|---|---|
| **F**réquence | Nombre de séances / semaine | 2–5 jours, choix libre |
| **I**ntensité | Difficulté perçue (RPE) | Cible RPE 5–7 (débutant), 6–8 (intermédiaire) |
| **T**emps | Durée par séance | 15–60 min, selon disponibilité |
| **T**ype | Nature de l'exercice | Au poids de corps, 5 patrons de mouvement |
| **V**olume | Séries × répétitions | Augmenté avant l'intensité (surcharge progressive) |
| **P**rogression | Évolution dans le temps | Augmentation des reps/séries, puis difficulté |

---

## 2. Les 5 (+ 1) patrons de mouvement

Chaque séance couvre une sélection équilibrée :

| Patron | Muscles cibles | Exemples |
|---|---|---|
| **Push** (poussée) | Pectoraux, triceps, épaules | Pompes, pompes inclinées |
| **Pull** (tirage) | Dos, biceps, rhomboïdes | Tirage table, door row |
| **Squat** | Quadriceps, fessiers | Squat bulgare, fente |
| **Hinge** (charnière) | Ischio-jambiers, fessiers, lombaires | Pont fessier, hip hinge |
| **Core** | Gainage, stabilisation, plancher pelvien | Planche, dead bug, bird-dog |
| **Mobilité** | Amplitude articulaire, récupération | Cat/Cow, 90/90, WGS |

> **Pourquoi ce découpage ?** Couvrir tous les patrons évite les
> déséquilibres musculaires fréquents chez les personnes qui n'ont
> pas de programme structuré (ex. : dos négligé vs chest sur-travaillé).

---

## 3. Surcharge progressive

La surcharge progressive est le seul mécanisme scientifiquement validé
pour améliorer la force et l'endurance musculaire sur le long terme.

**Ordre de progression dans OOPS :**
1. Augmenter les **répétitions** (ex. : 8 → 10 → 12)
2. Augmenter les **séries** (ex. : 2 → 3)
3. Passer à un exercice de **difficulté supérieure** (ex. : pompes genoux → standard)
4. Réduire les **temps de repos** (intermédiaire+)

> Phase 1 (MVP) : le volume est fixé par niveau (débutant 2×8 reps,
> intermédiaire 3×12 reps). La progression automatique basée sur le RPE
> est prévue en v0.2.

---

## 4. RPE — Rate of Perceived Exertion

L'échelle RPE (Borg modifiée, 1–10) est utilisée comme proxy de l'intensité :

| RPE | Description | Interprétation |
|---|---|---|
| 1–3 | Très facile | Pas assez de stimulus |
| **5–7** | **Débutant cible** | Effort notable, finissable sans aide |
| **6–8** | **Intermédiaire cible** | Effort fort, dernières reps difficiles |
| 9 | Très difficile | Acceptable occasionnellement |
| 10 | Maximum | À éviter en routine |

**Règle de régression/progression (v0.2) :**
- RPE > 8 sur deux séances consécutives → régresser (exercice plus facile)
- RPE < 5 sur deux séances consécutives → progresser (volume ou difficulté)

---

## 5. Récupération et fréquence

- **48h minimum** entre deux séances sollicitant les mêmes groupes musculaires
- **Débutants** : 2–3 séances / semaine (dose minimale efficace)
- **Intermédiaires** : jusqu'à 5 séances / semaine
- Les jours de repos sont planifiés automatiquement selon les jours d'entraînement choisis

> Le repos n'est pas un échec — c'est pendant la récupération que les
> muscles s'adaptent et se renforcent (synthèse protéique post-exercice).

---

## 6. Sécurité post-partum

Le programme post-partum applique des règles spécifiques :

**Exclusions :**
- Tout exercice qui augmente la pression intra-abdominale (crunchs, sit-ups)
- Raison : risque aggravé de **diastase des droits** (séparation des muscles abdominaux)

**Priorités :**
1. Exercices de **plancher pelvien** (Kegel intégrés aux premières séances)
2. Gainage doux en priorité (planche modifiée, dead bug)
3. Progression **plus lente** : ramp-up sur 6 semaines minimum

**Recommandation systématique :** consulter un médecin ou une sage-femme
avant de reprendre toute activité physique post-partum.

---

## 7. Tranche d'âge et adaptations

| Tranche | Adaptation |
|---|---|
| < 35 ans | Programme standard |
| 35–44 ans | Programme standard |
| 45 ans et + | Difficulté max réduite de 1 niveau ; +15s de repos entre séries |

La récupération neuromusculaire est statistiquement plus longue après 45 ans,
justifiant ces ajustements conservateurs.

---

## 8. Sources et références

- **ACSM Guidelines** (American College of Sports Medicine) — référence principale pour les recommandations de volume et fréquence
- **Wger** (wger.de) — base d'exercices open-source utilisée pour le catalogue initial
- **Diastasis Recti** : Lee D., Hodges P. — *Behavior of the Linea Alba During a Curl-up Task in Diastasis Rectus Abdominis*, JOSPT 2016
- **Progressive overload** : Schoenfeld B. — *Science and Development of Muscle Hypertrophy*, Human Kinetics 2016
- **RPE** : Borg G. — *Perceived exertion as an indicator of somatic stress*, Scand J Rehab Med 1970

---

*Ce document est maintenu à jour avec chaque itération du programme.*
*Version actuelle : MVP Phase 1*
