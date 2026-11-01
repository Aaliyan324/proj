import React, { useState, useEffect, useRef } from 'react';
import { useScene, themeIn, linesIn, fadeUpOnce } from '../motion/scene';
import { Lines } from './cinema/Lines';
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
  const root = useRef<HTMLElement>(null);
  useScene(root, ({ el }) => {
    themeIn(el, 'pine', 'mist');
    linesIn(el.querySelectorAll('.ct-line-in'), el.querySelector('.ct-heading')!);
    fadeUpOnce(el.querySelectorAll('.ct-fade'));
  });

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
    const msg = `Hello Red Rock Murree,\n\nInquiry from: ${formData.name}\nPhone: ${formData.phone}\nSubject: ${formData.subject}\nMessage: ${formData.message}`;
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

  const field = 'w-full border-0 border-b border-pine/30 bg-transparent px-0 py-3 text-base text-pine placeholder:text-slate focus:border-rock focus:outline-none focus:ring-0';
  return (
    <section ref={root} id="contact" data-nav="light" className="cinema relative bg-mist text-pine" aria-label="Direct contact and booking">
      <div className="mx-auto grid max-w-[1500px] gap-16 px-5 py-28 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:py-40">
        <div className="flex flex-col gap-8 lg:col-span-5">
          <p className="ct-fade t-small uppercase tracking-[0.18em] opacity-70">Direct contact and booking</p>
          <h2 className="ct-heading t-h2"><Lines lines={['Book directly', 'on WhatsApp.']} inner="ct-line-in" /></h2>
          <p className="ct-fade t-body opacity-80">All room reservations are coordinated on our official WhatsApp. No online payment is needed: payments are made in cash at the hotel.</p>
          <div className="ct-fade flex flex-wrap gap-3">
            <button type="button" className="rr-btn" onClick={handleWhatsAppClick}>Message on WhatsApp</button>
          </div>
          <dl className="ct-fade flex flex-col gap-4 border-t border-pine/20 pt-6 t-small">
            <div><dt className="opacity-60">Address</dt><dd className="mt-1 text-base">{HOTEL_INFO.address}</dd></div>
            {HOTEL_INFO.email && <div><dt className="opacity-60">Email</dt><dd className="mt-1 text-base">{HOTEL_INFO.email}</dd></div>}
            {HOTEL_INFO.timesConfirmed && (<div><dt className="opacity-60">Check-in / check-out</dt><dd className="mt-1 text-base">{HOTEL_INFO.checkInTime} / {HOTEL_INFO.checkOutTime}</dd></div>)}
          </dl>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <form onSubmit={handleSubmit} className="ct-fade flex flex-col gap-6" aria-label="Send an inquiry on WhatsApp">
            {submitted && <p role="status" className="rounded-full bg-pine px-5 py-3 text-center t-small text-mist">Opening WhatsApp&hellip;</p>}
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="flex flex-col"><span className="t-small opacity-70">Your name</span>
                <input required type="text" className={field} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} autoComplete="name" /></label>
              <label className="flex flex-col"><span className="t-small opacity-70">Phone</span>
                <input required type="tel" className={field} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} autoComplete="tel" /></label>
            </div>
            <label className="flex flex-col"><span className="t-small opacity-70">Subject</span>
              <input required type="text" className={field} value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} /></label>
            <label className="flex flex-col"><span className="t-small opacity-70">Message</span>
              <textarea required rows={4} className={field} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} /></label>
            <div><button type="submit" className="rr-btn" disabled={loading}>{loading ? 'Preparing message…' : 'Send inquiry on WhatsApp'}</button></div>
          </form>
        </div>
      </div>
    </section>
  );
};
