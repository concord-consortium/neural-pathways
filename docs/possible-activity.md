# Story
Humans are encountering an alien population. Observers have recorded conversations, and then tried to approach the groups to try to communicate with them. Some of these approaches are successful; some are not. The words spoken and the success of the approach were recorded.

The words and results were used to train a ML model in order to help humans know when it is a good time to approach aliens. However, we've noticed that the model isn't correct sometimes and want to know why. Or we want to make sure the model is paying attention to things that are reasonable.

# Process

1. Student starts by just exploring the conversation observations and existing codings. If they filter by `target:1` and look at the fields view, they can see that the voices raised field is 67% yes. So that shows some simple correlation between the two. Also without a filter they can see the model was correct 92% of the time. This can all be seen without using official correlations. Just looking at info about the fields.

2. They are asked to figure out if there is any pattern to when the model was wrong. They can filter by `model_correct:0`. Something interesting here, but not really important, is that 90% of the time that the model is wrong, the prediction was "approach". They can also see that the percentages of the other fields are very similar between the "model incorrect" subset and all items. This could be used to prompt a discussion about whether the slight differences in these percentages actually matter. That could be used to justify why formal correlations are useful.

3. The concept of correlations is introduced. A mathematical way to describe how likely there is a relationship between 2 values. If they then remove the filter so they are looking at all the data and look at the "model was correct" row they can see that a real relationship between any of the listed attributes and "model was correct" is very unlikely. They can also see how voices raised does correlate with the actual answer.

4. In the previous part of the activity they learned that bias can be discovered by figuring out an attribute they haven't looked at and then seeing if this attribute correlates with the incorrect classification. The example that Jie proposed at one point was looking at a bag of words style model and seeing how the word Thai showed up very often when the model predicted a bad review. So then if they made an attribute for Thai and looked at all reviews they could see how this correlates. So not just the word Thai but any hint of a Thai restaurant was influencing the model. Using this approach they are now trying to do the same thing: they are trying to figure out an attribute that they haven't looked at yet. And they'll know when they found the attribute when it correlates with the model output. That could be the actual model output (approach or wait) or it could be whether the model was correct or incorrect.

5. They can start by trying to just look at all of the incorrect conversations, but there are too many (63 in the 4 pathway dataset, 64 in the 3 pathway dataset). This is very likely too many conversations to find any pattern just by looking at them.

6. We use this "too many" as a reason to introduce pathways. These show what the model has "learned". Perhaps something it learned matches up with the reason it is incorrect. If so, then that pathway provides a way to filter to reduce the number of conversations that need to be looked at. Once the pathways are available they can look at the correlations to figure out if any of the pathways match up with the "incorrectness". In the 4 pathway dataset P3 does; in the 3 pathway dataset P2 does. I'll call this the biased pathway.

7. So now they have a way to look at a subset of the conversations that is smaller than all of the conversations where the model was wrong. They can look at all of the conversations with a high score on the biased pathway. So looking at `pathway_3:>3` in the 4 pathway dataset there are only 4 conversations. Looking at `pathway_2:>3` in the 3 pathway dataset there are only 6 conversations.

8. Looking at these conversations they hopefully can see common phrases. Specifically they should notice phrases like "stores nearby were nearly empty", and "The surroundings looked picked over and bare", and "Everything within reach had already been stripped". We can give them various supports to help with identifying these phrases:

    1. we could show them the common words in these conversations with a high biased pathway score. If we have translations for some of these common words it could give them a clue.
    2. we could show them which phrases in the observation are already coded. Perhaps by graying them out, or by color coding the attributes and highlighting the phrase in the observations with the same color. So if a phrase isn't grayed out or colored, it is something they should consider.
    3. Give them a way to "code" the conversations using our rubric. This rubric would have the attributes that haven't been commissioned yet. Once they've done that they can see stats and/or a visualization on how many of this set of conversations had particular values for these new attributes. This could be the "fields" view. But it wouldn't have the "all" data since not all of the conversations have been coded with these new attributes.

9. Based on one or more of the approaches in step 8, they commission 1 attribute to code across all of the conversations. If they choose "resource stressed", and look at the correlations they can see that "resource stressed" does correlate with model being wrong, and also with P3 in the 4 pathway dataset and P2 in the 3 pathway dataset.

**The End**. Hopefully at this point they can see why understanding what a model has learned is a useful tool for detecting bias in a model. And pathways are one way to do that. I'd assume this is just one way to use pathways, so it might be useful to list a few others without going into details.

## Missing Pieces

Ability to hide the pathways in the UI.

## Stretches with the current story design:
- the idea is that the model is based on analyzing alien text, but the main attribute is "voices raised". The model would not be able to know that directly. However some words could be associated with loud conversations, so this is plausible.
- The 4 pathway dataset has 2 pathways which have very low importance. I.e., they don't have much effect on the classification by the model. It may be unlikely that a model would have pathways like this, but it is possible. It all depends on how the neurons used to create the pathways are "connected". Often models are built by combining existing models with a few more neurons trained to produce a result from the existing model's neurons. In that scenario the existing model could be paying attention to something that the combined model just ignores when figuring out the final classification.
- what would a human do after approaching the group? They can't talk to them, but perhaps they can communicate with hand gestures.
- how did the verbal words get turned into text?
- the transcriptions don't include which alien said the words, so this could be something that is questioned by the students.
