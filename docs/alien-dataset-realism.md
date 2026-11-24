# Why the alien dataset needs to be rebuilt

The alien dataset was written by hand to demonstrate the method: pathways, the correlations
between pathways and attributes, and a bias for students to discover. People who know how
models are trained have pointed out that no trained model could behave the way ours does. This
document explains the problem in plain terms and sets out what a rebuilt dataset has to do
before the problem counts as solved.

The figures below come from the current three-pathway alien dataset, which has 800
conversations.

## How a model ends up biased

A model learns from examples. During training it sees many conversations along with the right
answer for each, and it adjusts itself to rely on whatever helps it get those answers right. If
it ends up relying on something unfair, that is because the unfair thing actually helped in the
training examples.

Usually the unfair thing stands in for something else. For example, poorer students have less
food and quiet at home on average, and it's the food and quiet that affect learning. A model
that sees income, but not food and quiet, learns "poorer means lower." That is right on
average, and wrong for every poorer student who does have food and quiet.

## What the current dataset does

We didn't train a model to answer the question. We wrote the right answers and the model's
predictions directly:

- **The right answer depends only on P0.** Resource stress makes no difference to it. The right
  answer is "approach" for 53% of stressed groups and 52% of the others.
- **The model's prediction is P0 plus a penalty we added for stressed groups.** The model says
  "approach" to only 33% of stressed groups, against 51% of the others. It is wrong 20% of the
  time for stressed groups and 3% for the others.

## Why that's a problem

**No training could have produced this model.** Nothing in the data rewards treating stressed
groups differently, so a trained model would have no reason to do it. The bias was added by
hand, not learned.

Carolyn spotted this in the correlation matrix. P2, the pathway that tracks resource stress, has
almost no correlation with the right answer (+0.04) but a negative correlation with the model's
prediction (−0.11). A real model's features line up with the answers it was trained on. Here
they point different ways.

Two more consequences follow:

- **The pathways can't fully explain the model's predictions.** The penalty is applied to the
  resource-stress label itself, which the pathways only partly capture. Even the best weighting
  of the pathways disagrees with the model on 43 of the 800 conversations.
- **Students can't answer the obvious next question.** A student who finds the bias and asks
  "why did the model learn this?" finds no answer in the data. A skeptical reader can dismiss
  the whole dataset as unrealistic.

## No second set of conversations

The current activity shows the model being wrong on test data that differs from its training
data. The rebuilt dataset drops that part. It has one set of conversations, the ones the model
was trained on, and the story is "what did the model learn, and is it fair?", which is simpler
to tell. Students still see the model's errors: no model gets every training conversation
right, and the bias decides where its errors fall.

We considered keeping a second set as a change of setting. Conversations recorded in different
settings can have very different characteristics. The story would be: the model was trained on
conversations from one setting, such as one region of the planet. It was then used in another
setting, where people noticed it wasn't predicting as well as expected. They ran a study there,
which produced a new set of conversations.

If that idea comes back, it has to be described in those terms and not as a training set and a
test set. To someone who works in machine learning, a test set is a random sample from the same
pool of data as the training set. A test set drawn entirely from a different setting would not
be plausible.

## What success looks like

### Required of any rebuilt dataset

1. **The bias comes from the training data.** In the training conversations, the trait the model
   is unfair about goes along with the right answer on average, because it stands in for factors
   that really matter.
2. **The bias is unfair to individuals.** The model's errors on its training conversations fall
   on members of the affected group whose real factors don't match the group's average.
3. **The correlations tell one consistent story.** The bias pathway's correlation with the right
   answer and its correlation with the model's prediction point the same way.
4. **The pathways account for the model's predictions.** Together they explain what the model
   predicts, and do not just correlate with it.
5. **Students can still discover the bias** by correlating attributes with the pathways.

### The goal: a model that was actually trained

6. **A real model is trained, and it makes the predictions students see.** It can be more complex
   than what the activity shows, as long as it was actually trained. For example, it could be a
   two-part model in which the first part finds broad features and the second makes the
   prediction. The pathways come from the trained model's own neurons.

This is the strongest answer to "no training could have produced this model," because one was
produced. It is also the least certain: we don't yet know whether the neurons of a model small
enough to draw will give clean, useful pathways.

### The fallback: data a trained model could have produced

6. **The data is constructed, but learning from it reproduces the model.** We keep writing the
   data ourselves, and the model's prediction is computed from the pathways, which meets
   criterion 4. The check is a second fit, against the right answers instead of the model's
   predictions. That is what training does: it fits the right answers. The pathway importance
   fitted against the right answers should predict what the authored model predicts. If it does,
   training could have produced the authored model.

The two fits are easy to confuse. Criterion 4 fits the pathways against the model's
predictions and asks how well they explain the model. Criterion 6 fits them against the right
answers and asks whether learning would arrive at the same model. On the current dataset, the
first fit gives the bias pathway a weight of −1.75 against P0's 17.9, and disagrees with the
model on 43 conversations. The second gives it −0.31 against P0's 37.1, so almost no weight,
and disagrees with the model on 56. Learning from the right answers would not pick up the bias,
which is the contradiction Carolyn saw.

This doesn't prove as much as the goal does, but it can be checked on every build.

## Approach

Start with the fallback: a modified version of the constructed dataset. It is the smaller
change, it fixes the contradiction students and reviewers can see, and it doesn't depend on
whether a small trained model gives useful pathways. Work toward a trained model separately. If
that works, it replaces the constructed data.

## A bonus

A real trained model could support a more advanced follow-on activity. Once students identify
the hidden factors, they could retrain the model with those factors and watch the bias shrink.

## Open questions

The model stays unfair about resource stress, so students find the same trait they find today.
What's still open is which hidden factors resource stress stands in for.
