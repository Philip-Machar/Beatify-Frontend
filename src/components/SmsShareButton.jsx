import React, { useState } from 'react';
import { Share2, Send, X, Loader2 } from 'lucide-react';
import Modal from './Modal';

const SmsShareButton = ({ songDetails }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleShare = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('https://beatify-backend.onrender.com/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          message: `Checki hii ngoma noma: ${songDetails.title} by ${songDetails.artists?.[0]?.name || 'Unknown Artist'}${songDetails.album?.name ? ` from the album ${songDetails.album.name}` : ''}`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send SMS');
      }

      setSuccess('SMS sent successfully!');
      setTimeout(() => {
        setIsOpen(false);
        setSuccess('');
        setPhoneNumber('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to send SMS');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="mt-4 inline-flex items-center px-4 py-2 bg-purple-600/20 text-purple-400 
                 rounded-full text-sm hover:bg-purple-600/30 transition-colors duration-300 ml-2"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share via SMS
      </button>

      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        title="Share Song via SMS"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Phone Number</label>
            <div className="relative">
              <input
                type="tel"
                placeholder="+254..."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg 
                         focus:outline-none focus:border-purple-500/50 text-gray-100 placeholder-gray-500"
              />
              {phoneNumber && (
                <button
                  onClick={() => setPhoneNumber('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 
                           hover:text-gray-400 focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-200 text-sm">
              {success}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleShare}
              disabled={isLoading || !phoneNumber.trim()}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg
                       hover:bg-purple-700 transition-colors duration-300 disabled:opacity-50 
                       disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send SMS
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SmsShareButton;