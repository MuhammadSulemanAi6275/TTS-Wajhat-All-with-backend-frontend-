// Admin settings - ye values admin dashboard se aayengi
let adminSettings = {
  maxCharacters: 60000 // Default value, admin se update hogi
};

// Selected voice options
let selectedOptions = {
  language: 'en-us',
  maleVoice: null,
  femaleVoice: null,
  kidsVoice: null,
  voiceStyle: 'default'
};

function updateCharacterCount() {
  const textInput = document.getElementById('textInput');
  const characterCounter = document.getElementById('characterCounter');
  const remainingCounter = document.getElementById('remainingCounter');

  const maxChars = adminSettings.maxCharacters;
  const currentLength = textInput.value.length;
  const remaining = maxChars - currentLength;

  // Update bottom counter only (real-time)
  characterCounter.textContent = `${currentLength} characters`;
  remainingCounter.textContent = `Remaining: ${remaining}`;

  // Change colors based on usage
  if (remaining < 1000) {
    remainingCounter.style.color = '#ff4d4d';
  } else if (remaining < 5000) {
    remainingCounter.style.color = '#ffa500';
  } else {
    remainingCounter.style.color = '#4ecca3';
  }
}

// Function to update status card after voice generation
function updateUsageStats(charactersUsed) {
  const usedChars = document.getElementById('usedChars');
  const totalChars = document.getElementById('totalChars');
  const usageLabel = document.getElementById('usageLabel');
  const progressFill = document.getElementById('progressFill');

  const maxChars = adminSettings.maxCharacters;
  const usagePercent = ((charactersUsed / maxChars) * 100).toFixed(1);

  // Update top status card
  usedChars.textContent = charactersUsed.toLocaleString();
  totalChars.textContent = maxChars.toLocaleString();
  usageLabel.textContent = `Usage: ${usagePercent}%`;
  progressFill.style.width = `${usagePercent}%`;

  // Change colors based on usage
  if (charactersUsed > maxChars * 0.9) {
    progressFill.style.background = '#ff4d4d';
  } else if (charactersUsed > maxChars * 0.7) {
    progressFill.style.background = '#ffa500';
  } else {
    progressFill.style.background = '#4ecca3';
  }
}

// Enhanced dropdown functionality for all dropdowns
function setupDropdowns() {
  const dropdowns = document.querySelectorAll('.custom-dropdown');

  dropdowns.forEach(dropdown => {
    const selected = dropdown.querySelector('.dropdown-selected');
    const options = dropdown.querySelector('.dropdown-options');
    const optionItems = dropdown.querySelectorAll('.dropdown-option');
    const searchInput = dropdown.querySelector('.language-search');

    // Toggle dropdown on click
    selected.onclick = function (e) {
      e.stopPropagation();

      // Close all other dropdowns first
      dropdowns.forEach(otherDropdown => {
        if (otherDropdown !== dropdown) {
          const otherOptions = otherDropdown.querySelector('.dropdown-options');
          otherOptions.style.display = 'none';
          otherOptions.classList.remove('show');
        }
      });

      // Toggle current dropdown
      if (options.style.display === 'block') {
        options.style.display = 'none';
        options.classList.remove('show');
      } else {
        options.style.display = 'block';
        options.classList.add('show');

        // Focus search input if it exists
        if (searchInput) {
          setTimeout(() => searchInput.focus(), 100);
        }
      }
    };

    // Handle option selection
    optionItems.forEach(option => {
      option.onclick = function (e) {
        e.stopPropagation();
        const text = this.textContent.trim();
        const icon = this.querySelector('svg');

        // Update selected display
        const span = selected.querySelector('span');
        span.innerHTML = '';

        if (icon) {
          const clonedIcon = icon.cloneNode(true);
          span.appendChild(clonedIcon);
        }

        span.appendChild(document.createTextNode(' ' + text));

        // Store selected value
        dropdown.setAttribute('data-selected', this.getAttribute('data-value') || text);

        // Hide dropdown
        options.style.display = 'none';
        options.classList.remove('show');
      };
    });

    // Search functionality for language dropdown
    if (searchInput) {
      searchInput.oninput = function (e) {
        e.stopPropagation();
        const searchTerm = this.value.toLowerCase();

        optionItems.forEach(option => {
          const text = option.textContent.toLowerCase();
          if (text.includes(searchTerm)) {
            option.style.display = 'block';
          } else {
            option.style.display = 'none';
          }
        });
      };

      // Prevent dropdown from closing when clicking on search input
      searchInput.onclick = function (e) {
        e.stopPropagation();
      };
    }
  });

  // Close all dropdowns when clicking outside
  document.onclick = function (e) {
    dropdowns.forEach(dropdown => {
      if (!dropdown.contains(e.target)) {
        const options = dropdown.querySelector('.dropdown-options');
        options.style.display = 'none';
        options.classList.remove('show');
      }
    });
  };
}

// Function to update admin settings (call this from admin dashboard)
function updateAdminSettings(newMaxChars) {
  adminSettings.maxCharacters = newMaxChars;
  // Update textarea max length
  document.getElementById('textInput').setAttribute('maxlength', newMaxChars);
  // Refresh display
  updateCharacterCount();
}

// Initialize on page load with API integration
window.onload = async function () {
  updateCharacterCount();
  setupDropdowns();
  await loadUserDashboard();
  loadVoiceClones();
  loadProfilePicture();

  // Load saved usage stats
  const savedUsage = parseInt(localStorage.getItem('totalCharactersUsed') || '0');
  updateUsageStats(savedUsage);
};

// Load user dashboard data from API
async function loadUserDashboard() {
  try {
    const dashboardData = await API.getUserDashboard();

    // Update user info
    if (dashboardData.user) {
      document.getElementById('welcomeMessage').textContent = `Welcome, ${dashboardData.user.name || 'User'}`;
    }

    // Update usage stats if available
    if (dashboardData.usage) {
      updateUsageStats(dashboardData.usage.characters_used || 0);
      if (dashboardData.usage.total_characters) {
        adminSettings.maxCharacters = dashboardData.usage.total_characters;
      }
    }

  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    // Continue with local data as fallback
  }
}

// Function to load voice clones from API
async function loadVoiceClones() {
  try {
    // Load clones from API
    const response = await API.request('/voice/voices', {
      method: 'GET',
      headers: API.getAuthHeaders()
    });
    const clones = response || [];

    const voiceCloneDropdown = document.querySelector('[data-dropdown="voice-clone"] .dropdown-options');

    if (voiceCloneDropdown) {
      // Clear all existing options
      voiceCloneDropdown.innerHTML = '';

      // Add search bar
      const searchDiv = document.createElement('div');
      searchDiv.className = 'dropdown-search';
      searchDiv.innerHTML = '<input type="text" placeholder="Search voice clones..." class="clone-search" />';
      voiceCloneDropdown.appendChild(searchDiv);

      // Add user's API clones to dropdown
      clones.forEach(clone => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.setAttribute('data-value', clone.id);
        option.innerHTML = `
          <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          </svg>
          ${clone.voice_name}
        `;
        voiceCloneDropdown.appendChild(option);
      });

      // Add search functionality
      const searchInput = voiceCloneDropdown.querySelector('.clone-search');
      if (searchInput) {
        searchInput.oninput = function (e) {
          e.stopPropagation();
          const searchTerm = this.value.toLowerCase();
          const options = voiceCloneDropdown.querySelectorAll('.dropdown-option');

          options.forEach(option => {
            const text = option.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
              option.style.display = 'block';
            } else {
              option.style.display = 'none';
            }
          });
        };

        searchInput.onclick = function (e) {
          e.stopPropagation();
        };
      }

      // Re-setup dropdown functionality for new options
      setupDropdowns();
    }

  } catch (error) {
    console.error('Failed to load voice clones:', error);
    // Fallback to local storage
    loadVoiceClonesLocal();
  }
}

// Fallback function for local voice clones
function loadVoiceClonesLocal() {
  const clones = JSON.parse(localStorage.getItem('voiceClones') || '[]');
  const voiceCloneDropdown = document.querySelector('[data-dropdown="voice-clone"] .dropdown-options');

  if (voiceCloneDropdown) {
    // Clear existing dynamic options (keep only default ones)
    const defaultOptions = voiceCloneDropdown.querySelectorAll('.dropdown-option');
    const defaultCloneNames = ['naveed', 'shahzad', 'naveed-m', 'naveed-i', 'mrc', 'm-r'];

    // Remove non-default options
    defaultOptions.forEach(option => {
      const value = option.getAttribute('data-value');
      if (!defaultCloneNames.includes(value)) {
        option.remove();
      }
    });

    // Add saved clones to dropdown
    clones.forEach(clone => {
      const option = document.createElement('div');
      option.className = 'dropdown-option';
      option.setAttribute('data-value', clone.name.toLowerCase().replace(/\s+/g, '-'));
      option.innerHTML = `
        <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        </svg>
        ${clone.name} (${clone.gender})
      `;
      voiceCloneDropdown.appendChild(option);
    });

    // Re-setup dropdown functionality for new options
    setupDropdowns();
  }
}

// Voice generation functionality with API integration
async function generateVoice(event) {
  // Prevent form submission and page reload
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Prevent any form submission
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
  });

  const textInput = document.getElementById('textInput');
  const text = textInput.value.trim();

  if (!text) {
    alert('Please enter some text to generate voice.');
    return false;
  }

  // Check if user is logged in
  const token = localStorage.getItem('jwt_token');
  if (!token) {
    alert('Please login to generate voice.');
    window.location.href = 'signin.html';
    return false;
  }

  // Get selected values from dropdowns
  const language = document.querySelector('[data-dropdown="language"]').getAttribute('data-selected') || 'en';
  const voiceModel = getSelectedVoiceModel();

  console.log('Generating voice with:', { text, language, voiceModel });

  // Show loading state
  const generateBtn = document.querySelector('.btn-primary');
  const originalText = generateBtn.textContent;
  generateBtn.textContent = 'Generating...';
  generateBtn.disabled = true;

  try {
    // API call for TTS generation
    const ttsData = {
      text: text,
      language: language,
      voice_model: voiceModel
    };

    const response = await fetch(`${API_CONFIG.BASE_URL}/voice/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.replace('Bearer ', '')}`
      },
      body: JSON.stringify(ttsData)
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('jwt_token');
        window.location.href = 'signin.html';
        return false;
      }

      let errorMessage = 'Failed to generate voice';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    const responseData = await response.json();

    // Update usage stats with generated text length
    const currentUsage = parseInt(localStorage.getItem('totalCharactersUsed') || '0');
    const newUsage = currentUsage + text.length;
    localStorage.setItem('totalCharactersUsed', newUsage.toString());
    updateUsageStats(newUsage);

    // Update character counter
    updateCharacterCount();

    // Enable audio player and hide placeholder
    const audioPreview = document.getElementById('audioPreview');
    const audioElement = audioPreview.querySelector('audio');
    const placeholder = audioPreview.querySelector('.audio-placeholder');

    if (responseData.file_path || responseData.audio_id) {
      // Set audio ID for future download
      if (responseData.audio_id) {
        audioElement.setAttribute('data-audio-id', responseData.audio_id);
      }

      // Load audio using fetch with proper auth headers, then set as source
      if (responseData.audio_id) {
        // Fetch the audio blob with proper authorization
        fetch(`${API_CONFIG.BASE_URL}/voice/stream/${responseData.audio_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token.replace('Bearer ', '')}`
          }
        })
          .then(response => response.blob())
          .then(blob => {
            // Create object URL for the audio element
            const audioBlobUrl = URL.createObjectURL(blob);

            // Reset audio element before setting new source
            audioElement.pause();
            audioElement.src = audioBlobUrl;
            audioElement.load(); // Explicitly load the new source

            // Ensure audio doesn't autoplay or trigger download
            audioElement.autoplay = false;

            // Clean up the object URL when audio finishes
            audioElement.onended = () => {
              URL.revokeObjectURL(audioBlobUrl);
            };

            // Show success message
            console.log('Voice generated successfully!');
            showSuccessMessage('Voice generated successfully! Preview ready.');
          })
          .catch(error => {
            console.error('Error loading audio for preview:', error);
            // Fallback to showing success message even if preview fails
            showSuccessMessage('Voice generated successfully!');
          });
      } else if (responseData.file_path) {
        // For direct file paths (fallback)
        audioElement.pause();
        audioElement.src = responseData.file_path;
        audioElement.load();
        audioElement.autoplay = false;

        // Show success message
        console.log('Voice generated successfully!');
        showSuccessMessage('Voice generated successfully! Preview ready.');
      }

      audioElement.removeAttribute('disabled');
      placeholder.style.display = 'none';
      audioPreview.style.display = 'block';
    }

  } catch (error) {
    console.error('TTS generation error:', error);

    let userMessage = 'Failed to generate voice. Please try again.';

    if (error.message.includes('Network') || error.message.includes('fetch')) {
      userMessage = 'Server connection failed. Please check if the server is running.';
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      userMessage = 'Session expired. Please login again.';
      localStorage.removeItem('jwt_token');
      setTimeout(() => {
        window.location.href = 'signin.html';
      }, 2000);
    } else {
      userMessage = error.message || userMessage;
    }

    alert(userMessage);

  } finally {
    // Reset button
    generateBtn.textContent = originalText;
    generateBtn.disabled = false;
  }

  return false;
}

// Helper function to get selected voice model
function getSelectedVoiceModel() {
  const maleVoice = document.querySelector('[data-dropdown="male-voice"]').getAttribute('data-selected');
  const femaleVoice = document.querySelector('[data-dropdown="female-voice"]').getAttribute('data-selected');
  const kidsVoice = document.querySelector('[data-dropdown="kids-voice"]').getAttribute('data-selected');
  const voiceClone = document.querySelector('[data-dropdown="voice-clone"]').getAttribute('data-selected');

  // Priority: voice clone > specific voice type > default
  if (voiceClone && voiceClone !== 'Select Voice Clone') {
    return voiceClone;
  } else if (maleVoice && maleVoice !== 'Select Male Voice') {
    return 'male';
  } else if (femaleVoice && femaleVoice !== 'Select Female Voice') {
    return 'female';
  } else if (kidsVoice && kidsVoice !== 'Select Kids Voice') {
    return 'kids';
  }
  return 'male'; // default
}

// Download functionality
async function downloadMP3(event) {
  // Prevent form submission and page reload
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Prevent any form submission
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
  });

  const audioPreview = document.getElementById('audioPreview');
  const audioElement = audioPreview.querySelector('audio');

  // Check if audio is generated and available
  if (!audioElement.src || audioElement.hasAttribute('disabled')) {
    alert('Please generate voice first.');
    return false;
  }

  // Show loading state
  const downloadBtn = document.querySelector('.btn-secondary');
  const originalText = downloadBtn.textContent;
  downloadBtn.textContent = 'Downloading...';
  downloadBtn.disabled = true;

  try {
    // Get audio ID from element
    let audioId = audioElement.getAttribute('data-audio-id');

    // Check if user is logged in
    const token = localStorage.getItem('jwt_token');

    if (!token) {
      alert('Please login to download audio.');
      window.location.href = 'signin.html';
      return false;
    }

    if (!audioId) {
      throw new Error('Audio ID not found. Please generate audio again.');
    }

    console.log('Starting download process...', { audioId });

    // Download via API with audio ID
    const response = await fetch(`${API_CONFIG.BASE_URL}/voice/download/${audioId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.replace('Bearer ', '')}`,
        'Accept': 'audio/mpeg, audio/mp3, application/octet-stream'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('jwt_token');
        window.location.href = 'signin.html';
        return false;
      }

      let errorMessage = `Download failed: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `Download failed: ${response.status} ${response.statusText}`;
      }

      throw new Error(errorMessage);
    }

    const blob = await response.blob();

    // Verify blob has content
    if (blob.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    // Download the file
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated_audio_${audioId}.wav`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showSuccessMessage('Audio downloaded successfully!');
    console.log('Download completed successfully');

  } catch (error) {
    console.error('Download error:', error);

    let userMessage = 'Failed to download audio file.';

    if (error.message.includes('Network') || error.message.includes('fetch')) {
      userMessage = 'Server connection failed. Please check if the server is running.';
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      userMessage = 'Session expired. Please login again.';
      localStorage.removeItem('jwt_token');
      setTimeout(() => {
        window.location.href = 'signin.html';
      }, 2000);
    } else if (error.message.includes('404')) {
      userMessage = 'Audio file not found. Please generate audio again.';
    } else if (error.message.includes('403')) {
      userMessage = 'Access denied. You can only download your own audio files.';
    } else {
      userMessage = error.message || userMessage;
    }

    alert(userMessage);

  } finally {
    // Reset button
    downloadBtn.textContent = originalText;
    downloadBtn.disabled = false;
  }

  return false;
}

// Select Clone functionality
function selectClone() {
  window.location.href = 'cloneslibrary.html';
}

// Home navigation
function goHome() {
  window.location.href = 'index.html';
}

// Show success message
function showSuccessMessage(message) {
  // Create or update success message element
  let successMsg = document.getElementById('successMessage');
  if (!successMsg) {
    successMsg = document.createElement('div');
    successMsg.id = 'successMessage';
    successMsg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4ecca3;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    document.body.appendChild(successMsg);
  }

  successMsg.textContent = message;
  successMsg.style.transform = 'translateX(0)';

  // Hide after 3 seconds
  setTimeout(() => {
    successMsg.style.transform = 'translateX(100%)';
  }, 3000);
}

// Profile modal functionality
function openProfileModal() {
  console.log('Profile modal clicked!');

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = function (event) {
    console.log('File selected:', event.target.files[0]);
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        console.log('File loaded, updating profile pic');
        const profilePic = document.getElementById('profilePic');
        if (profilePic) {
          profilePic.style.backgroundImage = `url(${e.target.result})`;
          profilePic.style.backgroundSize = 'cover';
          profilePic.style.backgroundPosition = 'center';
          profilePic.textContent = '';

          // Save to localStorage
          localStorage.setItem('userProfilePic', e.target.result);
          console.log('Profile picture updated and saved!');
        } else {
          console.error('Profile pic element not found!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  input.click();
}

// Load saved profile picture on page load
function loadProfilePicture() {
  console.log('Loading saved profile picture...');
  const savedPic = localStorage.getItem('userProfilePic');
  if (savedPic) {
    console.log('Found saved profile picture');
    const profilePic = document.getElementById('profilePic');
    if (profilePic) {
      profilePic.style.backgroundImage = `url(${savedPic})`;
      profilePic.style.backgroundSize = 'cover';
      profilePic.style.backgroundPosition = 'center';
      profilePic.textContent = '';
      console.log('Profile picture loaded successfully!');
    } else {
      console.error('Profile pic element not found during load!');
    }
  } else {
    console.log('No saved profile picture found');
  }
}