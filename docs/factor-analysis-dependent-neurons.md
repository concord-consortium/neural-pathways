# Dependent Neurons in Factor Analysis

Factor analysis finds pathways by looking at which neurons rise and fall together. It assumes that
whenever two neurons agree, a shared cause is behind it. A neuron computed from other neurons
breaks that assumption, because it agrees with them by copying them. Adding such neurons to a fit
doesn't leave the pathways unchanged. It distorts them, often badly.

This note explains why, starting with how factor analysis works, for readers who haven't used it.
[data/factor-analysis.md](data/factor-analysis.md) covers the formulas, and
[data/terminology.md](data/terminology.md) maps the factor analysis terms to this project's terms.

## What factor analysis assumes

Run many inputs through a network and record one number per neuron per input. Each neuron then has
a column of values, one per input.

Factor analysis assumes each neuron's value is built from two parts:

```
neuron value = (a few hidden causes, each mixed in at this neuron's own strength)
             + (this neuron's own quirks, shared with no other neuron)
```

- The hidden causes are the **pathways** (factors). There are only a few, and the analyst chooses
  how many.
- How strongly a neuron responds to each pathway is its **loading** on that pathway.
- The quirks are the neuron's **noise**. Factor analysis measures them as each neuron's **noise
  variance**: how much of its variation is its own.

Factor analysis never sees the pathways. All it sees is how the neurons **move together** across
the inputs, through how much each pair of neurons varies together (their covariance). If two neurons
tend to rise and fall together, it takes that as evidence of a shared pathway. A neuron's quirks
belong to it alone, so they never make it move with another neuron.

The method rests on one assumption: **when two neurons agree, it is because of a shared cause,
never because one copied the other.**

## How factor analysis finds the pathways

The pathways and the quirks depend on each other. To find the pathways, you need to know how much
of each neuron to trust, which means knowing its quirks. To know a neuron's quirks, you need to know
how much of it the pathways explain. Factor analysis resolves this by alternating between the two,
starting from a guess.

The steps below follow scikit-learn's `FactorAnalysis`, which is what the NNMaker pipeline uses. The
generator's port is
[generator/alien/factor-analysis.ts](../generator/alien/factor-analysis.ts).

### 0. Standardize, and start from a guess

Each neuron is first rescaled to a mean of 0 and a variance of 1, so a neuron with large raw values
doesn't dominate just because its numbers are bigger. Each neuron's total variation is then 1. That
1 is split between what the pathways explain and the neuron's quirks.

The first guess is that every neuron is equally quirky: every neuron's noise variance starts at 1.

### 1. Find the pathways, given the current quirk estimates

1. **Measure agreement.** Compute how much every pair of neurons varies together. For n neurons this
   gives an n × n table, the covariance matrix.
2. **Discount the quirky neurons.** Divide each neuron's entries by the size of its quirks, its
   noise standard deviation. A quirky neuron's agreement is then worth less, and a quiet,
   consistent neuron's is worth more. After this rescaling, each neuron's quirks contribute exactly
   1 unit of variation in every direction.
3. **Find the strongest patterns of agreement.** Find the directions in which the rescaled neurons
   vary together the most. These are the eigenvectors of the rescaled table, and they come with a
   strength each, the eigenvalue. Keep the k strongest, where k is the number of pathways asked for.
4. **Remove the quirks' share.** In each of those directions, the quirks contribute 1 unit, so a
   pattern's shared strength is its eigenvalue minus 1. A pattern no stronger than the quirks alone
   is worth nothing.
5. **Size each pattern by its shared strength.** The shared strength is a variance, so scale each
   direction by its square root.
6. **Undo the rescaling.** Multiply back by each neuron's noise standard deviation. The result is
   the loadings: how strongly each neuron responds to each of the k pathways.

### 2. Re-estimate the quirks, given the pathways

For each neuron, add up the variation the k pathways explain (the sum of its squared loadings).
Whatever is left of its total of 1 is its new noise variance:

```
noise variance = 1 − (variation the pathways explain)
```

If the pathways explain all of a neuron, its noise variance would go to zero. scikit-learn stops it
at a tiny floor (10⁻¹²) instead.

### 3. Repeat until nothing changes

Go back to step 1 with the new quirk estimates. A neuron that turned out quieter is trusted more on
the next pass, which shifts the pathways, which shifts the quirks again. The loop stops when another
pass barely improves how well the model explains the data (its log-likelihood).

So each pass finds the pathways first and then the quirks as what's left. But the very first
pathways come from the guess that all neurons are equally quirky, and every later pass depends on
the quirks the pass before it found. The final pathways are the ones that agree with their own
leftovers.

### Which way the pathways point

The k pathways found in step 1 are not the only possible answer. Rotate them together, keeping them
perpendicular to each other, and the rotated pathways explain the neurons' agreement equally well.
(Any other change, such as stretching one pathway or tilting two toward each other, changes the
agreement they predict.)
scikit-learn returns one particular orientation: the pathways' loading patterns are perpendicular to
each other once each neuron is discounted by its quirks, and the pathways come in order of strength.
This is its **canonical form**.

The quirk estimates decide that orientation, because step 1 finds its directions only after
discounting each neuron by its quirks. Change which neurons look quiet and the pathways can rotate
into each other, even when the space they span stays about the same. Two pathways of similar
strength are the easiest to rotate together.

### Scoring an input

Once the pathways are found, an input's **pathway scores** are estimated from its neuron values. The
estimate is a weighted combination of the neurons, and each neuron's weight grows with its loading
and shrinks with its noise variance. Quiet neurons count most. A neuron whose noise variance is near
zero pins the estimate to what it reads: on the mix of pathways that neuron measures, it outweighs
every other neuron.

## Why a dependent neuron distorts the result

### An analogy: an echo among witnesses

Ten witnesses each saw a robbery and describe the robber. Each gets some details wrong in their own
way. Where their accounts agree, you can trust it, because independent people don't make the same
mistake. This is factor analysis: the agreement is the truth, and each witness's own errors cancel
out.

Now add an eleventh "witness" who never saw the robbery. They overheard witnesses 2 and 5 and repeat
a blend of what those two said. Two things go wrong:

1. **The echo looks like the best witness in the room.** Their account always matches 2 and 5 and
   has nothing of its own in it, so they look perfectly consistent, with no quirks. Weighting
   witnesses by consistency gives them the most weight. But all they carry is the view of 2 and 5,
   *mistakes included*.
2. **Copied mistakes look like shared truth.** Witness 2's personal mistake now appears in two
   accounts. You'd take it as a real detail that two people confirmed.

A neuron computed from other neurons is the eleventh witness. A neuron in a network's second hidden
layer is computed from the first hidden layer, so all it can do is repeat a blend of first-layer
neurons.

### Failure 1: the echo is trusted too much

Suppose a dependent neuron is a clean blend of the pathway parts of other neurons. In step 2 the
pathways explain all of it, so its noise variance drops to the floor. That is a **Heywood case**,
the name for a noise variance driven to zero. From then on:

- In step 1 it is divided by almost nothing, so its agreement with other neurons outweighs
  everything else, and it decides which way the pathways point.
- In scoring, it pins the pathway scores to what it reads, outweighing every other neuron on the
  pathways it carries.

It doesn't look exactly like any one pathway. It is a blend, built from first-layer values that
carry their own quirks. So the pathways tilt toward the blend, and pathways of similar strength
rotate into each other.

### Failure 2: copied quirks look like a pathway

Suppose instead the dependent neuron blends other neurons' values, quirks and all. Those quirks now
appear in two or more neurons at once, which is exactly what factor analysis takes as evidence of a
shared cause. With only k pathways available, it bends them to explain the copied quirks. The
weakest real pathway suffers most, because a strong enough echo can explain more variation than it
does.

### Why "computed from" doesn't mean "ignored"

It is natural to expect a dependent neuron to add nothing, since it carries no new information.
But factor analysis can't tell where a column of numbers came from. It sees only how the columns
move together. A dependent neuron adds *more* agreement, not less, and agreement is exactly the
evidence factor analysis trusts.

### Counting the sources of variation

There is also a counting argument, for neurons built the way the factor analysis model describes
them: each one the pathway scores mixed in at its own strengths, plus quirks of its own that are
independent of the pathways and of every other neuron's. That is how the generator builds the alien3
activations, and what a network would have to do to produce authored pathway scores. With k pathways
and n neurons, that is k + n independent sources of variation: one per pathway, plus each neuron's
own quirks. The neurons have to carry all of them.

Matching only the agreement between the neurons asks for less. Factor analysis sees nothing but the
covariance, and any covariance among n neurons can be produced from n independent inputs. Neurons
built that way can fit the model, but nothing in the inputs is a pathway score for the fitted scores
to recover.

A neuron computed from other neurons can only recombine the sources those neurons already have. It
can't add new ones. In a linear layer this is exact. A nonlinear activation such as tanh bends its
input, which adds a little genuinely new variation, but not much and not independently of the
inputs. So, for neurons that carry the pathways and quirks of their own:

- **A layer computed from an earlier layer can't add independent neurons.** Its "quirks" are
  borrowed from the earlier layer, so they correlate with it.
- **A layer can't have more independent neurons than it has independent inputs, minus the k
  pathways.** n neurons need k + n sources between them. If they are all computed from m inputs,
  then k + n can't exceed m. For example, 10 inputs carrying 3 pathways can feed at most 7 neurons
  that each have their own quirks.

## What it looks like in practice

In a constructed test, a network had 3 pathways of uneven strength (55%, 35% and 10% of the shared
variation). Its first hidden layer had 10–12 neurons, each with its own quirks. Recovery was measured
two ways: the correlation between each true pathway's scores and the recovered ones, and the cosine
similarity between the true and recovered loadings.

- **The first hidden layer alone:** all three pathways came back in order. Score correlations were
  0.90–0.98, with the weakest pathway lowest.
- **Adding 2–6 second-layer neurons built to follow the pathways:** factor analysis gave every one
  of them a noise variance of 0.00 to 0.06, nearly always at the floor. Recovery got worse in every
  run, with the lowest pathway's score correlation falling to 0.6–0.9. Most often the two strongest
  pathways rotated into each other, sometimes swapping places.
- **Adding 2–6 second-layer neurons with arbitrary weights:** these kept more noise variance,
  because tanh bends their inputs, but recovery still fell. In 17 of 18 runs at least one pathway
  dropped below 0.94, to as low as 0.6, and the weakest pathway was usually hit hardest. The one run
  that passed did so by luck.
- **Feeding the same first layer from too few inputs**, so its neurons had to share their quirks,
  failed the same way, even with no second layer.

Fewer neurons is not the fix either. There is a lower limit on how many neurons factor analysis
needs to tell k pathways apart: (n − k)² ≥ n + k, which is 6 for 3 pathways. In the same test,
recovery of the weakest pathway was unreliable below about 10 neurons, even when every neuron was
independent.

## What to do about it

- **Fit factor analysis on neurons whose quirks are their own.** In a feed-forward network, that
  usually means neurons from one layer, and a layer fed by enough independent inputs to give each
  neuron its own variation.
- **Leave out neurons computed from neurons already in the fit.** A later layer can still exist and
  be studied, by correlating its neurons with the pathway scores, but it shouldn't be part of the
  fit.
- **Watch for noise variances near zero.** A neuron whose noise variance sits at or near the floor
  is a sign of a Heywood case. That often means a dependent neuron, or neurons that are too few or
  too alike.

## An open question about the yelp fits

The yelp pathways were fitted on 780 activations: the 768-value CLS embedding plus the
classifier's two hidden layers of 6 neurons each (see [data/terminology.md](data/terminology.md)).
The classifier's layers are computed from the CLS embedding, so those 12 neurons depend on the
other 768.

Among 768 independent neurons, the effect may be diluted. But the 12 are close to exact functions
of the rest, so factor analysis may treat them as nearly noiseless and lean on them heavily. That
could shape the strongest pathway in particular. Nobody has checked this. One way to check is to
refit without the 12 and compare the pathways, and to look at the noise variances the existing fits
give those neurons.
