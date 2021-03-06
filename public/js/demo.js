/**
 * Copyright 2014, 2015 IBM Corp. All Rights Reserved.
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
/*global $:false, SPEECH_SYNTHESIS_VOICES */

'use strict';

$(document).ready(function () {

    function showError(msg) {
        console.error('Error: ', msg);
        var errorAlert = $('.error-row');
        errorAlert.css('visibility', 'hidden');
        errorAlert.css('background-color', '#d74108');
        errorAlert.css('color', 'white');
        var errorMessage = $('#errorMessage');
        errorMessage.text(msg);
        errorAlert.css('visibility', '');

        $('#errorClose').click(function (e) {
            e.preventDefault();
            errorAlert.css('visibility', 'hidden');
            return false;
        });
    }

    function synthesizeRequest(options, audio) {
        var sessionPermissions = JSON.parse(localStorage.getItem('sessionPermissions')) ? 0 : 1;
        var downloadURL = '/api/synthesize' +
            '?voice=' + options.voice +
            '&text=' + encodeURIComponent(options.text) +
            '&X-WDC-PL-OPT-OUT=' + sessionPermissions;

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

    // Global comes from file constants.js
    var voices = SPEECH_SYNTHESIS_VOICES.voices;
    showVoices(voices);

    var voice = 'en-US_AllisonVoice';

    function playText(text) {
        var utteranceOptions = {
            text: text,
            voice: voice,
            sessionPermissions: JSON.parse(localStorage.getItem('sessionPermissions')) ? 0 : 1
        };

        synthesizeRequest(utteranceOptions, audio);
    }

    function showVoices(voices) {

        var currentTab = 'Text';

        // Show tabs
        $('#nav-tabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });

        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            currentTab = $(e.target).text();
        });

        var LANGUAGE_TABLE = {
            'en-US': 'English (en-US)',
            'en-GB': 'English (en-GB)',
            'es-US': 'Spanish (es-US)',
            'de-DE': 'German (de-DE)',
            'fr-FR': 'French (fr-FR)',
            'it-IT': 'Italian (it-IT)',
            'es-ES': 'Spanish (es-ES)'
        };

        $.each(voices, function (idx, voice) {
            var voiceName = voice.name.substring(6, voice.name.length - 5);
            var optionText = LANGUAGE_TABLE[voice.language] + ': ' + voiceName + ' (' + voice.gender + ')';
            $('#dropdownMenuList').append(
                $('<li>')
                    .attr('role', 'presentation')
                    .append(
                        $('<a>').attr('role', 'menu-item')
                            .attr('href', '/')
                            .attr('data-voice', voice.name)
                            .append(optionText)
                        )
                );
        });

        var audio = $('.audio').get(0),
            textArea = $('#resultsText');

        var textChanged = false;
        $('#resultsText').val(''); // KAD changed
        $('#ssmlArea').val(englishSSML);

        $('#resultsText').change(function () {
            textChanged = true;
        });

        $('#dropdownMenuList').click(function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            var newVoiceDescription = $(evt.target).text();
            voice = $(evt.target).data('voice');
            $('#dropdownMenuDefault').empty().text(newVoiceDescription);
            $('#dropdownMenu1').dropdown('toggle');

            var lang = voice.substring(0, 2);
            switch (lang) {
                case 'es':
                    $('#resultsText').val(spanishText);
                    $('#ssmlArea').val(spanishSSML);
                    break;
                case 'fr':
                    $('#resultsText').val(frenchText);
                    $('#ssmlArea').val(frenchSSML);
                    break;
                case 'de':
                    $('#resultsText').val(germanText);
                    $('#ssmlArea').val(germanSSML);
                    break;
                case 'it':
                    $('#resultsText').val(italianText);
                    $('#ssmlArea').val(italianSSML);
                    break;
                default:
                    $('#resultsText').val(englishText);
                    $('#ssmlArea').val(englishSSML);
                    break;
            }
        });

        // IE and Safari not supported disabled Speak button
        if ($('body').hasClass('ie') || $('body').hasClass('safari')) {
            $('#speak-button').prop('disabled', true);
        }

        if ($('#speak-button').prop('disabled')) {
            $('.ie-speak .arrow-box').show();
        }

        $('.audio').on('error', function (err) {
            $.get('/api/synthesize?text=test').always(function (response) {
                showError(response.responseText || 'Error processing the request');
            });
        });

        $('.audio').on('loadeddata', function () {
            $('.result').show();
            $('.error-row').css('visibility', 'hidden');
        });

        $('.download-button').click(function () {
            textArea.focus();
            if (validText(voice, textArea.val())) {
                var utteranceDownloadOptions = {
                    text: currentTab === 'SSML' ? $('#ssmlArea').val() : $('#resultsText').val(),
                    voice: voice,
                    download: true
                };
                synthesizeRequest(utteranceDownloadOptions);
            }
        });

        $('#speak-button').click(function (evt) {

            evt.stopPropagation();
            evt.preventDefault();
            $('.result').hide();

            $('#resultsText').focus();
            var text = currentTab === 'SSML' ? $('#ssmlArea').val() : $('#resultsText').val();
            if (validText(voice, text)) {
                var utteranceOptions = {
                    text: text,
                    voice: voice,
                    sessionPermissions: JSON.parse(localStorage.getItem('sessionPermissions')) ? 0 : 1
                };

                synthesizeRequest(utteranceOptions, audio);
            }
            return false;
        });

        function validText(voice, text) {
            $('.error-row').css('visibility', 'hidden');
            $('.errorMsg').text('');
            $('.latin').hide();

            if ($.trim(text).length === 0) { // empty text
                showError('Please enter the text you would like to synthesize in the text window.');
                return false;
            }

            return true;
        }
    }

    (function () {
        // Radio buttons for session permissions
        localStorage.setItem('sessionPermissions', true);
        var sessionPermissionsRadio = $('#sessionPermissionsRadioGroup input[type="radio"]');
        sessionPermissionsRadio.click(function () {
            var checkedValue = sessionPermissionsRadio.filter(':checked').val();
            localStorage.setItem('sessionPermissions', checkedValue);
        });
    } ());

});
