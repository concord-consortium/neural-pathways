# Manually Testing the Heatmap with the Alien Datasets

NPW-18 gave the alien datasets real neuron activations and let the heatmap open any
dataset. This walkthrough checks both. Every number below came from a real run of this
branch.

Start the dev server with `npm start` and open `http://localhost:8080/heatmap.html`.

## 1. The dataset dropdown

- The toolbar now starts with a `Dataset:` dropdown reading **Yelp Reviews**. The page
  otherwise looks as before: `FA Fit: train-fa-6`, 780 columns, the first review selected.
- Switch it to **Alien Conversations (4 pathways)**. Expected: the URL gains
  `#dataset=alien`, the fit dropdown reads `alien-fa-4` (the only fit), every heatmap row
  shrinks to **14** columns, and the item panel shows the first conversation's alien text
  with `Target: approach` or `Target: wait` in green or red.
- The item panel's search box placeholder reads `Search by conversation # or text...`, the
  Scale dropdown's first option reads `Current conversation`, and the scores row is labelled
  `Pathway activations for this conversation`. Tick **FA terminology**: the scores row
  reads `Factor scores for this observation`, unchanged from yelp.
- Reload the page with `#dataset=alien` in the URL. Expected: it opens on the alien dataset
  directly. Switch back to **Yelp Reviews**: the `dataset=` part leaves the URL.

## 2. The activation model

With the four-pathway alien dataset selected:

- **Pathway loadings** shows four rows of 14 cells. The explained-variance figures beside
  them read **49%, 18%, 14%, 9%**, matching `targetVarianceShares` times
  0.9. Tick **Show stats** to see the noise variance column.
- **Neuron activations**, **Reconstructed** and **Residual** all render 14 cells. The R²
  shown is **80.5%** for the first conversation; the same value appears as
  `reconstruction_r2` for this conversation in the explorer.
- Drag a pathway score: the reconstruction changes, the R² changes, and **Original R²**
  appears beside it showing the stored value.
- Tick **Show Scaler**: the raw activations and the per-neuron scaler mean and scale rows
  render with 14 cells.

## 3. The three-pathway dataset

Switch to **Alien Conversations (3 pathways)**. Expected: `alien-fa-3`, three loading rows,
14 columns, and explained variance reading **49%, 31%, 9%**.

## 4. Fetch failures are not dead ends

Edit the URL to `#dataset=nonsense`. Expected: it falls back to yelp (unknown ids do). Stop
the dev server and reload with `#dataset=alien`: the page shows `Error loading data: ...`
above a still-working `Dataset:` dropdown.
