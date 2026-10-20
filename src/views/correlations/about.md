Placeholder. A matrix of pathways against known attributes, shown either as correlations or as the
histograms behind them. Students choose pairs and run the correlation.

### Correlations

Each square is the correlation between that pathway and that column, over the conversations in the
filter. Color tracks both direction and strength — orange positive, blue negative, deeper for
stronger. Hover a cell for the exact value.

### Histograms

Each panel is a pair of histograms: the conversations are counted into bins along the pathway’s
activation axis, and bar height is how many landed in that bin. The pair splits them by the column’s
value, and the column heading shows what that split looks like on its own. Two histograms with the
same shape in the same place means the pathway does not tell those groups apart. A bar of a given
height means the same number of conversations anywhere in the matrix — in any cell, and in the
pathway’s own histogram under its name — so the panels can be read against each other. Clicking one
opens it enlarged, and a bar there stands for fewer conversations than a bar of the same height in
the matrix.

### What the filter leaves standing

A filter can leave a column holding the same value on every conversation — model_correct:0, the
query this opens on, leaves every conversation wrong. A flat column cannot be correlated with
anything, so it has nothing to show. It also ties two columns together: with the model wrong on
every conversation its prediction is always the opposite of the actual label, so those two columns
come out exact mirrors of each other. That symmetry is arithmetic, not a finding.

The same thing happens by degrees to the pathways, and in the Histograms view the bar under each
pathway’s own histogram is what says so: it shows how much of that pathway’s full range the filter
left standing, and where in that range it sits. “5% of the range” means these conversations cover
about a twentieth of the spread the pathway has over all 800 — so there is barely anything left for
a correlation to be computed from, and that whole row reads as noise however striking a number in it
looks. A flat column is this same failure taken to zero. Hover a bar for the exact spans.

### The point

You cannot read a pathway directly. You interpret it indirectly, through things you already know
how to name.
