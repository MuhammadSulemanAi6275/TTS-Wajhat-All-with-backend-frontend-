# app/routes/user_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.models.usage import Usage
from app.models.audio_file import AudioFile
from app.schemas.user_schema import UserSchema
from app.schemas.usage_schema import UsageSchema
from app.schemas.audio_file_schema import AudioFileSchema

user_bp = Blueprint('user', __name__)
user_schema = UserSchema()
usage_schema = UsageSchema()
audio_schema = AudioFileSchema()

# Dashboard: see usage
@user_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    try:
        identity = get_jwt_identity()
        user = User.query.get(int(identity))
        if not user.plan_id:
            return jsonify({"error": "No plan assigned by admin"}), 403

        usage = Usage.query.filter_by(user_id=user.id).first()
        return usage_schema.jsonify(usage)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get User Profile
@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user:
            return jsonify({"error": "User not found"}), 404
        return user_schema.jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get Voice History
@user_bp.route('/voice-history', methods=['GET'])
@jwt_required()
def get_voice_history():
    try:
        user_id = get_jwt_identity()
        audios = AudioFile.query.filter_by(user_id=int(user_id)).all()
        result = audio_schema.dump(audios, many=True)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Download Audio (log download)
@user_bp.route('/download-audio', methods=['POST'])
@jwt_required()
def download_audio():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        audio_id = data.get('audio_id')
        audio = AudioFile.query.get(audio_id)
        if not audio or audio.user_id != int(user_id):
            return jsonify({"error": "Audio not found or access denied"}), 404
        # Log download, perhaps update a counter, but for now just return success
        return jsonify({"message": "Download logged", "download_url": f"/api/voice/download/{audio_id}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
