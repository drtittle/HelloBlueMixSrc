/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* global $ */
'use strict';

var phrases = require('./phrases');
var utils = require('../utils');
var onFileProgress = utils.onFileProgress;
var handleFileUpload = require('../handlefileupload').handleFileUpload;
var showError = require('./showerror').showError;
var effects = require('./effects');


var LOOKUP_TABLE = {
    'en-US_BroadbandModel': ['Us_English_Broadband_Sample_1.wav', 'Us_English_Broadband_Sample_2.wav'],
    'en-US_NarrowbandModel': ['Us_English_Narrowband_Sample_1.wav', 'Us_English_Narrowband_Sample_2.wav'],
    'es-ES_BroadbandModel': ['Es_ES_spk24_16khz.wav', 'Es_ES_spk19_16khz.wav'],
    'es-ES_NarrowbandModel': ['Es_ES_spk24_8khz.wav', 'Es_ES_spk19_8khz.wav'],
    'pt-BR_BroadbandModel': ['pt-BR_Sample1-16KHz.wav', 'pt-BR_Sample2-16KHz.wav'],
    'pt-BR_NarrowbandModel': ['pt-BR_Sample1-8KHz.wav', 'pt-BR_Sample2-8KHz.wav'],
    'zh-CN_BroadbandModel': ['zh-CN_sample1_for_16k.wav', 'zh-CN_sample2_for_16k.wav'],
    'zh-CN_NarrowbandModel': ['zh-CN_sample1_for_8k.wav', 'zh-CN_sample2_for_8k.wav']
};

var voice = 'en-US_AllisonVoice';
voice = 'en-US_MichaelVoice';
//voice = 'es-ES_EnriqueVoice';
var audio = $('.audio').get(0);
var lastThingISaid = "";

function playOnly(text) {

    console.log("Translation = " + text);
    var micOptions = {
        bufferSize: 8192
    };
    var Microphone = require('../Microphone');
    var mic = new Microphone(micOptions);
    mic.pauseRecording();
    var utteranceOptions = {
        text: text,
        voice: voice,
        sessionPermissions: 1
    };

    synthesizeRequest(utteranceOptions, audio);
    mic.restartRecording();
}

function synthesizeRequest(options, audio) {
    var downloadURL = '/api/synthesize' +
        '?voice=' + options.voice +
        '&text=' + encodeURIComponent(options.text) +
        '&X-WDC-PL-OPT-OUT=' + options.sessionPermissions;

    if (options.download) {
        downloadURL += '&download=true';
        window.location.href = downloadURL;
        return true;
    }
    audio.pause();
    try {
        audio.currentTime = 0;
    } catch (ex) {
        // ignore. Firefox just freaks out here for no apparent reason.
    }
    audio.src = downloadURL;
    audio.play();
    return true;
}

var playSample = (function () {

    var running = false;
    localStorage.setItem('currentlyDisplaying', 'false');
    localStorage.setItem('samplePlaying', 'false');

    return function (token, imageTag, sampleNumber, iconName, url) {

        $.publish('clearscreen');

        var currentlyDisplaying = localStorage.getItem('currentlyDisplaying');
        var samplePlaying = localStorage.getItem('samplePlaying');

        if (samplePlaying === sampleNumber) {
            console.log('HARD SOCKET STOP');
            $.publish('socketstop');
            localStorage.setItem('currentlyDisplaying', 'false');
            localStorage.setItem('samplePlaying', 'false');
            effects.stopToggleImage(timer, imageTag, iconName);
            effects.restoreImage(imageTag, iconName);
            running = false;
            return;
        }

        if (currentlyDisplaying === 'record') {
            showError('Currently audio is being recorded, please stop recording before playing a sample');
            return;
        } else if (currentlyDisplaying === 'fileupload' || samplePlaying !== 'false') {
            showError('Currently another file is playing, please stop the file or wait until it finishes');
            return;
        }

        localStorage.setItem('currentlyDisplaying', 'sample');
        localStorage.setItem('samplePlaying', sampleNumber);
        running = true;

        $('#resultsText').val('');   // clear hypotheses from previous runs

        var timer = setInterval(effects.toggleImage, 750, imageTag, iconName);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        xhr.onload = function () {
            var blob = xhr.response;
            var currentModel = localStorage.getItem('currentModel') || 'en-US_BroadbandModel';
            var reader = new FileReader();
            var blobToText = new Blob([blob]).slice(0, 4);
            reader.readAsText(blobToText);
            reader.onload = function () {
                var contentType = reader.result === 'fLaC' ? 'audio/flac' : 'audio/wav';
                console.log('Uploading file', reader.result);
                var mediaSourceURL = URL.createObjectURL(blob);
                var audio = new Audio();
                audio.src = mediaSourceURL;
                audio.play();
                $.subscribe('hardsocketstop', function () {
                    audio.pause();
                    audio.currentTime = 0;
                });
                $.subscribe('socketstop', function () {
                    audio.pause();
                    audio.currentTime = 0;
                });
                handleFileUpload('sample', token, currentModel, blob, contentType, function (socket) {
                    var parseOptions = {
                        file: blob
                    };
                    var samplingRate = (currentModel.indexOf('Broadband') !== -1) ? 16000 : 8000;
                    onFileProgress(parseOptions,
                        // On data chunk
                        function onData(chunk) {
                            socket.send(chunk);
                        },
                        function isRunning() {
                            if (running)
                                return true;
                            else
                                return false;
                        },
                        // On file read error
                        function (evt) {
                            console.log('Error reading file: ', evt.message);
                            // showError(evt.message);
                        },
                        // On load end
                        function () {
                            socket.send(JSON.stringify({ 'action': 'stop' }));
                        },
                        samplingRate
                        );
                },
                    // On connection end
                    function () {
                        effects.stopToggleImage(timer, imageTag, iconName);
                        effects.restoreImage(imageTag, iconName);
                        localStorage.getItem('currentlyDisplaying', 'false');
                        localStorage.setItem('samplePlaying', 'false');
                    }
                    );
            };
        };
        xhr.send();
    };
})();


exports.initPlaySample = function (ctx) {

    (function () {
        //var fileName = 'audio/' + LOOKUP_TABLE[ctx.currentModel][0];
        var el = $('.play-sample-1');
        el.off('click');
        //var iconName = 'play';
        //var imageTag = el.find('img');
        el.click(function () {
            playOnly("Good morning everybody.  I am Bluemix.  We are here today to explain all the wonderful things you can do with Bluemix.  We have about 2 hours.  Kevin will be doing a short presentation followed by a demonstration of me.  Feel free to ask him any questions.  Hope you enjoy your introduction to Bluemix.");
            console.log("IN HERE");
            //playSample(ctx.token, imageTag, 'sample-1', iconName, fileName, function(result) {
            // console.log('Play sample result', result);
            //});
        });

        var helpButton = $('.show-help');
        helpButton.off('click');
        helpButton.click(function () {
            $('.show_help').css('visibility', 'visible');
            var phraseString = phrases.getPhraseString();
            $('.show_help').append("<H2>Help (say \"Close help\" to hide)</H2><table><tr><td><b>Phrases Supported</b></td></tr>");
            $('.show_help').append(phraseString);
            $('.show_help').append("</table>");
            playOnly("Here is how you use Hello Bluemix. Remember to click on the Start Conversation button to begin.");
        });

    })(ctx, LOOKUP_TABLE);

    (function () {
        var fileName = 'audio/' + LOOKUP_TABLE[ctx.currentModel][1];
        var el = $('.play-sample-2');
        el.off('click');
        var iconName = 'play';
        var imageTag = el.find('img');
        el.click(function () {
            playSample(ctx.token, imageTag, 'sample-2', iconName, fileName, function (result) {
                console.log('Play sample result', result);
            });
        });
    })(ctx, LOOKUP_TABLE);

};
