import React from 'react';

const SettingsModal = ({ isOpen, onClose, user, onLogout }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="relative rounded-2xl shadow-2xl p-8 w-full max-w-sm border-2 border-blue-900" style={{ background: 'linear-gradient(135deg, #2a1857 0%, #3a1c71 60%, #5f2c82 100%)' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">User Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl leading-none">&times;</button>
        </div>
        <div className="flex flex-col items-center">
          <img
            src={user.photoURL}
            alt="Profile"
            className="w-24 h-24 rounded-full mb-4"
          />
          <h3 className="text-lg font-semibold text-white">{user.displayName}</h3>
          <p className="text-blue-100">{user.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="mt-6 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 w-full"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
