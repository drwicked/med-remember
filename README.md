Set up Webhooks in IFTTT
[Click Documentation on this page](https://ifttt.com/maker_webhooks)
![screenshot of how to get there](/images/webhookspage.png)
Because Google Assistant is not available as an output action we have to use something else to indicate a yes or no answer (I hope they remeedy this in future, it would be nice to be able to have google read the body repsonse from a webhoook)
If you have an RGB light you can change its color depending on the reponse. Alternately, if you have a speaker connected to your raspberry pi you can just play an audio file through the speaker depending on the result of the query.
To do this I used node-asound
