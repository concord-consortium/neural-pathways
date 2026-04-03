# explorer_data.json

## Generate

```
cd browser-data && conda run -n nnmaker python generate_explorer_data.py
```

Output: `dist/explorer_data.json`

## Description

Review-level pathway data for all 5,700 reviews (2,700 train + 3,000 test).

The original train CSV (3,000 reviews) is split into train (2,700) and dev (300). The generation script fits its own StandardScaler and Factor Analysis (6 pathways, 90% explained variance) from scratch on the 2,700 train-split activations (`yelp_train_NN_activations_simple.json`) — it does not load a saved FA model. The 3,000 test reviews are standardized and projected using those same fitted models.

Each review includes:
- **text**: the full review text
- **target / target_label**: sentiment label (0/1, negative/positive)
- **pathway_scores**: array of 6 scores, one per pathway
- **reconstruction_r2**: how well the 6 pathways reconstruct this review's neuron activations
- **pathway_variance_fractions**: each pathway's share of the total reconstruction variance for this review
- **metadata**: restaurant name, city, state, stars, review_stars, categories, rating

Also includes top-5 exemplar reviews per pathway (ranked by variance fraction) and global metadata (explained variance, neuron count, etc.).
