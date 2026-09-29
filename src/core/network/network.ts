/** One fully connected layer. */
export interface NetworkLayer {
  /** [out][in]: row j holds the weights into unit j. */
  weights: readonly (readonly number[])[];
  biases: readonly number[];
  activation: "tanh" | "linear";
}

/** A small feed-forward network whose input is which vocabulary words a text contains. */
export interface Network {
  /** The input words, in input order. */
  vocabulary: readonly string[];
  layers: readonly NetworkLayer[];
}
