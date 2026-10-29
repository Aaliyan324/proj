import React, { useState } from 'react';

export const NewsletterBanner: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail('');
      setSubscribed(false);
    }, 4000);
  };

  return (
    <div className="subscribe-banner py-20 text-white relative">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h5 className="section-title-white text-xs sm:text-sm font-bold uppercase tracking-widest mb-3">
          Curated Dispatch
        </h5>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
          Join The Grand Travela Society
        </h2>
        <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-8 font-light">
          Receive private invitations to seasonal champagne retreats, chef table previews, and members-only suite promotions directly in your inbox.
        </p>

        {subscribed ? (
          <div className="bg-white/20 backdrop-blur-md rounded-full py-4 px-8 max-w-md mx-auto text-amber-300 font-bold text-sm shadow-xl flex items-center justify-center space-x-2 animate-fade">
            <i className="fa fa-check-circle text-lg"></i>
            <span>Welcome to the Society. Your invitation code has been sent.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto">
            <input
              type="email"
              required
              placeholder="Enter your private email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/95 text-gray-900 placeholder-gray-500 py-4 pl-6 pr-36 rounded-full text-sm sm:text-base shadow-2xl focus:outline-none focus:ring-4 focus:ring-amber-400/50"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-hotel-primary hover:bg-blue-900 text-white font-bold px-6 rounded-full text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
