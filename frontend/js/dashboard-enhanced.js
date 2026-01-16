// API Configuration - Using the standalone translation/TTS server
const TTS_API_BASE_URL = 'http://localhost:8000'; // Translation & TTS API server
const MAIN_API_BASE_URL = 'http://127.0.0.1:5000/api'; // Main Flask API

// Admin settings
let adminSettings = {
  maxCharacters: 60000
};

// Current audio ID for download
let currentAudioId = null;
let currentCombinedAudioPath = null;

// System health status
let systemHealth = {
  translation: false,
  tts: false,
  device: 'cpu'
};

// Available languages
let availableLanguages = {
  translation: [],
  tts: []
};

// Initialize on page load
window.onload = async function () {
  updateCharacterCount();
  await checkSystemHealth();
  await loadLanguages();
  await loadVoicesList();
  loadUserProfile();
  loadProfilePicture();

  // Setup drag and drop for voice upload
  setupDragAndDrop();

  // Load saved usage stats
  const savedUsage = parseInt(localStorage.getItem('totalCharactersUsed') || '0');
  updateUsageStats(savedUsage);
};

// ==========================================
// TAB SWITCHING
// ==========================================
function switchTab(tabName) {
  // Hide all tabs
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Deactivate all buttons
  const buttons = document.querySelectorAll('.tab-button');
  buttons.forEach(btn => btn.classList.remove('active'));

  // Show selected tab
  document.getElementById(tabName + 'Tab').classList.add('active');

  // Activate selected button
  event.target.classList.add('active');

  // Refresh data if needed
  if (tabName === 'voices') {
    loadVoicesList();
  }
}

// ==========================================
// SYSTEM HEALTH CHECK
// ==========================================
async function checkSystemHealth() {
  try {
    const response = await fetch(`${TTS_API_BASE_URL}/health`);
    const data = await response.json();

    systemHealth = {
      translation: data.models?.translation || false,
      tts: data.models?.tts || false,
      device: data.device || 'cpu',
      cuda: data.cuda_available || false
    };

    updateHealthUI(true, data);
  } catch (error) {
    console.error('Health check failed:', error);
    updateHealthUI(false);
  }
}

function updateHealthUI(healthy, data = null) {
  const healthStatus = document.getElementById('healthStatus');
  const indicator = healthStatus.querySelector('.status-indicator');
  const statusText = healthStatus.querySelector('span');

  if (healthy && data) {
    healthStatus.className = 'health-status healthy';
    indicator.className = 'status-indicator';
    statusText.textContent = `System Healthy - ${data.device.toUpperCase()} ${data.cuda_available ? '(CUDA Available)' : ''}`;
  } else {
    healthStatus.className = 'health-status unhealthy';
    indicator.className = 'status-indicator offline';
    statusText.textContent = 'System Offline - Check if server is running';
  }
}

// ==========================================
// LOAD LANGUAGES
// ==========================================
async function loadLanguages() {
  try {
    const response = await fetch(`${TTS_API_BASE_URL}/languages`);
    const data = await response.json();

    availableLanguages = data;

    // Populate translation language dropdowns
    populateLanguageDropdown('srcLang', data.translation?.languages || []);
    populateLanguageDropdown('tgtLang', data.translation?.languages || []);
    populateLanguageDropdown('combinedSrcLang', data.translation?.languages || []);
    populateLanguageDropdown('combinedTgtLang', data.translation?.languages || []);

    // Populate TTS language dropdowns
    populateTTSLanguageDropdown('ttsLanguage', data.tts?.languages || []);
    populateTTSLanguageDropdown('combinedTtsLang', data.tts?.languages || []);

    // Set default values
    document.getElementById('srcLang').value = 'eng_Latn';
    document.getElementById('tgtLang').value = 'urd_Arab';
    document.getElementById('combinedSrcLang').value = 'eng_Latn';
    document.getElementById('combinedTgtLang').value = 'urd_Arab';
    document.getElementById('ttsLanguage').value = 'en';
    document.getElementById('combinedTtsLang').value = 'en';

  } catch (error) {
    console.error('Failed to load languages:', error);
    showMessage('error', 'Failed to load languages. Using defaults.');
    loadDefaultLanguages();
  }
}

function populateLanguageDropdown(selectId, languages) {
  const select = document.getElementById(selectId);
  select.innerHTML = '';

  languages.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.name;
    select.appendChild(option);
  });
}

function populateTTSLanguageDropdown(selectId, languages) {
  const select = document.getElementById(selectId);
  select.innerHTML = '';

  languages.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.name;
    select.appendChild(option);
  });
}

function loadDefaultLanguages() {
  // Fallback language options
  const defaultTranslationLangs = [
    { code: 'eng_Latn', name: 'English' },
    { code: 'urd_Arab', name: 'Urdu' },
    { code: 'hin_Deva', name: 'Hindi' },
    { code: 'ara_Arab', name: 'Arabic' },
    { code: 'spa_Latn', name: 'Spanish' },
    { code: 'fra_Latn', name: 'French' }
  ];

  const defaultTTSLangs = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ur', name: 'Urdu' },
    { code: 'hi', name: 'Hindi' }
  ];

  populateLanguageDropdown('srcLang', defaultTranslationLangs);
  populateLanguageDropdown('tgtLang', defaultTranslationLangs);
  populateLanguageDropdown('combinedSrcLang', defaultTranslationLangs);
  populateLanguageDropdown('combinedTgtLang', defaultTranslationLangs);

  populateTTSLanguageDropdown('ttsLanguage', defaultTTSLangs);
  populateTTSLanguageDropdown('combinedTtsLang', defaultTTSLangs);
}

// ==========================================
// TRANSLATION FUNCTIONS
// ==========================================
async function translateText() {
  const text = document.getElementById('translateInput').value.trim();
  const srcLang = document.getElementById('srcLang').value;
  const tgtLang = document.getElementById('tgtLang').value;

  if (!text) {
    showMessage('error', 'Please enter text to translate');
    return;
  }

  const translateBtn = event.target;
  const originalText = translateBtn.textContent;
  translateBtn.textContent = 'Translating...';
  translateBtn.disabled = true;

  try {
    const response = await fetch(`${TTS_API_BASE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        src_lang: srcLang,
        tgt_lang: tgtLang
      })
    });

    const data = await response.json();

    if (response.ok) {
      const resultDiv = document.getElementById('translationResult');
      resultDiv.className = 'translation-result has-content';
      resultDiv.innerHTML = `
        <div style="font-size: 16px; color: #333; line-height: 1.6;">
          ${data.translated_text}
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; color: #6c757d; font-size: 14px;">
          Original: ${text}
        </div>
      `;
      showMessage('success', 'Translation completed successfully!');
    } else {
      throw new Error(data.error || 'Translation failed');
    }
  } catch (error) {
    console.error('Translation error:', error);
    showMessage('error', error.message || 'Translation failed. Please try again.');
  } finally {
    translateBtn.textContent = originalText;
    translateBtn.disabled = false;
  }
}

function swapLanguages() {
  const srcLang = document.getElementById('srcLang');
  const tgtLang = document.getElementById('tgtLang');
  const temp = srcLang.value;
  srcLang.value = tgtLang.value;
  tgtLang.value = temp;
}

function swapCombinedLanguages() {
  const srcLang = document.getElementById('combinedSrcLang');
  const tgtLang = document.getElementById('combinedTgtLang');
  const temp = srcLang.value;
  srcLang.value = tgtLang.value;
  tgtLang.value = temp;
}

// ==========================================
// TEXT-TO-SPEECH FUNCTIONS
// ==========================================
async function generateVoiceTTS(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const text = document.getElementById('textInput').value.trim();
  const language = document.getElementById('ttsLanguage').value;
  const speakerId = document.getElementById('speakerId').value;

  if (!text) {
    showMessage('error', 'Please enter text to generate voice');
    return false;
  }

  const generateBtn = document.querySelector('#ttsTab .btn-primary');
  const originalText = generateBtn.textContent;
  generateBtn.textContent = 'Generating...';
  generateBtn.disabled = true;

  try {
    const response = await fetch(`${TTS_API_BASE_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        language: language,
        speaker_id: speakerId
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Update usage stats
      const currentUsage = parseInt(localStorage.getItem('totalCharactersUsed') || '0');
      const newUsage = currentUsage + text.length;
      localStorage.setItem('totalCharactersUsed', newUsage.toString());
      updateUsageStats(newUsage);

      // Update character counter
      updateCharacterCount();

      // Set audio source - FIXED: Prevent auto-download
      const audioPreview = document.getElementById('audioPreview');
      const audioElement = audioPreview.querySelector('audio');
      const placeholder = audioPreview.querySelector('.audio-placeholder');

      // Store audio path for download
      currentAudioId = data.audio_path;

      // IMPORTANT: Set the source for PREVIEW ONLY, not for download
      // This prevents auto-download by just setting src without additional attributes
      audioElement.src = `${TTS_API_BASE_URL}${data.audio_path}`;
      audioElement.removeAttribute('disabled');
      placeholder.style.display = 'none';

      showMessage('success', 'Voice generated successfully! Click play to preview.');
    } else {
      throw new Error(data.error || 'TTS generation failed');
    }
  } catch (error) {
    console.error('TTS generation error:', error);
    showMessage('error', error.message || 'Failed to generate voice. Please try again.');
  } finally {
    generateBtn.textContent = originalText;
    generateBtn.disabled = false;
  }

  return false;
}

// ==========================================
// COMBINED TRANSLATE & TTS
// ==========================================
async function translateAndGenerateTTS() {
  const text = document.getElementById('combinedInput').value.trim();
  const srcLang = document.getElementById('combinedSrcLang').value;
  const tgtLang = document.getElementById('combinedTgtLang').value;
  const ttsLang = document.getElementById('combinedTtsLang').value;
  const speakerId = document.getElementById('combinedSpeaker').value;

  if (!text) {
    showMessage('error', 'Please enter text');
    return;
  }

  const generateBtn = event.target;
  const originalText = generateBtn.textContent;
  generateBtn.textContent = 'Processing...';
  generateBtn.disabled = true;

  try {
    const requestBody = {
      text: text,
      language: ttsLang,
      speaker_id: speakerId
    };

    // Add translation parameters if languages are selected
    if (srcLang && tgtLang) {
      requestBody.src_lang = srcLang;
      requestBody.tgt_lang = tgtLang;
    }

    const response = await fetch(`${TTS_API_BASE_URL}/translate-tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (response.ok) {
      // Display translation result
      const resultDiv = document.getElementById('combinedTranslationResult');
      resultDiv.className = 'translation-result has-content';
      resultDiv.innerHTML = `
        <div style="font-size: 16px; color: #333; line-height: 1.6;">
          ${data.translated_text || data.original_text}
        </div>
        ${data.translated_text ? `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; color: #6c757d; font-size: 14px;">
          Original: ${data.original_text || text}
        </div>` : ''}
      `;

      // Set audio source - FIXED: Prevent auto-download
      const audioPreview = document.getElementById('combinedAudioPreview');
      const audioElement = audioPreview.querySelector('audio');

      currentCombinedAudioPath = data.audio_path;

      // Set source for preview only
      audioElement.src = `${TTS_API_BASE_URL}${data.audio_path}`;
      audioPreview.style.display = 'block';

      // Show download button
      document.getElementById('combinedDownloadBtn').style.display = 'block';

      // Update usage stats
      const currentUsage = parseInt(localStorage.getItem('totalCharactersUsed') || '0');
      const newUsage = currentUsage + text.length;
      localStorage.setItem('totalCharactersUsed', newUsage.toString());
      updateUsageStats(newUsage);

      showMessage('success', 'Translation and TTS completed successfully!');
    } else {
      throw new Error(data.error || 'Combined operation failed');
    }
  } catch (error) {
    console.error('Combined operation error:', error);
    showMessage('error', error.message || 'Failed to process. Please try again.');
  } finally {
    generateBtn.textContent = originalText;
    generateBtn.disabled = false;
  }
}

// ==========================================
// VOICE CLONING FUNCTIONS
// ==========================================
function setupDragAndDrop() {
  const uploadArea = document.getElementById('uploadArea');

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fileInput = document.getElementById('voiceFileInput');
      fileInput.files = files;
      handleVoiceFileSelect({ target: fileInput });
    }
  });
}

function handleVoiceFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    const fileNameDisplay = document.getElementById('selectedFileName');
    fileNameDisplay.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  }
}

async function uploadVoice() {
  const fileInput = document.getElementById('voiceFileInput');
  const userId = document.getElementById('voiceUserId').value.trim();

  if (!fileInput.files || fileInput.files.length === 0) {
    showMessage('error', 'Please select a voice file');
    return;
  }

  if (!userId) {
    showMessage('error', 'Please enter a user ID');
    return;
  }

  const file = fileInput.files[0];

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    showMessage('error', 'File size must be less than 10MB');
    return;
  }

  const uploadBtn = event.target;
  const originalText = uploadBtn.textContent;
  uploadBtn.textContent = 'Uploading...';
  uploadBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('voice_file', file);
    formData.append('user_id', userId);

    const response = await fetch(`${TTS_API_BASE_URL}/voice/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      showMessage('success', 'Voice uploaded successfully!');

      // Clear form
      fileInput.value = '';
      document.getElementById('voiceUserId').value = '';
      document.getElementById('selectedFileName').textContent = '';

      // Refresh voice list
      await loadVoicesList();
    } else {
      throw new Error(data.error || 'Voice upload failed');
    }
  } catch (error) {
    console.error('Voice upload error:', error);
    showMessage('error', error.message || 'Failed to upload voice. Please try again.');
  } finally {
    uploadBtn.textContent = originalText;
    uploadBtn.disabled = false;
  }
}

async function loadVoicesList() {
  try {
    const response = await fetch(`${TTS_API_BASE_URL}/voice/list`);
    const data = await response.json();

    const voicesList = document.getElementById('voicesList');
    voicesList.innerHTML = '';

    if (data.voices && data.voices.length > 0) {
      data.voices.forEach(voice => {
        const voiceItem = document.createElement('div');
        voiceItem.className = 'voice-item';
        voiceItem.innerHTML = `
          <div>
            <strong>${voice.user_id}</strong>
            <div style="font-size: 12px; color: #6c757d; margin-top: 4px;">
              ${voice.available ? '✓ Available' : '✗ Unavailable'}
            </div>
          </div>
          <div class="voice-actions">
            <button class="icon-button" onclick="playVoiceSample('${voice.user_id}')" title="Play sample">
              ▶
            </button>
          </div>
        `;
        voicesList.appendChild(voiceItem);
      });

      // Also update speaker dropdowns
      updateSpeakerDropdowns(data.voices);
    } else {
      voicesList.innerHTML = '<p style="color: #999; font-style: italic; text-align: center; padding: 20px;">No voices uploaded yet</p>';
    }
  } catch (error) {
    console.error('Failed to load voices:', error);
    document.getElementById('voicesList').innerHTML = '<p style="color: #dc3545; text-align: center; padding: 20px;">Failed to load voices</p>';
  }
}

function updateSpeakerDropdowns(voices) {
  const speakerSelects = ['speakerId', 'combinedSpeaker'];

  speakerSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    // Keep default option
    select.innerHTML = '<option value="default">Default Voice</option>';

    voices.forEach(voice => {
      if (voice.available) {
        const option = document.createElement('option');
        option.value = voice.user_id;
        option.textContent = voice.user_id;
        select.appendChild(option);
      }
    });
  });
}

function playVoiceSample(userId) {
  // This would play a sample of the cloned voice
  // Implementation depends on your API
  showMessage('info', `Playing sample for ${userId}...`);
}

// ==========================================
// DOWNLOAD FUNCTIONS
// ==========================================
async function downloadMP3(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!currentAudioId) {
    showMessage('error', 'Please generate voice first');
    return false;
  }

  const downloadBtn = event.target;
  const originalText = downloadBtn.textContent;
  downloadBtn.textContent = 'Downloading...';
  downloadBtn.disabled = true;

  try {
    const response = await fetch(`${TTS_API_BASE_URL}${currentAudioId}`);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated_audio_${Date.now()}.wav`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showMessage('success', 'Audio downloaded successfully!');
  } catch (error) {
    console.error('Download error:', error);
    showMessage('error', 'Failed to download audio. Please try again.');
  } finally {
    downloadBtn.textContent = originalText;
    downloadBtn.disabled = false;
  }

  return false;
}

async function downloadCombinedAudio() {
  if (!currentCombinedAudioPath) {
    showMessage('error', 'No audio available for download');
    return;
  }

  const downloadBtn = event.target;
  const originalText = downloadBtn.textContent;
  downloadBtn.textContent = 'Downloading...';
  downloadBtn.disabled = true;

  try {
    const response = await fetch(`${TTS_API_BASE_URL}${currentCombinedAudioPath}`);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `translated_audio_${Date.now()}.wav`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showMessage('success', 'Audio downloaded successfully!');
  } catch (error) {
    console.error('Download error:', error);
    showMessage('error', 'Failed to download audio. Please try again.');
  } finally {
    downloadBtn.textContent = originalText;
    downloadBtn.disabled = false;
  }
}

// ==========================================
// USAGE TRACKING
// ==========================================
function updateCharacterCount() {
  const textInput = document.getElementById('textInput');
  if (!textInput) return;
  
  const characterCounter = document.getElementById('characterCounter');
  const remainingCounter = document.getElementById('remainingCounter');

  const maxChars = adminSettings.maxCharacters;
  const currentLength = textInput.value.length;
  const remaining = maxChars - currentLength;

  characterCounter.textContent = `${currentLength} characters`;
  remainingCounter.textContent = `Remaining: ${remaining}`;

  if (remaining < 1000) {
    remainingCounter.style.color = '#ff4d4d';
  } else if (remaining < 5000) {
    remainingCounter.style.color = '#ffa500';
  } else {
    remainingCounter.style.color = '#4ecca3';
  }
}

function updateUsageStats(charactersUsed) {
  const usedChars = document.getElementById('usedChars');
  const totalChars = document.getElementById('totalChars');
  const usageLabel = document.getElementById('usageLabel');
  const progressFill = document.getElementById('progressFill');

  const maxChars = adminSettings.maxCharacters;
  const usagePercent = ((charactersUsed / maxChars) * 100).toFixed(1);

  usedChars.textContent = charactersUsed.toLocaleString();
  totalChars.textContent = maxChars.toLocaleString();
  usageLabel.textContent = `Usage: ${usagePercent}%`;
  progressFill.style.width = `${usagePercent}%`;

  if (charactersUsed > maxChars * 0.9) {
    progressFill.style.background = '#ff4d4d';
  } else if (charactersUsed > maxChars * 0.7) {
    progressFill.style.background = '#ffa500';
  } else {
    progressFill.style.background = '#4ecca3';
  }
}

// ==========================================
// UI HELPERS
// ==========================================
function showMessage(type, text) {
  let messageDiv = document.getElementById('messageToast');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'messageToast';
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(400px);
      transition: transform 0.3s ease;
      max-width: 400px;
    `;
    document.body.appendChild(messageDiv);
  }

  // Set colors based on type
  const colors = {
    success: { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
    error: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
    info: { bg: '#d1ecf1', color: '#0c5460', border: '#bee5eb' }
  };

  const style = colors[type] || colors.info;
  messageDiv.style.background = style.bg;
  messageDiv.style.color = style.color;
  messageDiv.style.border = `1px solid ${style.border}`;
  messageDiv.textContent = text;
  messageDiv.style.transform = 'translateX(0)';

  setTimeout(() => {
    messageDiv.style.transform = 'translateX(400px)';
  }, 5000);
}

// ==========================================
// PROFILE FUNCTIONS
// ==========================================
function loadUserProfile() {
  const user = JSON.parse(localStorage.getItem('voiceAppUser') || '{}');
  const welcomeMsg = document.getElementById('welcomeMessage');
  if (welcomeMsg) {
    welcomeMsg.textContent = `Welcome, ${user.name || 'User'}`;
  }
}

function openProfileModal() {
  const user = JSON.parse(localStorage.getItem('voiceAppUser') || '{}');
  document.getElementById('editName').value = user.name || '';
  document.getElementById('editEmail').value = user.email || '';

  const modalPic = document.getElementById('modalProfilePic');
  if (user.profilePic) {
    modalPic.style.backgroundImage = `url(${user.profilePic})`;
    modalPic.style.backgroundSize = 'cover';
    modalPic.style.backgroundPosition = 'center';
    modalPic.textContent = '';
  } else {
    modalPic.textContent = (user.name || 'U').charAt(0).toUpperCase();
  }

  document.getElementById('profileModal').style.display = 'block';
}

function closeProfileModal() {
  document.getElementById('profileModal').style.display = 'none';
  document.getElementById('profileForm').reset();
}

function previewProfilePic() {
  const input = document.getElementById('profilePicInput');
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const modalPic = document.getElementById('modalProfilePic');
      modalPic.style.backgroundImage = `url(${e.target.result})`;
      modalPic.style.backgroundSize = 'cover';
      modalPic.style.backgroundPosition = 'center';
      modalPic.textContent = '';
    };
    reader.readAsDataURL(file);
  }
}

function loadProfilePicture() {
  const user = JSON.parse(localStorage.getItem('voiceAppUser') || '{}');
  const profilePic = document.getElementById('profilePic');

  if (profilePic) {
    if (user.profilePic) {
      profilePic.style.backgroundImage = `url(${user.profilePic})`;
      profilePic.style.backgroundSize = 'cover';
      profilePic.style.backgroundPosition = 'center';
      profilePic.textContent = '';
    } else {
      profilePic.textContent = (user.name || 'U').charAt(0).toUpperCase();
    }
  }
}

// Handle profile form submission
document.addEventListener('DOMContentLoaded', function () {
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const user = JSON.parse(localStorage.getItem('voiceAppUser') || '{}');
      user.name = document.getElementById('editName').value;

      const modalPic = document.getElementById('modalProfilePic');
      if (modalPic.style.backgroundImage) {
        user.profilePic = modalPic.style.backgroundImage.slice(5, -2);
      }

      localStorage.setItem('voiceAppUser', JSON.stringify(user));
      loadUserProfile();
      loadProfilePicture();
      closeProfileModal();
      showMessage('success', 'Profile updated successfully!');
    });
  }
});

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById('profileModal');
  if (event.target === modal) {
    closeProfileModal();
  }
}

// Navigation
function goHome() {
  window.location.href = 'index.html';
}