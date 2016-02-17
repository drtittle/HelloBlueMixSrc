/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
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

'use strict';

var express = require('express'),
    app = express(),
    vcapServices = require('vcap_services'),
    extend = require('util')._extend,
    watson = require('watson-developer-cloud');

// Bootstrap application settings
require('./config/express')(app);
/*
{
   "speech_to_text": [
      {
         "name": "Speech To Text-30",
         "label": "speech_to_text",
         "plan": "standard",
         "credentials": {
            "url": "https://stream.watsonplatform.net/speech-to-text/api",
            "username": "942124dd-79c9-42d5-8779-9edd6cce5bd7",
            "password": "RPMs8WN0cI1F"
         }
      }
   ],
   "text_to_speech": [
      {
         "name": "Text to Speech-yr",
         "label": "text_to_speech",
         "plan": "standard",
         "credentials": {
            "url": "https://stream.watsonplatform.net/text-to-speech/api",
            "username": "f457ab64-9887-4823-8e19-0f0e8811afb4",
            "password": "hkZvBAHYgd57"
         }
      }
   ],
  "twitter": [
  // Twitter app credentials: https://apps.twitter.com/app
  {
    consumer_key:       '5aBuZKWn1KlhgqjFUoemi3x7r',
    consumer_secret:    'GoiUNVquFPI4KqFJyKxDkWxtTY1i4kwzhalEDmlzvIMSTDeGzL',
    access_token_key:   '102408233-kIGNbfFP2MT5CONiez1eDxBw3QalaYBrXxYKovtN',
    access_token_secret:'ZH2RXxAAW3PoKQpkaJDahbKSp5nldUMajgckfQjk968ne'
  }]
}
*/
// if bluemix credentials exists, then override local
var credentials = extend({
    username: 'c0f42c23-44ad-4c49-a3aa-8f1b9ceb0132',
    password: 'l9UdcMWXZujA',
    version: 'v2'
}, vcapServices.getCredentials('language-translation')); // VCAP_SERVICES

var language_translation = watson.language_translation(credentials);

app.get('/api/models', function (req, res, next) {
    console.log('/v2/models');
    language_translation.getModels({}, function (err, models) {
        if (err)
            return next(err);
        else
            res.json(models);
    });
});

app.post('/api/identify', function (req, res, next) {
    console.log('/v2/identify');
    var params = {
        text: req.body.textData,
        'X-WDC-PL-OPT-OUT': req.header('X-WDC-PL-OPT-OUT')
    };
    language_translation.identify(params, function (err, models) {
        if (err)
            return next(err);
        else
            res.json(models);
    });
});

app.get('/api/identifiable_languages', function (req, res, next) {
    console.log('/v2/identifiable_languages');
    language_translation.getIdentifiableLanguages({}, function (err, models) {
        if (err)
            return next(err);
        else
            res.json(models);
    });
});

app.post('/api/translate', function (req, res, next) {
    console.log('/v2/translate');
    var params = extend({ 'X-WDC-PL-OPT-OUT': req.header('X-WDC-PL-OPT-OUT') }, req.body);
    language_translation.translate(params, function (err, models) {
        if (err)
            return next(err);
        else
            res.json(models);
    });
});


// For local development, replace username and password
var textToSpeech = watson.text_to_speech({
    version: 'v1',
    username: 'f457ab64-9887-4823-8e19-0f0e8811afb4',
    password: 'hkZvBAHYgd57'
});

app.get('/api/synthesize', function (req, res, next) {
    var transcript = textToSpeech.synthesize(req.query);
    transcript.on('response', function (response) {
        if (req.query.download) {
            response.headers['content-disposition'] = 'attachment; filename=transcript.ogg';
        }
    });
    transcript.on('error', function (error) {
        next(error);
    });
    transcript.pipe(res);
});


// For local development, replace username and password
var config = extend({
    version: 'v1',
    url: 'https://stream.watsonplatform.net/speech-to-text/api',
    username: '942124dd-79c9-42d5-8779-9edd6cce5bd7',
    password: 'RPMs8WN0cI1F'
}, vcapServices.getCredentials('speech_to_text'));

var authService = watson.authorization(config);

app.get('/', function (req, res) {
    res.render('index', { ct: req._csrfToken });
});

// Get token using your credentials
app.post('/api/token', function (req, res, next) {
    authService.getToken({ url: config.url }, function (err, token) {
        if (err)
            next(err);
        else
            res.send(token);
    });
});

// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);

