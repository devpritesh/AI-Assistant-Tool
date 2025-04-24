// Clear Input and Results
function clearText() {
    // Clear input text
    document.getElementById('input-text').value = "";

    // Clear translation result
    document.getElementById('translation-result').innerText = "";

    // Stop any ongoing speech synthesis
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    // Reset loaders
    document.getElementById('translation-loader').classList.add('d-none');
}

// Translation Functions
function translateText() {
    const inputText = document.getElementById('input-text').value.trim();
    const sourceLang = document.getElementById('source-lang').value;
    const targetLang = document.getElementById('target-lang').value;

    if (!inputText) {
        alert("Please enter text to translate");
        return;
    }

    // Show loading spinner
    document.getElementById('translation-loader').classList.remove('d-none');

    fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, source_lang: sourceLang, target_lang: targetLang })
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('translation-loader').classList.add('d-none');
            if (data.error) {
                alert(data.error);
                return;
            }
            document.getElementById('translation-result').innerText = data.result || "Translation not available.";
        })
        .catch(error => {
            document.getElementById('translation-loader').classList.add('d-none');
            console.error('Translation error:', error);
            alert('Translation failed. Check your input and try again.');
        });
}

// Text-to-Speech
function speakText() {
    const text = document.getElementById('translation-result').innerText.trim();
    if (!text) {
        alert("No text to speak!");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Get target language code
    const targetLang = document.getElementById('target-lang').value.split('_')[0];
    utterance.lang = targetLang;

    // Fallback to English if no voices available
    const voices = window.speechSynthesis.getVoices().filter(
        voice => voice.lang.startsWith(targetLang)
    );
    if (voices.length === 0) {
        utterance.lang = 'en';
        console.warn(`No voices found for ${targetLang}. Using English.`);
    } else {
        utterance.voice = voices[0];
    }

    // Cancel ongoing speech
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
}

// Summarization Functions
function uploadFile() {
    document.getElementById('file-error').classList.add('d-none');
    document.getElementById('upload-spinner').classList.remove('d-none');

    const fileInput = document.getElementById('summarize-file');
    const file = fileInput.files[0];

    // Validate file type
    const allowedTypes = ['.txt', '.pdf', '.doc', '.docx'];
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes('.' + fileExt)) {
        document.getElementById('file-error').classList.remove('d-none');
        document.getElementById('upload-spinner').classList.add('d-none');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('upload-spinner').classList.add('d-none');
            if (data.error) {
                alert(data.error);
                return;
            }
            document.getElementById('summarize-text').value = data.text;
        })
        .catch(error => {
            document.getElementById('upload-spinner').classList.add('d-none');
            console.error('Upload error:', error);
            alert('Failed to read file. Try a different format.');
        });
}

function summarizeText() {
    const inputText = document.getElementById('summarize-text').value.trim();

    if (!inputText) {
        alert("Please enter/upload text to summarize.");
        return;
    }

    // Show summarization spinner
    document.getElementById('summarize-loader').classList.remove('d-none');
    document.getElementById('summary-result').innerText = '';

    fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('summarize-loader').classList.add('d-none');
            document.getElementById('summary-result').innerText = data.result || "No summary available.";
        })
        .catch(error => {
            document.getElementById('summarize-loader').classList.add('d-none');
            console.error('Summarization error:', error);
            alert('Summarization failed. Try a shorter text.');
        });
}

// DOM Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize voices
    window.speechSynthesis.onvoiceschanged = function () {
        console.log("Voices loaded:", window.speechSynthesis.getVoices());
    };

    // File input listener
    document.getElementById('summarize-file')?.addEventListener('change', uploadFile);
});