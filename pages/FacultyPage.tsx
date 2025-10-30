import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';

const FacultyPage: React.FC = () => {
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();

  const [faculty, setFaculty] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showOnlyVerified, setShowOnlyVerified] = useState(false);

  const [msgModalOpen, setMsgModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchFaculty = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'faculty')
        .order('name', { ascending: true });
      if (error) {
        console.error('Error fetching faculty', error);
        setFaculty([]);
      } else {
        setFaculty(data || []);
      }
      setLoading(false);
    };
    fetchFaculty();
  }, []);

  const filtered = faculty.filter(f => {
    if (showOnlyVerified && !f.verified) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (f.name || '').toLowerCase().includes(q) || (f.speciality || '').toLowerCase().includes(q);
  });

  const openMessage = (f: Profile) => {
    if (!user) {
      navigate('/signin');
      return;
    }
    setSelectedFaculty(f);
    setMessage('');
    setMsgModalOpen(true);
  };

  const sendMessage = async () => {
    if (!user || !selectedFaculty) return;
    if (!message.trim()) {
      alert('Please write a message.');
      return;
    }
    setSending(true);
    // Assumes a 'faculty_messages' table exists with columns:
    // student_id, faculty_id, message, created_at (handled by DB)
    const { error } = await supabase.from('faculty_messages').insert([{
      student_id: user.id,
      faculty_id: selectedFaculty.id,
      message: message.trim(),
    }]);
    setSending(false);
    if (error) {
      console.error('Send message error', error);
      alert('Could not send message. Try again.');
    } else {
      alert('Message sent to faculty.');
      setMsgModalOpen(false);
    }
  };

  const startVideoCall = (f: Profile) => {
    if (!user) {
      navigate('/signin');
      return;
    }
    // Navigate to existing VideoCallPage; caller will be this user
    navigate(`/video-call/${f.id}`);
  };

  if (loading) return <div className="p-8"><Spinner size="lg" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Faculty — Career Guidance</h1>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or speciality"
            className="px-3 py-2 rounded border"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showOnlyVerified} onChange={e => setShowOnlyVerified(e.target.checked)} />
            Show verified only
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-muted">No faculty found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(f => (
            <div key={f.id} className="p-4 bg-white/5 rounded-md flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-xl font-semibold">
                {f.name?.slice(0,1) ?? '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{f.name}</h3>
                    <p className="text-sm opacity-80">{f.speciality || 'Faculty'}</p>
                  </div>
                  <div className="text-sm">
                    {f.verified ? <span className="px-2 py-1 bg-green-600 text-white rounded text-xs">Verified</span>
                      : <span className="px-2 py-1 bg-yellow-600 text-white rounded text-xs">Not verified</span>}
                  </div>
                </div>
                <p className="text-sm mt-2 line-clamp-2 text-gray-200">{f.bio || ''}</p>

                <div className="mt-3 flex gap-2">
                  <button onClick={() => openMessage(f)} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700">Message</button>
                  <button onClick={() => startVideoCall(f)} className="px-3 py-1 rounded bg-green-600 hover:bg-green-700">Start Video Call</button>
                  <button onClick={() => navigate(`/profile/${f.id}`)} className="px-3 py-1 rounded bg-white/10">View Profile</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message Modal */}
      {msgModalOpen && selectedFaculty && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Message {selectedFaculty.name}</h2>
              <button onClick={() => setMsgModalOpen(false)} className="text-sm px-2 py-1 bg-white/10 rounded">Close</button>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              placeholder="Write a short message explaining what guidance you need..."
              className="w-full p-3 rounded bg-gray-900 border"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setMsgModalOpen(false)} className="px-4 py-2 rounded bg-white/10">Cancel</button>
              <button onClick={sendMessage} disabled={sending} className="px-4 py-2 rounded bg-blue-600">
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyPage;