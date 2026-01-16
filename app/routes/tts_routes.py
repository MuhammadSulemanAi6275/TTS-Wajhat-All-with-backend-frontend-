# app/routes/tts_routes.py
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.audio_file import AudioFile
from app.models.cloned_voice import ClonedVoice
from app.models.usage import Usage
from app import db
from datetime import datetime, timedelta
import os, glob
from werkzeug.utils import secure_filename
from app.config import Config
from pydub import AudioSegment
from pydub.generators import Sine

tts_bp = Blueprint('tts', __name__)

GENERATED_FOLDER = Config.GENERATED_AUDIO_FOLDER
CLONED_FOLDER = Config.CLONED_VOICE_FOLDER

# -------------------
# Generate TTS Audio
# -------------------
@tts_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_tts():
    try:
        identity = get_jwt_identity()
        print(f"Generate TTS - JWT Identity: {identity}, Type: {type(identity)}")  # Debug log
        
        if not identity:
            print("No JWT identity found in generate_tts")  # Debug log
            return jsonify({"error": "Invalid token"}), 401
            
        user_id = int(identity)
        data = request.get_json()
        print(f"Generate TTS - User ID: {user_id}, Data: {data}")  # Debug log
        
        text = data.get('text')
        characters = len(text)

        usage = Usage.query.filter_by(user_id=user_id).first()
        if not usage or characters > usage.characters_remaining:
            print(f"Not enough characters: usage={usage}, characters={characters}")  # Debug log
            return jsonify({"error": "Not enough characters in plan"}), 400

        # Generate actual audio file (placeholder for now - integrate with your TTS service)
        filename = f"{user_id}_{datetime.utcnow().timestamp()}.wav"
        file_path = os.path.join(GENERATED_FOLDER, filename)
        os.makedirs(GENERATED_FOLDER, exist_ok=True)

        # TODO: Replace this with actual TTS generation
        # For now, create a small WAV file with a simple tone
        # Create a 1-second sine wave tone at 440 Hz
        tone = Sine(440).to_audio_segment(duration=1000)  # 1 second
        tone.export(file_path, format="wav")
        
        print(f"Generated audio file: {file_path}")  # Debug log

        # Update usage
        usage.characters_used += characters
        usage.characters_remaining -= characters
        usage.last_generated_at = datetime.utcnow()
        db.session.commit()

        # Save audio record
        audio = AudioFile(user_id=user_id, file_path=file_path, characters_used=characters)
        db.session.add(audio)
        db.session.commit()
        
        print(f"Audio generated successfully: {audio.id}")  # Debug log
        return jsonify({"message": "Audio generated", "file_path": file_path, "audio_id": audio.id}), 200
    except Exception as e:
        print(f"Generate TTS error: {str(e)}")  # Debug log
        import traceback
        traceback.print_exc()  # Print full stack trace
        return jsonify({"error": str(e)}), 500

# -------------------
# Download Audio
# -------------------
@tts_bp.route('/download/<int:audio_id>', methods=['GET'])
@jwt_required()
def download_audio(audio_id):
    try:
        identity = get_jwt_identity()
        print(f"JWT Identity: {identity}, Type: {type(identity)}")  # Debug log
        
        if not identity:
            print("No JWT identity found")  # Debug log
            return jsonify({"error": "Invalid token"}), 401
            
        user_id = int(identity)
        print(f"User ID: {user_id}, Audio ID: {audio_id}")  # Debug log
        
        audio = AudioFile.query.get(audio_id)
        if not audio:
            print(f"Audio not found: {audio_id}")  # Debug log
            return jsonify({"error": "Audio file not found"}), 404
            
        if audio.user_id != user_id:
            print(f"Access denied: audio.user_id={audio.user_id}, user_id={user_id}")  # Debug log
            return jsonify({"error": "Access denied"}), 403
            
        if not os.path.exists(audio.file_path):
            print(f"File not found on disk: {audio.file_path}")  # Debug log
            return jsonify({"error": "Audio file not found on disk"}), 404
            
        print(f"Sending file: {audio.file_path}")  # Debug log
        return send_file(audio.file_path, as_attachment=True, download_name=f"audio_{audio_id}.wav")
        
    except Exception as e:
        print(f"Download error: {str(e)}")  # Debug log
        import traceback
        traceback.print_exc()  # Print full stack trace
        return jsonify({"error": str(e)}), 500

# -------------------
# Stream Audio for Preview
# -------------------
@tts_bp.route('/stream/<int:audio_id>', methods=['GET'])
@jwt_required()
def stream_audio(audio_id):
    try:
        identity = get_jwt_identity()
        print(f"Stream JWT Identity: {identity}, Type: {type(identity)}")  # Debug log
        
        if not identity:
            print("No JWT identity found")  # Debug log
            return jsonify({"error": "Invalid token"}), 401
            
        user_id = int(identity)
        print(f"Stream User ID: {user_id}, Audio ID: {audio_id}")  # Debug log
        
        audio = AudioFile.query.get(audio_id)
        if not audio:
            print(f"Audio not found: {audio_id}")  # Debug log
            return jsonify({"error": "Audio file not found"}), 404
            
        if audio.user_id != user_id:
            print(f"Access denied: audio.user_id={audio.user_id}, user_id={user_id}")  # Debug log
            return jsonify({"error": "Access denied"}), 403
            
        if not os.path.exists(audio.file_path):
            print(f"File not found on disk: {audio.file_path}")  # Debug log
            return jsonify({"error": "Audio file not found on disk"}), 404
            
        print(f"Streaming file: {audio.file_path}")  # Debug log
        return send_file(audio.file_path, as_attachment=False)
        
    except Exception as e:
        print(f"Stream error: {str(e)}")  # Debug log
        import traceback
        traceback.print_exc()  # Print full stack trace
        return jsonify({"error": str(e)}), 500

@tts_bp.route('/download-audio/<int:audio_id>', methods=['GET'])
@jwt_required()
def download_audio_alt(audio_id):
    return download_audio(audio_id)

# -------------------
# Voice Cloning
# -------------------
@tts_bp.route('/clone-voice', methods=['POST'])
@jwt_required()
def clone_voice():
    try:
        identity = get_jwt_identity()
        user_id = int(identity)

        if 'voice_file' not in request.files or 'voice_name' not in request.form:
            return jsonify({"error": "Voice file and name required"}), 400

        file = request.files['voice_file']
        voice_name = request.form['voice_name']
        filename = secure_filename(f"{user_id}_{voice_name}_{datetime.utcnow().timestamp()}.wav")
        os.makedirs(CLONED_FOLDER, exist_ok=True)
        file_path = os.path.join(CLONED_FOLDER, filename)
        file.save(file_path)

        # Save to DB
        voice = ClonedVoice(user_id=user_id, voice_file_path=file_path, voice_name=voice_name)
        db.session.add(voice)
        db.session.commit()

        return jsonify({"message": "Voice cloned successfully", "voice_id": voice.id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------
# List / Search / Filter Cloned Voices
# -------------------
@tts_bp.route('/voices', methods=['GET'])
@jwt_required()
def list_voices():
    try:
        identity = get_jwt_identity()
        user_id = int(identity)
        search = request.args.get('search', '')

        voices = ClonedVoice.query.filter(
            ClonedVoice.user_id==user_id,
            ClonedVoice.voice_name.ilike(f"%{search}%")
        ).all()

        result = [{"id": v.id, "voice_name": v.voice_name, "file_path": v.voice_file_path} for v in voices]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------
# Download Cloned Voice
# -------------------
@tts_bp.route('/voices/<int:voice_id>/download', methods=['GET'])
@jwt_required()
def download_voice(voice_id):
    try:
        identity = get_jwt_identity()
        user_id = int(identity)

        voice = ClonedVoice.query.filter_by(id=voice_id, user_id=user_id).first()
        if not voice:
            return jsonify({"error": "Voice not found or access denied"}), 404

        if not os.path.exists(voice.voice_file_path):
            return jsonify({"error": "Voice file not found on disk"}), 404

        return send_file(voice.voice_file_path, as_attachment=True, download_name=f"{voice.voice_name}.wav")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------
# Delete Cloned Voice
# -------------------
@tts_bp.route('/voices/<int:voice_id>', methods=['DELETE'])
@jwt_required()
def delete_voice(voice_id):
    try:
        identity = get_jwt_identity()
        user_id = int(identity)

        voice = ClonedVoice.query.filter_by(id=voice_id, user_id=user_id).first()
        if not voice:
            return jsonify({"error": "Voice not found or access denied"}), 404

        # Delete file from filesystem
        if os.path.exists(voice.voice_file_path):
            os.remove(voice.voice_file_path)

        # Delete from database
        db.session.delete(voice)
        db.session.commit()

        return jsonify({"message": "Voice deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------
# Auto-delete Generated Audio > 7 days
# -------------------
def delete_expired_audio():
    now = datetime.utcnow()
    expired_audios = AudioFile.query.filter(AudioFile.expire_at <= now).all()
    for audio in expired_audios:
        if os.path.exists(audio.file_path):
            os.remove(audio.file_path)
        db.session.delete(audio)
    db.session.commit()

# You can call delete_expired_audio() via a scheduled job (cron, APScheduler, or Celery)
# to periodically clean up old audio files.

# -------------------
# Get Supported Languages
# -------------------
@tts_bp.route('/languages', methods=['GET'])
@jwt_required()
def get_languages():
    try:
        # Placeholder: List of supported languages for TTS
        languages = [
            {"code": "en", "name": "English"},
            {"code": "es", "name": "Spanish"},
            {"code": "fr", "name": "French"},
            {"code": "de", "name": "German"},
            {"code": "it", "name": "Italian"},
            {"code": "pt", "name": "Portuguese"},
            {"code": "ru", "name": "Russian"},
            {"code": "ja", "name": "Japanese"},
            {"code": "ko", "name": "Korean"},
            {"code": "zh", "name": "Chinese"}
        ]
        return jsonify(languages), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------
# Get Voice Styles
# -------------------
@tts_bp.route('/styles', methods=['GET'])
@jwt_required()
def get_styles():
    try:
        # Placeholder: List of voice styles
        styles = [
            {"id": 1, "name": "Neutral", "description": "Standard neutral voice"},
            {"id": 2, "name": "Cheerful", "description": "Happy and energetic"},
            {"id": 3, "name": "Serious", "description": "Formal and professional"},
            {"id": 4, "name": "Calm", "description": "Relaxed and soothing"}
        ]
        return jsonify(styles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500