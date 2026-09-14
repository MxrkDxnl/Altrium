import { useState, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api, { getUploadUrl } from '../api';

// SVG Icons (replacing lucide-react to avoid npm install locks)
const PencilIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

const MailIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const BuildingIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </svg>
);

const IdCardIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 10h2" />
    <path d="M16 14h2" />
    <path d="M6.17 15a3 3 0 0 1 5.66 0" />
    <circle cx="9" cy="11" r="2" />
    <rect x="2" y="5" width="20" height="14" rx="2" />
  </svg>
);

const UserIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default function Profile() {
  const { currentUser, updateUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);
  
  const initial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
  const roleDisplay = currentUser?.role?.replace(/_/g, ' ') || 'Employee';
  const employeeId = `ALT-${currentUser?.id ? String(currentUser.id).padStart(4, '0') : '0000'}`;
  
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      if (password) formData.append('password', password);
      if (file) formData.append('profile_picture', file);

      const res = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      updateUser(res.data);
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        setIsEditing(false);
        setPassword('');
        setConfirmPassword('');
        setFile(null);
        setPreview(null);
        setSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePicture = async () => {
    try {
      const res = await api.delete('/users/profile-picture');
      updateUser(res.data);
      setPreview(null);
      setFile(null);
      setSuccess('Profile picture removed successfully');
    } catch (err) {
      console.error(err);
      setError('Failed to remove profile picture');
    }
  };

  const avatarSrc = preview || getUploadUrl(currentUser?.profile_picture);

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">My Profile</h1>
      </div>

      <Card className="p-10 shadow-sm border-gray-100">
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center space-x-8">
            <div className="w-32 h-32 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-6xl font-bold overflow-hidden shadow-sm border border-orange-200">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{currentUser?.name || 'User'}</h2>
              <p className="text-orange-500 uppercase tracking-widest text-sm font-bold mt-2 mb-4">{roleDisplay}</p>
              <div className="flex items-center">
                <span className="bg-orange-50 text-orange-700 px-4 py-1 rounded-full text-sm font-semibold mr-3">
                  {employeeId}
                </span>
                <span className="text-gray-500 text-sm font-medium">Employee ID</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 border-2 border-orange-200 text-orange-500 hover:bg-orange-50 hover:border-orange-300 font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>

        <hr className="border-gray-100 mb-10" />

        <div className="grid grid-cols-2 gap-y-10 gap-x-12">
          {/* Email */}
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-orange-700">
              <MailIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-0.5">Email</p>
              <p className="text-gray-900 font-semibold">{currentUser?.email || 'N/A'}</p>
            </div>
          </div>

          {/* Department */}
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-orange-700">
              <BuildingIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-0.5">Department</p>
              <p className="text-gray-900 font-semibold">{currentUser?.department || 'N/A'}</p>
            </div>
          </div>

          {/* Employee ID */}
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-orange-700">
              <IdCardIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-0.5">Employee ID</p>
              <p className="text-gray-900 font-semibold">{employeeId}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-orange-700">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-0.5">Role</p>
              <p className="text-gray-900 font-semibold capitalize">{roleDisplay}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Profile Modal Overlay */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto pt-10 pb-10">
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h2>
            
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4 border border-red-100">{error}</p>}
            {success && <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-md mb-4 border border-emerald-100">{success}</p>}

            <div className="space-y-6">
              {/* Profile Picture Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xl font-bold overflow-hidden shadow-sm border border-orange-200 shrink-0">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                    />
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                      >
                        Choose Image
                      </button>
                      {avatarSrc && (
                        <button 
                          onClick={handleDeletePicture}
                          className="text-sm border border-red-200 text-red-600 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG or JPEG (max 5MB)</p>
                  </div>
                </div>
              </div>

              {/* Password Change */}
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password (optional)</label>
                <input 
                  type="password" 
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 mb-4" 
                  placeholder="Leave blank to keep current"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                
                {password && (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500" 
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
