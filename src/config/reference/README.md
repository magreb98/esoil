# Paquet de données de référence — Évaluation des terres FAO (v1)

À placer dans le dépôt, par exemple sous `src/config/reference/`, pour combler les manques signalés par Claude Code.

## Contenu

| Fichier | Contenu | Statut |
|---|---|---|
| `crops/oil-palm.json` | Palmier à huile : 6 critères climatiques, 15 critères de sol | Transcrit ; 4 valeurs recalculées identiques au mémoire |
| `crops/plantain.json` | Bananier plantain : 5 climat, 14 sol | Transcrit, bonne lisibilité |
| `crops/cassava.json` | Manioc : 6 climat, 16 sol | Transcrit, plusieurs cellules décalées |
| `crops/pineapple.json` | Ananas : 3 climat, 13 sol | Transcrit, faible confiance sur le sol |
| `crops/bambara-groundnut.json` | Voandzou | **Tables absentes des documents** |
| `yield-table-rainfed.json` | Tableau 7 complet, 77 lignes (pluvial, intrants élevés) | Transcrit depuis scan 160 dpi |
| `correction-factors.json` | Facteurs intrants moyens / faibles + affectation des 5 cultures | Transcrit |
| `method-formulas.md` | Décades (p.32), Tjour/Tnuit (p.34), conventions des JSON | Fourni |
| `sources/` | Images des pages sources (mémoire et manuel) | Pour vérification visuelle |

## Règles pour l'implémentation

1. Chaque critère porte sa source, son niveau de `confidence` et parfois une `note`. Afficher un avertissement pour `moyenne` et `faible`.
2. `bounds: null` = critère **non évaluable** : le signaler dans le résultat (« critère non évalué : drainage, table à valider »), ne jamais le remplacer par une valeur par défaut.
3. `special_sys_cec` : non évaluable tant que la signification de « (-) / (+) » n'est pas confirmée.
4. Avant de figer une valeur `moyenne` ou `faible`, la comparer à l'image dans `sources/`.

## Test de référence principal : profil 197, Umbelúzi (manuel p.45-49)

Les pages sont dans `sources/manuel/manuel_pdf53` à `manuel_pdf57`. Transcrire les tables d'entrée et les résultats intermédiaires depuis ces images pour écrire le test. Valeurs lisibles :
- CI = 49 × 91/100 × 86/100 × 88/100 ≈ 33,7
- CR = 16,67 + 0,9 × 33,71 ≈ 47
- Classe finale S3, sous-classe c (climat)
- Rendement maïs S3 intrants élevés 1,5-3,5 t/ha ; intrants faibles × 0,45 → 0,7-1,6 t/ha

## Tests de non-régression issus du mémoire (palmier, Ndoupe)

| Critère | Valeur | Valeur paramétrique attendue |
|---|---|---|
| Précipitations annuelles | 1 890,93 mm | 91,36 |
| Mois secs | 3 | 60 |
| T min absolue mois le plus froid | 18,11 °C | 85,55 |
| n/N | 0,49 | 86,33 |
| pH | 4,7 | 70 |
| Saturation en bases | 28,94 % | 90,96 |

## Correspondance des images
- `memoire_p60-65` : tableaux 3 à 6 (évaluations climat et sol) ; `memoire_p81` : tableaux 23-24 (rendements) ; `memoire_p89` : annexe 1 (climat) ; `memoire_p89-92` : annexes 1 à 10 ; `memoire_p92-96` : annexes 10 à 17 ; `memoire_p97` : annexe 18 (coordonnées GPS).
- `manuel_pdf21-23` : p.13-15 (classes, sous-classes) ; `pdf32-36` : p.24-28 (méthodes) ; `pdf38-44` : p.30-36 (cycles, décades, Tjour/Tnuit, figure 1) ; `pdf45-52` : p.37-44 (données de sol) ; `pdf53-57` : p.45-49 (exemple Umbelúzi) ; `pdf58-59` : p.50-51 (niveaux de gestion) ; `pdf64-69` : p.56-61 (rendements, facteurs) ; `pdf108-109` : annexe II (période de croissance).
