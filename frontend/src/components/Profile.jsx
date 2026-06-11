import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { getUserProfile, saveUserProfile, getUserSessions } from '../db';
import { Activity, Camera, Save, ArrowLeft, Trophy, Flame, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        navigate('/');
        return;
      }
      setUser(firebaseUser);

      try {
        const profileData = await getUserProfile(firebaseUser.uid);
        setProfile(profileData);
        setDisplayName(firebaseUser.displayName || profileData?.displayName || '');
        setPhotoURL(profileData?.photoURL || firebaseUser.photoURL || '');

        const userSessions = await getUserSessions(firebaseUser.uid);
        setSessions(userSessions);
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      // Upload directly to Cloudinary using unsigned upload preset
      if (CLOUDINARY_CLOUD && CLOUDINARY_PRESET) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        formData.append('folder', 'fitness_profiles');

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
          { method: 'POST', body: formData }
        );

        if (!res.ok) throw new Error('Upload failed');

        const data = await res.json();
        setPhotoURL(data.secure_url);
        setMessage('Photo uploaded! Click "Save Profile" to save.');
      } else {
        // Fallback: upload via backend
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_URL}/api/upload-profile-pic`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');

        const data = await res.json();
        setPhotoURL(data.url);
        setMessage('Photo uploaded! Click "Save Profile" to save.');
      }
    } catch (err) {
      setMessage('Upload failed. Please try again.');
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage('');

    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName,
        photoURL: photoURL || undefined
      });

      // Update Firestore profile
      await saveUserProfile(user.uid, {
        displayName,
        email: user.email,
        photoURL: photoURL || null
      });

      setMessage('Profile saved successfully!');
    } catch (err) {
      setMessage('Failed to save profile. Please try again.');
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const totalReps = profile?.totalReps || 0;
  const totalMinutes = profile?.totalMinutes || 0;
  const totalWorkouts = sessions.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans">
      {/* Background Glows */}
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-[#00E5FF]/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/3 w-[500px] h-[500px] bg-[#FF007F]/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link to="/dashboard" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" id="back-to-dashboard">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold">Your Profile</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md text-center">
              {/* Avatar */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-[#00E5FF]/30 to-[#FF007F]/30 border-2 border-white/20">
                  {photoURL ? (
                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/60">
                      {displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 p-2 bg-[#00E5FF] rounded-full text-black hover:scale-110 transition-transform shadow-lg"
                  id="upload-photo-btn"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera size={16} />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-file-input"
                />
              </div>

              {/* Name Input */}
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full text-center text-xl font-bold bg-transparent border-b border-white/10 pb-2 focus:outline-none focus:border-[#00E5FF] transition-colors mb-2"
                placeholder="Your Name"
                id="profile-name-input"
              />
              <p className="text-gray-400 text-sm">{user?.email}</p>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#0088FF] text-black font-bold py-3 rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50"
                id="save-profile-btn"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>

              {/* Message */}
              {message && (
                <p className={`mt-4 text-sm ${message.includes('failed') || message.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                  {message}
                </p>
              )}
            </div>
          </div>

          {/* Stats & History */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md text-center">
                <Activity className="text-[#00E5FF] mx-auto mb-2" size={24} />
                <p className="text-2xl font-bold">{totalReps.toLocaleString()}</p>
                <p className="text-gray-400 text-xs mt-1">Total Reps</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md text-center">
                <Flame className="text-[#FF007F] mx-auto mb-2" size={24} />
                <p className="text-2xl font-bold">{totalMinutes}</p>
                <p className="text-gray-400 text-xs mt-1">Active Minutes</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md text-center">
                <Trophy className="text-yellow-400 mx-auto mb-2" size={24} />
                <p className="text-2xl font-bold">{totalWorkouts}</p>
                <p className="text-gray-400 text-xs mt-1">Workouts</p>
              </div>
            </div>

            {/* Workout History */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Calendar size={20} className="text-[#00E5FF]" />
                Workout History
              </h3>
              {sessions.length > 0 ? (
                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {sessions.map((session, idx) => (
                    <div key={session.id || idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-[#00E5FF]/10 rounded-lg">
                          <Activity className="text-[#00E5FF]" size={18} />
                        </div>
                        <div>
                          <p className="font-semibold capitalize">{session.exerciseType || 'Workout'}</p>
                          <p className="text-xs text-gray-400">
                            {session.timestamp ? new Date(session.timestamp).toLocaleDateString('en-US', { 
                              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                            }) : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#00E5FF]">{session.correctReps} reps</p>
                        {session.formScore > 0 && (
                          <p className="text-xs text-gray-400">Form: {session.formScore}%</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <Activity size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No workouts yet. Start your first one!</p>
                  <Link to="/workout" className="inline-block mt-4 px-6 py-2 bg-[#00E5FF]/10 border border-[#00E5FF]/30 rounded-xl text-[#00E5FF] font-semibold hover:bg-[#00E5FF]/20 transition-colors">
                    Start Workout
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
