# Factor Analysis and StandardScaler

This document explains the general concepts behind Factor Analysis (FA) and StandardScaler as they apply to this project. For project-specific terminology and naming conventions, see [terminology.md](terminology.md).

## StandardScaler

StandardScaler is a preprocessing step that normalizes each variable (neuron) independently so they all have mean=0 and standard deviation=1.

### Fitting

Fitting computes the mean and standard deviation of each variable across all observations (reviews) in the training set. This produces two vectors:

- **mean**: one value per variable
- **scale**: one standard deviation per variable

### Standardizing

Applies the fitted mean and scale to transform observations:

```
standardized = (raw - mean) / scale
```

This can be applied to any set of observations — not just the ones used for fitting. When applied to test data, the training set's mean and scale are used, so everything is on the same basis.

### Reversing

The transformation is reversible:

```
raw = standardized × scale + mean
```

### Why it matters

Without standardization, variables with large raw magnitudes dominate FA. A variable ranging from 100-200 would overshadow one ranging from 0.01-0.02, even if both carry equally meaningful signal. StandardScaler puts all variables on equal footing so FA finds patterns based on how variables co-vary, not their raw scale.

## Factor Analysis

Factor Analysis discovers a small number of latent **factors** that explain the correlations among a large number of observed variables. In this project, the variables are 780 neuron activations and the factors are called "pathways."

### Key concepts

- **Factor loadings**: a matrix (n_factors × n_variables) that defines each factor as a pattern across the variables. Each row describes one factor's relationship to every variable.
- **Factor scores**: per-observation values that say how strongly each factor is expressed. For a review, its factor scores say how much each pathway is "active."
- **Mean**: the per-variable average from the fitting data, used as a baseline for reconstruction. When the input has already been standardized (as in this project), the mean is effectively all zeros and can be ignored — see note under Reconstructing.
- **Noise variance**: a per-variable estimate of variance not explained by any factor. Represents measurement noise or variable-specific variation.

### Fitting

Fitting estimates the factor loadings, mean, and noise variance from a set of standardized observations. scikit-learn's implementation uses an iterative algorithm with SVD (singular value decomposition). The randomized SVD variant introduces a random seed, so the seed must match to reproduce an identical fit on the same data.

The number of factors (k) is chosen by incrementally adding factors until the total explained variance reaches a target (90% in this project).

### Projecting (computing factor scores)

Given standardized observations, projecting computes factor scores using the fitted model:

```
scores = (standardized - mean) × loadings.T × inverse(loadings × loadings.T + diag(noise_variance))
```

This accounts for noise variance — variables with more noise are weighted less when estimating scores. This is more complex than a simple matrix multiply because FA distinguishes shared variance (explained by factors) from per-variable noise.

### Reconstructing (approximating observations from scores)

Given factor scores, reconstruction approximates the original standardized observations:

```
reconstructed = scores × loadings + mean
```

Each factor contributes a vector (its score multiplied by its loadings row), and these are summed with the mean. This is a simple matrix multiply — noise variance is not involved.

Because this project uses StandardScaler before FA, the input data already has mean=0 per variable. FA's fitted mean is therefore effectively all zeros (values on the order of 10⁻¹⁵, floating-point noise). So in practice reconstruction simplifies to:

```
reconstructed = scores × loadings
```

The same applies to the projection formula — `(standardized - mean)` simplifies to just `standardized`.

### Reconstruction quality (R²)

R² measures how well the reconstruction approximates the original, computed per observation:

```
R² = 1 - mean((original - reconstructed)²) / variance(original)
```

Both `original` and `reconstructed` are vectors with one value per variable. The steps:

1. `original - reconstructed` — element-wise differences
2. `(...)²` — square each difference
3. `mean(...)` — average the squared differences (mean squared error)
4. `variance(original)` — how spread out the original values are

R² of 0.97 means the factors explain 97% of the variance in that observation. The remaining 3% is noise or variable-specific variation.

### Projection vs reconstruction asymmetry

Reconstruction is simple: `scores × loadings + mean`. Projection is more complex because it must account for noise variance to properly weight each variable's contribution to the score estimates. This is why a saved FA model needs loadings, mean, *and* noise variance to compute scores, but only loadings and mean to reconstruct.
