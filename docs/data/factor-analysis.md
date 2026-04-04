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

Factor Analysis discovers a small number of latent **factors** that explain the correlations among a large number of observed variables. In this project, the variables are 780 neuron activations and the factors are called "pathways." This document uses standard FA terminology; see [terminology.md](terminology.md) for detailed definitions of the project-specific terms.

| FA term | Project term |
|---------|-------------|
| factor | pathway |
| observation | review's neuron activations |
| variable | neuron activation |
| factor scores | pathway scores |

### Key concepts

- **Factor loadings**: a matrix (n_factors × n_variables) that defines each factor as a pattern across the variables. Each row describes one factor's relationship to every variable. In this project, a pathway's loadings are its pattern of weights across all 780 neurons.
- **Factor scores**: per-observation values that say how strongly each factor is expressed. In this project, a review's factor scores say how much each pathway is "active" on that review.
- **Mean**: the per-variable average from the fitting data, used as a baseline for reconstruction. In this project, the mean is the average activation of each neuron across all reviews used for fitting. When the input has already been standardized (as in this project), the mean is effectively all zeros and can be ignored — see note under Reconstructing.
- **Noise variance**: a per-variable estimate of variance not explained by any factor. In this project, each neuron's noise variance represents activation variation that isn't explained by any pathway.

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

### Explained variance

Explained variance measures how much of the total variability in the data is captured by the factors. It operates at three levels:

#### Whole model

After fitting, each factor has a column of loadings (one value per variable). The **sum of squared loadings** for a factor measures how much variance that factor accounts for. Dividing by the total variance gives a proportion:

```
for each factor:
    factor_variance = sum of (loading² for each variable in this factor)

total_variance = sum of (variance of each variable across all observations)

explained_variance_ratio = sum of all factor_variances / total_variance
```

Because the data is standardized (each variable has variance=1), the total variance equals the number of variables. The pipeline adds factors until the explained variance ratio reaches 90%.

#### Per factor

Each factor's individual contribution is its own sum of squared loadings divided by total variance:

```
factor_explained_variance[i] = factor_variance[i] / total_variance
```

This is the FA analog of eigenvalues in PCA. A factor with higher explained variance has loadings that account for more of the variable-to-variable variation across the dataset. The per-factor values sum to the whole-model explained variance.

#### Per factor per observation

For a single review, each factor has a **score** (a scalar). Multiplying a factor's score by its loadings produces that factor's contribution to the reconstructed observation — a vector with one value per variable:

```
contribution[i] = score[i] × loadings[i]    (a vector across all variables)
```

The variance of that contribution vector (across variables) measures how much "spread" that factor adds to the reconstruction. Normalizing these variances into fractions shows each factor's share:

```
for each factor i:
    contribution_variance[i] = variance of contribution[i] across variables

total_contribution_variance = sum of all contribution_variances
fraction[i] = contribution_variance[i] / total_contribution_variance
```

This tells you which factors matter most for a specific observation. A factor might explain a lot of variance globally (per-factor level) but contribute very little to a particular observation if that observation's score on it is near zero.

### Why R² is not maximized by FA scores

FA scores are **not** optimized to maximize reconstruction R². They maximize likelihood under FA's generative model, which includes per-variable noise terms (uniquenesses). The scoring formula weights variables inversely by their noise variance, so noisy variables get downweighted even if that hurts raw reconstruction accuracy.

The scores that would maximize R² are the least-squares solution: `scores = standardized × pinv(loadings)`. That directly minimizes reconstruction error. FA's scoring formula is different — it factors in the noise covariance, which pulls the scores away from the least-squares optimum.

This means it is possible to achieve a higher R² than the FA-projected scores give by moving the scores toward the least-squares solution. FA deliberately sacrifices reconstruction accuracy in order to better isolate shared structure — see the next section.

### Shared covariance vs reconstruction

FA assumes a generative model: each observed variable is a linear combination of latent factors plus **independent noise per variable**. Variables differ in how noisy they are — a neuron activation might be 90% explained by the shared factors while another is only 30% explained, with the rest being noise unique to that variable.

FA's maximum likelihood fitting finds factors that best explain the **shared covariance** between variables, while explicitly modeling per-variable noise separately. If you optimized for reconstruction R² instead (which is what PCA essentially does), you'd fit factors that try to reconstruct everything including the noise. A variable with high unique noise would pull the factors toward capturing that noise, distorting the latent structure. FA says "that noise is unique to this variable, I'll model it separately" and keeps the shared factors clean.

### Per-observation model fit (log-likelihood)

R² measures reconstruction quality but doesn't capture how well the FA model explains an observation's pattern of shared covariance. The per-observation **log-likelihood** does.

The FA model defines a multivariate normal with covariance `ΛΛᵀ + Ψ` (where Λ is loadings and Ψ is the diagonal noise covariance). The log-likelihood for a single observation is:

```
log p(x) = -0.5 × [d·log(2π) + log|Σ| + (x-μ)ᵀ Σ⁻¹ (x-μ)]
```

The first two terms (`d·log(2π)` and `log|Σ|`) are constant across observations. The per-observation varying part is the **Mahalanobis distance**: `(x-μ)ᵀ Σ⁻¹ (x-μ)`. This measures how far the observation is from the mean, accounting for the model's expected covariance structure. Observations that are far away in directions the model doesn't expect (neither shared factors nor expected noise) get penalized.

For d=780 variables, the Mahalanobis distance follows a chi-squared distribution with 780 degrees of freedom if the model is correct, giving a mean of 780 and std dev of ~39.5. The total log-likelihood is a large negative number with a meaningful spread across reviews of maybe 40–50 units, making raw values hard to interpret. Normalizing (subtract mean, divide by std dev across reviews) produces a relative metric where positive values indicate reviews the model explains well and negative values indicate reviews it explains poorly.

### Projection vs reconstruction asymmetry

Reconstruction is simple: `scores × loadings + mean`. Projection is more complex because it must account for noise variance to properly weight each variable's contribution to the score estimates. This is why a saved FA model needs loadings, mean, *and* noise variance to compute scores, but only loadings and mean to reconstruct.
