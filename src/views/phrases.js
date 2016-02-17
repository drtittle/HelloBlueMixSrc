var phrases = ["Help me", "Close help", "Hi", "Hello", "Say hi", "My name is {your name}", "How do you talk so well", "What do you do", "Thank you", "How are you", "How are you doing", "How's it going", "What time is it", "What day is it", "What is X plus Y", "What is X minus Y", "Thank you", "Where is the nearest hotel", "Insurance example", "Do you speak French", "Do you speak Spanish", "Do you speak English"];

exports.getPhraseString = function (ctx) {
    var phraseString = "";
    for (var z = 0; z < phrases.length; z++)
        phraseString += "<tr><td>" + phrases[z] + "</td></tr>";
    return phraseString;
}
