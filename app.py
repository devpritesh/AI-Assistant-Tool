import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
from flask import Flask, render_template, request, jsonify
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import PyPDF2
from docx import Document
import os

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# Translation Model (MBART)
translation_model_name = "facebook/mbart-large-50-many-to-many-mmt"
translation_tokenizer = AutoTokenizer.from_pretrained(translation_model_name)
translation_model = AutoModelForSeq2SeqLM.from_pretrained(translation_model_name)

# Summarization Model (BART)
summarization_model_name = "facebook/bart-large-cnn"
summarization_tokenizer = AutoTokenizer.from_pretrained(summarization_model_name)
summarization_model = AutoModelForSeq2SeqLM.from_pretrained(summarization_model_name)

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/translate')
def translate():
    return render_template('translate.html')

@app.route('/summarize')
def summarize():
    return render_template('summarize.html')

@app.route('/api/translate', methods=['POST'])
def translate_api():
    data = request.json
    text = data.get('text', '').strip()
    source_lang = data.get('source_lang', '')
    target_lang = data.get('target_lang', '')

    if not text:
        return jsonify({'error': 'No text to translate'}), 400

    # MBART requires source language as a prefix
    text_with_source = f"{source_lang} {text}"
    inputs = translation_tokenizer(text_with_source, return_tensors="pt", truncation=True)

    # Get target language ID
    target_lang_id = translation_tokenizer.lang_code_to_id.get(target_lang)
    if not target_lang_id:
        return jsonify({'error': 'Invalid target language'}), 400

    outputs = translation_model.generate(
        inputs.input_ids,
        attention_mask=inputs.attention_mask,
        forced_bos_token_id=target_lang_id,
        max_length=512
    )
    translated_text = translation_tokenizer.decode(outputs[0], skip_special_tokens=True)
    return jsonify({'result': translated_text})

@app.route('/api/summarize', methods=['POST'])
def summarize_api():
    data = request.json
    text = data.get('text', '').strip()

    if not text:
        return jsonify({'error': 'No text to summarize'}), 400

    inputs = summarization_tokenizer(text, return_tensors="pt", truncation=True)
    outputs = summarization_model.generate(
        inputs.input_ids,
        max_length=500,
        min_length=50,
        length_penalty=2.0,
        num_beams=4
    )
    summarized_text = summarization_tokenizer.decode(outputs[0], skip_special_tokens=True)
    return jsonify({'result': summarized_text})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400

    filename = file.filename
    _, ext = os.path.splitext(filename)
    text = ""

    try:
        if ext.lower() == ".pdf":
            pdf_reader = PyPDF2.PdfReader(file)
            text = " ".join([page.extract_text() for page in pdf_reader.pages])
        elif ext.lower() in [".doc", ".docx"]:
            doc = Document(file)
            text = " ".join([para.text for para in doc.paragraphs])
        elif ext.lower() == ".txt":
            text = file.read().decode('utf-8')
        else:
            return jsonify({'error': 'Unsupported file type'}), 400
    except Exception as e:
        return jsonify({'error': f'Error reading file: {str(e)}'}), 500

    return jsonify({'text': text.strip()})

if __name__ == '__main__':
    app.run(debug=True)