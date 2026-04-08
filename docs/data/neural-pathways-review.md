# Neural Pathways Review

A review of the neural pathways approach from Fiacco's thesis ("Functional Components as a Paradigm for Neural Model Explainability", CMU-LTI-23-017), focusing on what the method provides and where its limits are for our project.

## What Are Neural Pathways?

Neural pathways are groups of neurons that activate together, discovered via unsupervised dimensionality reduction (Factor Analysis or PCA) on neuron activations across many inputs. Each pathway is a latent factor — a pattern of coordinated neuron behavior. See [factor-analysis.md](factor-analysis.md) for the mechanics of how pathways are extracted.

## The Thesis Workflow

Fiacco's approach has three main steps:

### 1. Discover Pathways (unsupervised)

Apply Factor Analysis to neuron activations. The resulting factors are the pathways. This step requires no labeled data — it finds structure purely from how neurons co-activate.

### 2. Evaluate Pathway Effects ("Linear Comparisons")

Correlate each pathway's activation scores with the model's output (e.g., predicted sentiment). This tells you which pathways influence the model's prediction. A pathway with no significant correlation doesn't contribute to the decision.

In our project, we do this via logistic regression on pathway scores, producing "pathway importance" coefficients. Because pathways are orthogonal (from Factor Analysis), a simple point-biserial correlation per pathway tells the same story. See [../analysis/pathway_significance.md](../analysis/pathway_significance.md) for our results.

### 3. Associate Pathways with Task Knowledge ("Linear Probes")

Train logistic regression probes to predict known attributes (e.g., "does this text contain antonyms?") from neuron activations. Then compare each probe's 780 neuron weights with each pathway's 780 factor loadings using rank correlation. If they align, the pathway encodes that attribute.

This step requires **pre-defined candidate attributes with labeled data**. The thesis used existing resources: a stress test dataset for entailment (Naik et al., 2018) and established linguistic features for NER (Tkachenko and Simanovsky, 2012). The method does not discover what attributes to look for — that comes from domain knowledge.

## What Pathways Provide

### Unsupervised discovery

Pathways emerge from the data without specifying what to look for. They can surface patterns you didn't anticipate. This is their main advantage over probes, which only find what you already thought to test.

### Variance coverage

Pathways account for a measurable percentage of the activation variance (our fits explain ~90%). In principle, after matching pathways to attributes, you can see how much of the model's internal structure you've explained vs. how much remains unknown.

## Limits of Pathways

### Discovery hasn't worked well in practice for our project

For Yelp sentiment, there's no established taxonomy of reasoning subtasks the way there is for entailment or NER. We attempted manual discovery through contrastive review analysis and blind rating (see [../analysis/observations.md](../analysis/observations.md)). Only P0 (sentiment) and P6 (emotional intensity, via partial correlation) were confirmed. The others resisted clean interpretation.

Fiacco found similar difficulties. In the entailment experiment, the probed knowledge types didn't correspond strongly to the discovered pathways. The thesis concluded the model might be using an inductive bias unrelated to the intended reasoning — the method surfaced the gap but didn't resolve it.

### The coverage argument is weaker than it appears

A pathway that correlates at r = 0.3 with an attribute only explains 9% of that pathway's variance. The other 91% is unaccounted for. So "this pathway covers formality" overstates what's actually known. True coverage depends on the strength of the correlations, not just whether pathways were matched to some attribute.

### Probes alone may be sufficient

If you already have candidate attributes (from domain knowledge, intentional training design, or prior exploration), probes carry all the information you need without pathways:

- **Bias detection**: Train a probe for the attribute, correlate probe predictions with model output. This directly answers "does the model use this attribute for its decision?"
- **Per-review scoring**: Dot-product the probe's 780 weights with a review's activations to get a per-review score for that attribute. This answers "how much did the model attend to this attribute for this specific review?"
- **No intermediate pathway step needed**: The probe weights function exactly like pathway loadings — they're both 780-dimensional vectors over the same neurons. The probe version is directly tied to a known attribute rather than requiring a correlation step to interpret.

## Implications for Our Project

Neural pathways are central to this project. Understanding the nuances of what they provide — and where they need support from other techniques — helps us decide what to emphasize in our learning materials.

### What pathways do well

Pathways show students the internal structure of a model: groups of neurons that work together. This is a concrete, visual way to make the inside of a neural network tangible. The unsupervised discovery aspect is also pedagogically appealing — pathways emerge from the model itself rather than being imposed by a researcher.

### Where we've struggled

The pathway discovery step hasn't yielded clear results for sentiment classification beyond P0 (sentiment). The other pathways capture real structure in the activations but we haven't been able to reliably match them to interpretable attributes. This matters for education: if we can't explain what a pathway means, students can't learn from it.

### Probes as a complement to pathways

Probes (logistic regression on neuron activations to predict a known attribute) and pathways answer different questions:

- **Pathways** answer: "what patterns exist inside the model?" (unsupervised, exploratory)
- **Probes** answer: "does the model encode this specific attribute?" (supervised, confirmatory)

Both produce a set of 780 weights over neurons. For pathways, these are factor loadings. For probes, these are regression coefficients trained against a known attribute. Either can be used to score individual reviews.

The difference matters for learning materials. Explaining the relationship between unsupervised discovery (pathways) and supervised confirmation (probes) could itself be a valuable topic — it mirrors the broader scientific process of observation followed by hypothesis testing.

### Open question: how to get pathways students can explore

For the educational goal of showing 8th graders how bias works inside a model, we need pathways that are both interpretable and clearly connected to the model's predictions. With our current model, only P0 meets that bar.

One idea under consideration (as of 2026-04-08) is to intentionally train the model on biased data — selecting positive reviews that share an extra attribute and negative reviews with the opposite. This could produce pathways that encode the bias, giving students something meaningful to discover. However, this approach is unproven and hasn't been discussed with the full team yet.

Discovery is the pedagogical strength of pathways — having students figure out what a pathway means rather than being told. But given our difficulty interpreting pathways even as adults with domain knowledge, making this work for 8th graders will require significant scaffolding.
