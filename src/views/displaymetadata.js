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

//$.idleTimer(10000);


var responseCounter = 0;
var responses = ["Hello. Is anybody there?", "Andrew?", "Ryan?", "Rosa?", "Anybody at all"];
$(document).bind("idle.idleTimer", function ()
{
    // function you want to fire when the user goes idle
    console.log("User Idle");
    //playText(responses[responseCounter]); 
    responseCounter++;
    if (responseCounter >= responses.length) responseCounter = 0;
    //$.idleTimer(10000);
});


$(document).bind("active.idleTimer", function ()
{
    // function you want to fire when the user becomes active again
    console.log("User Active");
    //playText("Hi Kevin. Would you like to Chat?");
});

var scrolled = false, textScrolled = false;

var showTimestamp = function (timestamps, confidences)
{
    var word = timestamps[0], t0 = timestamps[1], t1 = timestamps[2];

    // Show confidence if defined, else 'n/a'
    var displayConfidence = confidences ? confidences[1].toString().substring(0, 3) : 'n/a';
    $('#metadataTable > tbody:last-child').append(
        '<tr>'
        + '<td>' + word + '</td>'
        + '<td>' + t0 + '</td>'
        + '<td>' + t1 + '</td>'
        + '<td>' + displayConfidence + '</td>'
        + '</tr>'
        );
};


var showMetaData = function (alternative)
{
    var confidenceNestedArray = alternative.word_confidence;
    var timestampNestedArray = alternative.timestamps;
    if (confidenceNestedArray && confidenceNestedArray.length > 0) {
        for (var i = 0; i < confidenceNestedArray.length; i++) {
            var timestamps = timestampNestedArray[i];
            var confidences = confidenceNestedArray[i];
            showTimestamp(timestamps, confidences);
        }
        return;
    } else {
        if (timestampNestedArray && timestampNestedArray.length > 0) {
            timestampNestedArray.forEach(function (timestamp) {
                showTimestamp(timestamp);
            });
        }
    }
};

var Alternatives = function ()
{
    var stringOne = '',
        stringTwo = '',
        stringThree = '';

    this.clearString = function () {
        stringOne = '';
        stringTwo = '';
        stringThree = '';
    };

    this.showAlternatives = function (alternatives, isFinal, testing) {
        var $hypotheses = $('.hypotheses ol');
        $hypotheses.empty();
        // $hypotheses.append($('</br>'));
        alternatives.forEach(function (alternative, idx) {
            var $alternative;
            if (alternative.transcript) {
                var transcript = alternative.transcript.replace(/%HESITATION\s/g, '');
                transcript = transcript.replace(/(.)\1{2,}/g, '');
                switch (idx) {
                    case 0:
                        stringOne = stringOne + transcript;
                        $alternative = $('<li data-hypothesis-index=' + idx + ' >' + stringOne + '</li>');
                        break;
                    case 1:
                        stringTwo = stringTwo + transcript;
                        $alternative = $('<li data-hypothesis-index=' + idx + ' >' + stringTwo + '</li>');
                        break;
                    case 2:
                        stringThree = stringThree + transcript;
                        $alternative = $('<li data-hypothesis-index=' + idx + ' >' + stringThree + '</li>');
                        break;
                }
                $hypotheses.append($alternative);
            }
        });
    };
};

var alternativePrototype = new Alternatives();

exports.showJSON = function (msg, baseJSON)
{
    var json = JSON.stringify(msg, null, 2);
    baseJSON += json;
    baseJSON += '\n';

    if ($('.nav-tabs .active').text() === 'JSON') {
        $('#resultsJSON').append(baseJSON);
        baseJSON = '';
        console.log('updating json');
    }

    return baseJSON;
};

function updateTextScroll()
{
    if (!scrolled)
    {
        var element = $('#resultsText').get(0);
        element.scrollTop = element.scrollHeight;
    }
}

var initTextScroll = function ()
{
    $('#resultsText').on('scroll', function () {
        textScrolled = true;
    });
};
/* KAD took out because I removed elements for index.ejs
function updateScroll(){
  if(!scrolled){
    var element = $('.table-scroll').get(0);
    element.scrollTop = element.scrollHeight;
  }
}

var initScroll = function() {
  $('.table-scroll').on('scroll', function(){
      scrolled=true;
  });
};
*/

exports.initDisplayMetadata = function ()
{
    // KAD initScroll();
    initTextScroll();
};

/* KAD */
var voice = 'en-US_AllisonVoice';
//voice = 'en-US_MichaelVoice';
//voice = 'es-ES_EnriqueVoice';
var audio = $('.audio').get(0);
var lastThingISaid = "";

function playOnly(text)
{
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

function synthesizeRequest(options, audio)
{
    var downloadURL = '/api/synthesize' +
        '?voice=' + options.voice +
        '&text=' + encodeURIComponent(options.text) +
        '&X-WDC-PL-OPT-OUT=' + options.sessionPermissions;

    if (options.download)
    {
        downloadURL += '&download=true';
        window.location.href = downloadURL;
        return true;
    }
    audio.pause();
    try
    {
        audio.currentTime = 0;
    }
    catch (ex)
    {
        // ignore. Firefox just freaks out here for no apparent reason.
    }
    audio.src = downloadURL;
    audio.play();
    return true;
}


function playText(text)
{
    lastThingISaid = text.replace(".", "").toLowerCase();
    switch (voice)
    {
        case 'es-ES_EnriqueVoice':
            translateText(text, "en", "es", playOnly);
            break;
        case 'fr-FR_ReneeVoice':
            translateText(text, "en", "fr", playOnly);
            break;
        case 'de-DE_DieterVoice':
        case 'de-DE_BirgitVoice':
            translateText(text, "en", "de", playOnly);
            break;
        default:
            playOnly(text);
            break;
    }
    //$.idleTimer('destroy');
}

function translateText(textContent, source, target, callback)
{
    // Create call for AJAX and to populate REST API tab
    var callData = {
        text: textContent,
        source: source,
        target: target
    };

    var restAPICall = {
        type: 'POST',
        url: "/api/translate",
        data: callData,
        headers: {
            'X-WDC-PL-OPT-OUT': 1
        },
        async: true
    };      
                    
    //$('#profile textarea').val(JSON.stringify(callData, null, 2));
                
    $.ajax(restAPICall)
        .done(function (data) {
            //console.log(data['translations'][0]['translation'] + " translation");
            //$('#home2 textarea').val(data['translations'][0]['translation']);
            console.log("translation = " + data['translations'][0]['translation']);
            //$('#profile2 textarea').val(JSON.stringify(data, null, 2));
            callback(data['translations'][0]['translation']);
        })
        .fail(function (jqXHR, statustext, errorthrown) {
            console.log("translateText(): " + statustext + " - " + errorthrown);
        });
}


/* KAD */
var collectSymptoms = false;
var symptoms = [];
var phrases = ["Help me",
               "Close help",
               "Hi",
               "Hello",
               "Say hi",
               "My name is {your name}",
               "How do you talk so well",
               "What do you do",
               "Thank you",
               "How are you",
               "How are you doing",
               "How's it going",
               "What time is it",
               "What day is it",
               "What is X plus Y",
               "What is X minus Y",
               "Thank you",
               "Where is the nearest hotel",
               "Insurance example",
               "Do you speak French",
               "Do you speak Spanish",
               "Do you speak English"];

exports.showResult = function (msg, baseString, model)
{
    if (msg.results && msg.results.length > 0)
    {
        var alternatives = msg.results[0].alternatives;
        var text = msg.results[0].alternatives[0].transcript || '';

        // apply mappings to beautify
        text = text.replace(/%HESITATION\s/g, '');
        text = text.replace(/(.)\1{2,}/g, '');
        if (msg.results[0].final)
            console.log('-> ' + text);
        text = text.replace(/D_[^\s]+/g, '');

        // if all words are mapped to nothing then there is nothing else to do
        if ((text.length === 0) || (/^\s+$/.test(text)))
        {
            return baseString;
        }

        // capitalize first word
        // if final results, append a new paragraph
        if (msg.results && msg.results[0] && msg.results[0].final)
        {
            text = text.slice(0, -1);
            console.log("last thing I said: " + lastThingISaid);
            console.log("What I heard: " + text);
            if (lastThingISaid === text || (text.indexOf(lastThingISaid) >= 0 && lastThingISaid.length > 0)) return;
            text = text.charAt(0).toUpperCase() + text.substring(1);
            text = text.trim() + '. ';

            console.log(text);

            if (collectSymptoms)
            {
                symptoms.push(text);
                console.log(symptoms);
                if (symptoms.length > 2)
                {
                    playText(analyzeSymptoms(symptoms));
                    collectSymptoms = false;
                    symptoms = [];
                }
            }

            if (text.indexOf("Say hi") >= 0)
            {
                playText("Hi everybody. I am Bluemix.... Welcome to our demo today.  Hope you find it engaging.  Feel free to ask Kevin any questions during his presentation");
            }
            else if ((text.indexOf("Hello") >= 0 || text.indexOf("Hi") >= 0) && text.length < 30)
            {
                    var responses = ["How are you", "Hi", "Hello", "How's it going", "Hi I'm Bluemix.  What is your name?"];
                    var randomNumber = Math.round(Math.random() * responses.length) - 1;
                    console.log(randomNumber);
                    console.log(Math.round(Math.random() * responses.length));
                    playText(responses[randomNumber]);
            }
            else if (text.indexOf("My name is") >= 0 || text.indexOf("My name's") >= 0)
            {
                console.log(text.trim().lastIndexOf(" "));
                var name = text.trim().substring(text.trim().lastIndexOf(" "));
                console.log(name);
                playText("Nice to meet you " + name);
            }
            else if (text === "How are you. " || text === "How you doing. " || text === 'How are you doing. ')
            {
                var responses = ["Fine. How about yourself", "Fine", "Not too bad", "Pretty good", "Fine. How about you"];
                var randomNumber = Math.round(Math.random() * responses.length);
                console.log(randomNumber);
                console.log(Math.round(Math.random() * responses.length));
                playText(responses[randomNumber]);
            }
            else if (text === "How's it going. ")
            {
                playText("Not bad, how about yourself");
            }
            else if (text === "What you doing. " || text === "What are you doing. ")
            {
                var responses = ["Talking with you", "Just processing queries", "Not much. What are you doing.", "Watching TV", "Sleeping"];
                var randomNumber = Math.round(Math.random() * responses.length);
                console.log(randomNumber);
                console.log(Math.round(Math.random() * responses.length));
                playText(responses[randomNumber]);

            }
            else if (text === "Watching TV. ")
            {
                playText("What are you watching");
            }
            else if (text === "Eating dinner. ")
            {
                playText("What's for dinner");
            }
            else if (text === "Clear. ")
            {
                baseString = "";
                text = "";
            }
            else if (text === "Spanish language. " || text === "Do you speak Spanish. " || text === "Do you speak in Spanish. " || text === "Please speak Spanish. " || text === 'Please speak in Spanish. ' || text === "You speak Spanish. ")
            {
                voice = "es-ES_EnriqueVoice";
                //playText("Do you speak Spanish");
                playText("Yes");
            }
            else if (text === "French language. " || text === "Do you speak French. " || text === "Do you speak in French. " || text === "Please speak French. " || text === 'Please speak in French. ' || text === "You speak French. ")
            {
                voice = "fr-FR_ReneeVoice";
                //playText("Do you speak French");
                playText("Yes");
            }
            else if (text === "German language. ")
            {
                voice = "de-DE_DieterVoice";
                voice = "de-DE_BirgitVoice";
                playText("Do you speak German");
            }
            else if (text === "English language. " || text === "Do you speak English. " || text === "Do you speak in English. " || text === "Please speak English. " || text === 'Please speak in English. ' || text === "You speak English. ")
            {
                voice = 'en-US_AllisonVoice';
                voice = 'en-US_MichaelVoice';
                playText("Absolutely");
            }
            else if (text.indexOf("Do you speak ") >= 0)
            {
                voice = 'en-US_AllisonVoice';
                voice = 'en-US_MichaelVoice';
                playText("Unfortunately No, but I hope to speak it soon");
            }
            else if (text === "Insurance example. ")
            {
                playText("......Please describe your symptoms");
                collectSymptoms = true;
            }
            else if (text === "Where is the nearest hotel. " || text === "What is the nearest hotel. " || text === "Where's the nearest hotel. " || text === "What's the nearest hotel. ")
            {
                playText("There are three hotels within 5 miles from here. Would you like to book a stay?");
            }
            else if (text === "What's your name. " || text === "What is your name. " || text === "What your name. ")
            {
                playText("Bluemix");
            }
            else if (text.indexOf("What do you do") >= 0 || text.indexOf("What are you") >= 0)
            {
                playText("I am an open standards cloud platform to build cool applications");
            }
            else if (text.indexOf("Is that fun") >= 0 || text.indexOf("Is it fun") >= 0)
            {
                playText("Yeah...it's a lot of fun. ");
                //$('.show_demos').css('visibility', 'visible');
                //$('.show_demos').append("<table><tr><td><a href=localhost target=new>Demo1</a></td></tr> <tr><td><a href=localhost target=new>Demo2</a></td></tr> <tr><td><a href=localhost target=new>Demo3</a></td></tr> </table>");
            }
            else if (text.indexOf("Open window") >= 0 || text.indexOf("Google something") >= 0)
            {
                window.open("http://www.google.com");
            }
            else if (text.indexOf("Watch video") >= 0 || text.indexOf("Show video") >= 0)
            {
                window.open("https://www.youtube.com/watch?v=ny66mjQsVak");
            }
            else if (text.indexOf("Open application") >= 0 || text.indexOf("Show application") >= 0)
            {
                window.open("http://iot-visualization-kad.mybluemix.net/dashboard");
            }
            else if (text.indexOf("Hide demos") >= 0 || text.indexOf("Hide demo") >= 0 || text.indexOf("Hi demos") >= 0 || text.indexOf("I demos") >= 0 || text.indexOf("Clear demos") >= 0 || text.indexOf("No demos") >= 0)
            {
                $('.show_demos').empty();
                $('.show_demos').css('visibility', 'hidden');
            }
            else if (text.indexOf("Secret message") >= 0)
            {
            }
            else if (text.indexOf("How do you talk so well") >= 0 || text.indexOf("How do you speak so well") >= 0)
            {
                playText("That's my buddy Watson in the background.  I record what you say, and Watson tells me how to speak back to you in your language. Watson also translates for me from English to Spanish to French");
            }
            else if (text === "Close help. ")
            {
                $('.show_help').empty();
                $('.show_help').css('visibility', 'hidden');
            }
            else if (text === "Help. " || text === "I need help. " || text === "Help me. " || text === "Show me help." || text === "Show help.")
            {
                playText("Ask me a question like what time is it, or what's your name or what day is it or How are you. You can change my language by saying French Language or Spanish language or English. The following is a list of many of the commands you can say. Say Close Help to remove these instructions.");

                $('.show_help').css('visibility', 'visible');
                var phraseString = "";
                for (var z = 0; z < phrases.length; z++)
                    phraseString += "<tr><td>" + phrases[z] + "</td></tr>";
                $('.show_help').append("<H2>Help (say \"Close help\" to hide)</H2><table><tr><td><b>Phrases Supported</b></td></tr>");
                $('.show_help').append(phraseString);
                $('.show_help').append("</table>");

            }
            else if (text === "What time is it. ")
            {
                playText(getDateTime());
            }
            else if (text === "What day is it. " || text === "What is today. ")
            {
                playText(getDate());
            }
            else if (text === "Is it cold outside. ")
            {
                playText("Yes It is 50 degrees");
            }
            else if (text === "Weather. ")
            {
                playText("It is going to be a beautiful day");
            }
            else if (text === "How does the weather look tomorrow. ")
            {
                playText("It's going to be a nice day");
            }
            else if (text === "Thank you. " || text.indexOf("thank you") >= 0)
            {
                playText("Your welcome");
            }
            else if (text === "Goodbye. ")
            {
                playText("Hope to hear from you soon");
            }
            else if (text.indexOf("plus") >= 0)
            {
                playText(mathResult(text, "plus") + "");
            }
            else if (text.indexOf("minus") >= 0)
            {
                playText(mathResult(text, "minus") + "");
            }
            else if (text.indexOf("times") >= 0)
            {
                playText(mathResult(text, "times") + "");
            }
            else if (text.indexOf("divided by") >= 0)
            {
                text = text.replace('divided by', 'dividedby');
                playText(mathResult(text, "dividedby") + "");
            }
            else if (text.indexOf("What") >= 0 || text.indexOf("How") >= 0 || text.indexOf("When") >= 0 || text.indexOf("Why") >= 0) {
                //playText("I am sorry. I don't know.");
            }
            else
            {
                //playText("I am sorry. I don't know how to respond.");
            }
            text = text.replace('Nnb.', '');
            text = text.replace('Nndb.', '');
            text = text.replace('Nndb', '');
            text = text.replace('Nnnd.', '');
            text = text.replace('Nnb', '');
            text = text.replace('Nnj.', '');
            text = text.replace('Nnj', '');
            text = text.replace('nnj.', '');
            text = text.replace('nnj.', '');
            text = text.replace('dnmt', '');
            text = text.replace('ndmt.', '');
            baseString += text;
            if (false)
                $('#resultsText').val(baseString);
            showMetaData(alternatives[0]);
            // Only show alternatives if we're final
            alternativePrototype.showAlternatives(alternatives);
        } else {
            //text = text.replace(/ /g,'');      // remove whitespaces
            text = text.replace('Nnb.', '');
            text = text.replace('Nndb.', '');
            text = text.replace('Nndb', '');
            text = text.replace('Nnnd.', '');
            text = text.replace('Nnb', '');
            text = text.replace('Nnj.', '');
            text = text.replace('Nnj', '');
            text = text.replace('nnj.', '');
            text = text.replace('nnj.', '');
            text = text.replace('dnmt', '');
            text = text.replace('ndmt.', '');
            text = text.replace('ndmt', '');
            text = text.charAt(0).toUpperCase() + text.substring(1);
            if (false)
                $('#resultsText').val(baseString + text);
        }
    }

    //KAD updateScroll();
    updateTextScroll();
    return baseString;
};

function analyzeSymptoms(symptomsArray)
{
    return (".....It sounds like you have a common cold. Take 2 aspirin and get rest");
}

function mathResult(text, type)
{
    text = text.substring(0, text.length - 2);
    var result = text.split(" ");
    for (var x = 0; x < result.length; x++) {
        if (result[x] === type) {
            //var firstNumber = result[x-1];
            var firstNumber = getNumberBefore(result, x);
            console.log("first number = " + firstNumber);
            console.log(text2num(firstNumber));
            //var secondNumber = result[x+1];
            var secondNumber = getNumberAfter(result, x);
            console.log("second number = " + secondNumber);
            console.log(text2num(secondNumber));
            //var sum = convertNumberStringToNumber(firstNumber) + convertNumberStringToNumber(secondNumber);
            switch (type) {
                case 'plus':
                    var sum = text2num(firstNumber) + text2num(secondNumber);
                    break;
                case 'minus':
                    var sum = text2num(firstNumber) - text2num(secondNumber);
                    break;
                case 'times':
                    var sum = text2num(firstNumber) * text2num(secondNumber);
                    break;
                case 'dividedby':
                    var sum = text2num(firstNumber) / text2num(secondNumber);
                    break;
            }
            console.log(sum);
            return sum;
        }
    }
}
function getNumberBefore(result, x)
{
    var numstr = "";
    var results = [];
    x--;
    while (x >= 0)
    {
        if (result[x] === 'to') result[x] = 'two';
        if (Small[result[x].toLowerCase()] >= 0 || Magnitude[result[x].toLowerCase()] >= 0)
            results.push(result[x]);
        x--;
    }
    //   console.log(results);

    for (var z = results.length - 1; z >= 0; z--)
        numstr += results[z] + " ";

    return numstr.trim();
}

function getNumberAfter(result, x)
{
    var numstr = "";
    var results = [];
    x++;
    while (x < result.length)
    {
        if (Small[result[x].toLowerCase()] >= 0 || Magnitude[result[x].toLowerCase()] >= 0)
            results.push(result[x]);
        x++;
    }
    //  console.log(results);

    for (var z = 0; z < results.length; z++)
        numstr += results[z] + " ";

    return numstr.trim();
}

function convertNumberStringToNumber(number)
{
    switch (number.toLowerCase())
    {
        case 'one':
            return 1;
        case 'two':
            return 2;
        case 'three':
            return 3;
        case 'four':
            return 4;
        case 'five':
            return 5;
        case 'six':
            return 6;
        case 'seven':
            return 7;
        case 'eight':
            return 8;
        case 'nine':
            return 9;
    }
}
function getDateTime()
{
    var date = new Date();

    var hour = date.getHours();
    var ampm = "A.M.";
    if (hour > 12)
    {
        hour = hour - 12;
        ampm = "P.M.";
    }

    var min = date.getMinutes();

    var sec = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;

    var day = date.getDate();

    console.log(hour + " " + min);
    return hour + " " + min + " " + ampm;

}

function getDate()
{
    var date = new Date();

    var year = date.getFullYear();
    var month = getMonthString(date.getMonth() + 1);
    var day = date.getDate();

    return month + " " + day + ", " + year;
}

function getMonthString(month)
{
    switch (month)
    {
        case 1:
            return "January";
            break;
        case 2:
            return "February";
            break;
        case 3:
            return "March";
            break;
        case 4:
            return "April";
            break;
        case 5:
            return "May";
            break;
        case 6:
            return "June";
            break;
        case 7:
            return "July";
            break;
        case 8:
            return "August";
            break;
        case 9:
            return "September";
            break;
        case 10:
            return "October";
            break;
        case 11:
            return "November";
            break;
        case 12:
            return "December";
            break;
    }
}

var schedule = require("node-schedule");
var j = schedule.scheduleJob({ hour: 16, minute: 39 }, function ()
{
    console.log('Time for tea!');
    playText("End of the workday");
});

$.subscribe('clearscreen', function ()
{
    var $hypotheses = $('.hypotheses ul');
    scrolled = false;
    $hypotheses.empty();
    alternativePrototype.clearString();
});

var Small = {
    'zero': 0,
    'one': 1,
    'two': 2,
    'to': 2,
    'too': 2,
    'three': 3,
    'four': 4,
    'for': 4,
    'five': 5,
    'six': 6,
    'seven': 7,
    'eight': 8,
    'nine': 9,
    'ten': 10,
    'eleven': 11,
    'twelve': 12,
    'thirteen': 13,
    'fourteen': 14,
    'fifteen': 15,
    'sixteen': 16,
    'seventeen': 17,
    'eighteen': 18,
    'nineteen': 19,
    'twenty': 20,
    'thirty': 30,
    'forty': 40,
    'fifty': 50,
    'sixty': 60,
    'seventy': 70,
    'eighty': 80,
    'ninety': 90
};

var Magnitude = {
    'hundred': 100,
    'thousand': 1000,
    'million': 1000000,
    'billion': 1000000000,
    'trillion': 1000000000000,
    'quadrillion': 1000000000000000,
    'quintillion': 1000000000000000000,
    'sextillion': 1000000000000000000000,
    'septillion': 1000000000000000000000000,
    'octillion': 1000000000000000000000000000,
    'nonillion': 1000000000000000000000000000000,
    'decillion': 1000000000000000000000000000000000,
};

var a, n, g;

function text2num(s)
{
    s = s.toLowerCase();
    a = s.toString().split(/[\s-]+/);
    n = 0;
    g = 0;
    console.log("a = " + a);
    a.forEach(feach);
    console.log("n = " + n);
    console.log("g = " + g);
    return n + g;
}

function feach(w)
{
    var x = Small[w];
    if (x != null)
    {
        g = g + x;
    }
    else if (w === "hundred")
    {
        g = g * 100;
    }
    else
    {
        x = Magnitude[w];
        if (x != null)
        {
            n = n + g * x
            g = 0;
        }
        else
        {
            alert("Unknown number: " + w);
        }
    }
}