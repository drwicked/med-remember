Set up Webhooks in IFTTT
[Click Documentation on this page](https://ifttt.com/maker_webhooks)
![screenshot of how to get there](/images/webhookspage.png)
![webhooks urls](/images/webhookslinks.png)


Because Google Assistant is not available as an output action we have to use something else to indicate a yes or no answer (I hope they remedy this in future, it would be nice to be able to have google read the body reponse from a webhook)
# Did I take my meds? action:
![IFTTT diditake](/images/IFTTT_diditake.png)
# I took my meds? action:
![IFTTT took](/images/IFTTT_took.png)
# Did I take my meds? response:
![IFTTT meds_taken](/images/IFTTT_meds_taken.png)

If you have an RGB light you can change its color depending on the reponse. Alternately, if you have a speaker connected to your raspberry pi you can just play an audio file through the speaker depending on the result of the query.
To do this I used [node-asound](https://github.com/roccomuso/node-aplay) and a USB speaker [Amazon link](https://www.amazon.com/gp/product/B075M7FHM1/ref=oh_aui_detailpage_o01_s00?ie=UTF8&psc=1)

This app uses a basic database ([dirtydb](https://github.com/felixge/node-dirty) ), it might be possible to use a framework like surge.sh or now.sh so you don't need the raspberry pi, but persistence will be the issue. I will explore this in future versions.

Copy `.env.example` to `.env`
`cp .env.example .env`
Modify keys for security

If you redeploy you need to do another `now alias <url> <subdomain>` [See the docs for more info about alias](https://zeit.co/docs/features/aliases)

Apps on now.sh/zeit.co have [limited persistence](https://zeit.co/docs/other/faq#can-i-run-a-database-on-the-now-platform), I haven't tested extensively to see how long each deploy lasts.


[Marak/say.js: TTS (text to speech) for node.js. send text from node.js to your speakers.](https://github.com/Marak/say.js/)
[roccomuso/node-aplay: ALSA aplay wrapper for Node.js](https://github.com/roccomuso/node-aplay)
[vesteraas/node-pitft: A C++ extension for node.js that gives javascript access to the PiTFT framebuffer](https://github.com/vesteraas/node-pitft)
