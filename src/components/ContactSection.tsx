import React, { useState, useEffect } from 'react';
import { HOTEL_INFO } from '../data/hotelData';
import { fetchSettings, buildWhatsAppLink } from '../services/apiService';

export const ContactSection: React.FC = () => {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings().then(s => setWhatsappNumber(s.whatsapp_number));
  }, []);

  const handleWhatsAppClick = () => {
    const link = buildWhatsAppLink(whatsappNumber);
    window.open(link, '_blank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Prepare WhatsApp message directly from form for immediate response
    const msg = `Hello Grand Travela Hotel,\n\nInquiry from: ${formData.name}\nPhone: ${formData.phone}\nSubject: ${formData.subject}\nMessage: ${formData.message}`;
    const cleanNumber = (whatsappNumber || '').replace(/[^0-9]/g, '');
    const waLink = cleanNumber 
      ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      window.open(waLink, '_blank');
      setFormData({ name: '', phone: '', subject: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    }, 600);
  };

  return (
    <section id="contact" className="py-20 bg-gray-100 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h5 className="section-title text-sm lg:text-base font-bold text-hotel-primary uppercase tracking-widest">
            Hotel Inquiries &amp; Reservations
          </h5>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-950 mt-3 mb-4">
            Direct Contact &amp; Booking
          </h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            All room reservations are coordinated directly through our official WhatsApp contact channel.
          </p>
        </div>

        {/* Contact Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
          
          {/* Left Column: Official WhatsApp & Payment Policy Cards */}
          <div className="lg:col-span-5 space-y-6">
            {/* WhatsApp Booking Card */}
            <div className="bg-white rounded-3xl p-8 shadow-md border border-emerald-100 relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mb-4">
                <i className="fab fa-whatsapp"></i>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Official WhatsApp Booking</h4>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-4">
                Our front desk reception is ready to assist you with room reservations, availability checks, and special requests in real time.
              </p>

              <button
                onClick={handleWhatsAppClick}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-full text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <i className="fab fa-whatsapp text-lg"></i>
                <span>Open WhatsApp Chat</span>
              </button>
            </div>

            {/* Cash Payment Policy Card */}
            <div className="bg-white rounded-3xl p-8 shadow-md border border-amber-100">
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mb-4">
                <i className="fa fa-money-bill-wave"></i>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Payment Policy</h4>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed font-semibold">
                No online payment required. Payments are made in cash at the hotel.
              </p>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center space-x-4 text-xs text-gray-500 font-medium">
                <div>Check-In: <span className="text-gray-900 font-bold">{HOTEL_INFO.checkInTime}</span></div>
                <div>Check-Out: <span className="text-gray-900 font-bold">{HOTEL_INFO.checkOutTime}</span></div>
              </div>
            </div>
          </div>

          {/* Right Column: Send Inquiry Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 lg:p-10 shadow-md border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Direct Message to Reception</h3>
            <p className="text-gray-600 text-xs sm:text-sm mb-6">
              Have questions regarding our 20 guest rooms, room availability, or kitchen timings? Send your message and connect directly on WhatsApp.
            </p>

            {submitted && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-3">
                <i className="fa fa-check-circle text-emerald-600 text-xl shrink-0"></i>
                <div>
                  <span className="font-bold block">Inquiry Initiated!</span>
                  <span>Opening WhatsApp with your inquiry details...</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Phone / WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +92 300 1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Inquiry Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 05 Reservation or Family Suite Inquiry"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Message Details *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Please state dates, number of guests, or any specific questions..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white transition-colors resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-hotel-primary hover:bg-blue-900 text-white font-bold py-4 rounded-full text-sm uppercase tracking-wider shadow-md hover:shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <i className="fa fa-spinner fa-spin"></i>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <i className="fab fa-whatsapp text-emerald-400 text-lg"></i>
                    <span>Send Message on WhatsApp</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </section>
  );
};
