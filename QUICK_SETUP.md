# Quick Setup - Translation & TTS API Integration

## 🚀 Quick Start (3 Steps)

### Step 1: Update API Base URL
Open `frontend/js/api-config.js` and change line 2:

```javascript
BASE_URL: 'http://localhost:5000/api'  // Change to your backend URL
```

### Step 2: Start Backend Server
Make sure your backend server is running with these endpoints:
- `POST /translate` - Translation
- `POST /tts` - Text-to-Speech
- `POST /translate-tts` - Combined
- `POST /upload-voice` - Voice cloning (optional)
- `GET /voices` - List voices (optional)

### Step 3: Test
1. Open `frontend/dashboard.html` in browser
2. Enter text and click "Generate Voice"
3. Audio should play automatically

## ✅ What's Already Integrated

### Dashboard (dashboard.html)
- ✅ Text-to-Speech generation
- ✅ Language selection (120+ languages)
- ✅ Voice clone selection
- ✅ Audio preview
- ✅ Download audio
- ✅ Character usage tracking

### Voice Library (cloneslibrary.html)
- ✅ Upload voice samples
- ✅ Create voice clones
- ✅ Manage clones
- ✅ Delete clones

### API Functions (api-config.js)
- ✅ `API.translate()` - Translate text
- ✅ `API.textToSpeech()` - Generate speech
- ✅ `API.translateAndTTS()` - Combined
- ✅ `API.uploadVoice()` - Upload voice
- ✅ `API.getVoices()` - Get voice list

## 🔧 Configuration

### Required Backend Endpoints

```
POST {{base_url}}/translate
Body: { text, src_lang, tgt_lang }
Response: { translated_text }

POST {{base_url}}/tts
Body: { text, language, speaker_id }
Response: { audio_path, file_path }

POST {{base_url}}/translate-tts
Body: { text, src_lang, tgt_lang, language, speaker_id }
Response: { audio_path, file_path, translated_text, original_text }
```

### Optional Endpoints (for voice cloning)

```
POST {{base_url}}/upload-voice
Body: FormData { voice_file, speaker_id }
Response: { speaker_id, message }

GET {{base_url}}/voices
Response: { voices: [{ speaker_id, name }] }
```

## 📝 Example Usage

### Generate Voice (JavaScript)
```javascript
const response = await API.textToSpeech(
    "Hello, how are you?",  // text
    "en",                    // language
    "default"                // speaker_id
);
// Returns: { audio_path: "/audio/xyz.wav", file_path: "..." }
```

### Translate Text
```javascript
const response = await API.translate(
    "Hello",        // text
    "eng_Latn",     // source language
    "urd_Arab"      // target language
);
// Returns: { translated_text: "ہیلو" }
```

### Translate & Generate Voice
```javascript
const response = await API.translateAndTTS(
    "Hello",        // text
    "eng_Latn",     // source language
    "urd_Arab",     // target language
    "ur",           // TTS language
    "default"       // speaker_id
);
// Returns: { audio_path, translated_text, original_text }
```

## 🐛 Common Issues

### Issue: "Failed to generate voice"
**Fix:** Check if backend is running on correct URL

### Issue: Audio not playing
**Fix:** Verify audio_path is returned and accessible

### Issue: CORS Error
**Fix:** Enable CORS on backend:
```python
# Flask example
from flask_cors import CORS
CORS(app)
```

## 📂 Files Modified

1. `frontend/js/api-config.js` - API configuration
2. `frontend/js/dashboard.js` - Dashboard logic
3. `frontend/js/cloneslibrary.js` - Voice cloning

## 🎯 Testing Checklist

- [ ] Backend server is running
- [ ] BASE_URL is updated in api-config.js
- [ ] Dashboard opens without errors
- [ ] Text-to-Speech generates audio
- [ ] Audio plays in preview
- [ ] Download button works
- [ ] Voice cloning page loads
- [ ] Can upload voice samples

## 📞 Need Help?

1. Check browser console (F12) for errors
2. Test API endpoints in Postman first
3. Verify backend server logs
4. Check API_INTEGRATION_GUIDE.md for detailed docs

---

**That's it! Your Translation & TTS API is now integrated! 🎉**
