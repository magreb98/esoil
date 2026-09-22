# Formules complémentaires (réponse aux manques signalés par Claude Code)

Source : Beernaert & Bitondo (1993), *Land Evaluation Manual*, CUDs Dschang. Les images des pages sont dans `sources/manuel/`.

## 1. Interpolation par décades (p.32) — FOURNIE, VÉRIFIÉE

Mois successifs M1, M2, M3 ; on cherche les trois décades D1, D2, D3 du mois M2.

Grandeurs additives (précipitations, ETP, heures d'ensoleillement) :

```
D1 = ( 5·M1 + 26·M2 − 4·M3) / 81
D2 = (−1·M1 + 29·M2 − 1·M3) / 81
D3 = (−4·M1 + 26·M2 + 5·M3) / 81
```

Contrôle : D1 + D2 + D3 = M2.

Grandeurs non additives (température, vent…), mêmes coefficients divisés par 27 :

```
D1 = ( 5·M1 + 26·M2 − 4·M3) / 27
D2 = (−1·M1 + 29·M2 − 1·M3) / 27
D3 = (−4·M1 + 26·M2 + 5·M3) / 27
```

Contrôle : (D1 + D2 + D3) / 3 = M2.

**Test de référence (p.34, Umbelúzi)** : novembre 71 mm, décembre 79 mm, janvier 127 mm.
D1 de décembre = (5×71 + 26×79 − 4×127) / 81 = 1901 / 81 = **23,5 mm**.
Tableau complet attendu :

| Décade | Décembre | Janvier | Février | Mars | Avril |
|---|---|---|---|---|---|
| 1 | 23,5 | 39,8 | 42,6 | 26,5 | 22,7 |
| 2 | 25,8 | 43,0 | 40,2 | 22,5 | 20,4 |
| 3 | 29,7 | 44,2 | 36,2 | 20,0 | 16,9 |
| Total | 79,0 | 127,0 | 119,0 | 69,0 | 60,0 |

Les mois voisins (novembre, mai) ne sont pas tous imprimés : ne tester que D1 de décembre de façon exacte, et les autres cases si les mois voisins sont fournis.

## 2. Températures diurne et nocturne (p.34) — FOURNIE, AVEC UNE RÉSERVE

N = durée du jour (h), fonction de la latitude et du jour de l'année.

```
Tjour = (Tmax + Tmin)/2 + (Tmax − Tmin)/(4π) × (46 − N)/N
Tnuit = (Tmax + Tmin)/2 − (Tmax − Tmin)/(4π) × (46 − N)/(24 − N)     ← signe à confirmer
```

⚠️ Le scan imprime un « + » dans la formule de Tnuit. Avec « + », la nuit serait plus chaude que la moyenne journalière, ce qui est physiquement impossible : le signe « − » a très probablement disparu à la photocopie. L'annexe 1 du mémoire donne d'ailleurs des Tnuit (~28 °C) supérieures à la moyenne (~25 °C), ce qui suggère que l'auteur a appliqué le « + » littéral.

Implémentation demandée : utiliser « − » par défaut, rendre le signe configurable (`method.json → tnuitSigne`), et ajouter un test qui vérifie Tjour ≥ Tmoy ≥ Tnuit.

## 3. Rappels déjà présents dans le prompt v2 (pour mémoire)

- Conversion CI → CR (figure 1, p.35) : `CI < 25 → CR = 1,6·CI` ; `25 ≤ CI ≤ 92,5 → CR = 16,67 + 0,9·CI` ; au-delà, CR = 100 (à confirmer).
- Grille finale de l'indice de terre (p.27) : 90 / 85 / 75 / 60 / 50 / 40 / 25 / 15.
- Pondérations par tranches de 25 cm (p.40-41), CEC de l'argile (p.44), règles de profondeur (p.44).
- Période de croissance (annexe II, p.100-101).

## 4. Données de terrain : conventions des fichiers `crops/*.json`

- `bounds` : `[a, b]` intervalle ; `[a, null]` = supérieur à a ; `[null, b]` = inférieur à b. Plusieurs intervalles par classe pour les critères à optimum.
- `bounds: null` : critère **non évaluable** en l'état (lecture impossible ou incohérente). Le moteur doit le signaler, pas le deviner. La lecture littérale est donnée dans `lectureLitterale` quand elle existe.
- `kind: "special_sys_cec"` : CEC de l'argile avec la notation Sys « < 16 (-) / < 16 (+) », dont la signification doit être confirmée. Non évaluable tant que la règle n'est pas fournie.
- `confidence` : `haute` (lisible et/ou vérifiée par recalcul d'une valeur du mémoire), `moyenne` (lisible mais cellule décalée ou déduite), `faible` (interprétation).
- `depthRule` : `0_15cm`, `0_30cm`, `a_50cm`, `moyenne_0_100`, `max_0_100`, `ponderation_25cm`, `surface`.
