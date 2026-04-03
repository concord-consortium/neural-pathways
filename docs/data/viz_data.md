# viz_data.json

## Generate

```
cd browser-data && conda run -n nnmaker python generate_viz_data.py
```

Output: `dist/viz_data.json`

## Description

Detailed visualization data for 20 selected reviews (10 test, 10 train; 5 positive and 5 negative from each). Designed for interactive visualizations showing how pathways reconstruct neuron activations.

### Reconstruction

Factor Analysis decomposes 780 neuron activations into 6 pathway scores. The question is: can we go back? Given just the 6 scores, can we reconstruct the original 780 activations?

The reconstruction formula is:

```
reconstructed = pathway_scores × components + mean
```

Where `components` is the factor loadings matrix (6 pathways × 780 neurons) and `mean` is the per-neuron mean from the FA fit. Each pathway contributes a 780-dimensional vector (its score multiplied by its loadings), and these are summed together with the mean to produce the reconstructed activations.

The reconstruction won't be perfect — 6 numbers can't fully capture 780 — but if the pathways explain the important patterns, it will be close. **reconstruction_r2** measures how close. It is computed per review as:

```
R² = 1 - mean((original - reconstructed)²) / variance(original)
```

Both `original` and `reconstructed` are 780-element vectors (one value per neuron). Here's what each step does:

1. `original - reconstructed` — subtract element-wise, giving 780 differences (one per neuron)
2. `(...)²` — square each of the 780 differences individually
3. `mean(...)` — average the 780 squared differences into a single number (the mean squared error)
4. `variance(original)` — how spread out the 780 activation values are for this review (take the mean of the 780 values, subtract it from each, square each difference, average those)

The ratio asks: are the reconstruction errors large or small relative to how spread out the activations are? If the errors are tiny compared to the spread, R² is close to 1. An R² of 0.97 means the 6 pathways explain 97% of the variance in that review's neuron activations. The remaining 3% is variation that doesn't follow any shared pattern across neurons.

Note this is a per-review R², computed across the 780 neurons of a single review — not across reviews.

Unlike explorer_data, this file includes the full neuron-level data needed to compute and visualize reconstruction:
- **activations_raw**: raw 780-dimensional neuron activation vector
- **activations_standardized**: activations after StandardScaler normalization (each neuron is transformed to mean=0, std=1 across the training set, so all neurons are on equal footing for Factor Analysis). Reconstruction operates on standardized activations.
- **pathway_scores**: array of 6 scores, one per pathway
- **reconstruction_r2**: how well the 6 pathways reconstruct this review's standardized activations (1.0 = perfect, 0.0 = no better than the mean)

"Pathways" are this project's name for Factor Analysis **factors** (latent factors). Each pathway/factor represents a pattern of neuron co-activation. The pathway scores are **factor scores**, and the components matrix contains the **factor loadings** (mapping factors to neurons).

The original train CSV (3,000 reviews) is split into train (2,700) and dev (300), with separate activation files for each. The generation script fits its own StandardScaler and Factor Analysis from scratch on the 2,700 train-split activations (`yelp_train_NN_activations_simple.json`) — it does not load a saved FA model. The 3,000 test reviews are then standardized and projected using those same fitted models.

### Pathway "weights"

In earlier team discussions, pathways were described as having a "weight." This concept comes from PCA, where each component is a unit vector with an associated **eigenvalue** that captures how much variance that component explains — a per-component scalar representing its overall importance/scale. In Factor Analysis, the loadings aren't unit-normalized, so there isn't a direct equivalent of the eigenvalue as a separate scalar. The closest analog in this data is `explained_variance_per_pathway` (sum of squared loadings per pathway / total variance), but that was computed later and may not be exactly what was meant by "weight." This needs clarification.

Also includes the full Factor Analysis model parameters and StandardScaler parameters, so the browser can work with the data client-side:
- **components** (factor loadings): 6×780 matrix mapping pathways to neurons. Needed for reconstruction.
- **mean**: 780-element per-neuron mean from the FA fit. Needed for reconstruction.
- **noise_variance**: 780-element vector of per-neuron noise (variance not explained by any pathway). Not needed for reconstruction, but needed if you want to compute pathway scores from activations.
- **scaler mean/scale**: two 780-element vectors (one mean and one standard deviation per neuron), computed across all training reviews. Used to convert between raw and standardized activations: `standardized = (raw - mean) / scale` and `raw = standardized × scale + mean`. All FA operations (reconstruction, pathway scores) work on standardized activations, so these are needed to get back to raw values.

The metadata includes a `neuron_layers` array mapping neuron indices to their source layer (name, start index, size): DistilBERT CLS embedding (768), classifier hidden layer 1 (6), classifier hidden layer 2 (6).
